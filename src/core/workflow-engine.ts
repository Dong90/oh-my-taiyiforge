import fs from "node:fs";
import path from "node:path";
import type { ChangeProfile, ChangeState, GateInput, PhaseId } from "./types.js";
import { evaluateHumanGate } from "./gates/human-gate.js";
import { rejectAutomatedHumanApproval, requiresHumanGate } from "./gates/human-gate-config.js";
import { isKnownAuxiliarySkill, KNOWN_AUXILIARY_SKILLS } from "./routing/auxiliary-skills.js";
import { assertValidSlug, validateSlug } from "./slug.js";
import { evaluateQualityGate } from "./gates/quality-gate.js";
import { canEnterPhase, getNextPhase, getPhase } from "./phase-registry.js";
import { isPhaseSkipped, skippedPhasesForProfile } from "./profile.js";
import { assessComplexity, type ComplexitySignals } from "./routing/complexity.js";
import { inferComplexitySignals } from "./routing/infer-complexity.js";
import { seedChangeTemplates } from "./template-seed.js";
import {
  artifactPathForPhase,
  validateArtifactFile,
} from "./artifact-validator.js";
import {
  enforceAutoHarnessBeforeComplete,
  runPostCompleteShellHooks,
  syncAuxiliaryFromArtifacts,
} from "./harness-runner.js";
import { enforceTokenBudgetBeforeComplete } from "./token-runner.js";
import { expectedPhaseCount, isWorkflowCompleted } from "./change-status.js";

export type InitChangeOptions = {
  title?: string;
  templatesDir?: string;
  profile?: ChangeProfile;
  strictDev?: boolean;
  autoHarness?: boolean;
};

function normalizeState(raw: ChangeState): ChangeState {
  return {
    ...raw,
    profile: raw.profile ?? "full",
    skippedPhases: raw.skippedPhases ?? [],
    strictDev: raw.strictDev ?? false,
    autoHarness: raw.autoHarness ?? false,
    auxiliaryCompleted: raw.auxiliaryCompleted ?? [],
    workflowStatus: raw.workflowStatus ?? (isWorkflowCompleted(raw) ? "completed" : "active"),
  };
}

export class WorkflowEngine {
  constructor(
    private readonly workspaceRoot: string,
    private readonly templatesDir?: string,
  ) {}

  private changesDir(): string {
    return path.join(this.workspaceRoot, "changes");
  }

  private statePath(slug: string): string {
    return path.join(this.changesDir(), slug, "state.json");
  }

  changeDir(slug: string): string {
    return path.join(this.changesDir(), slug);
  }

  initChange(slug: string, options?: InitChangeOptions): ChangeState & { seeded: string[] } {
    assertValidSlug(slug);
    const dir = this.changeDir(slug);
    fs.mkdirSync(dir, { recursive: true });
    const profile = options?.profile ?? "full";
    const skippedPhases = skippedPhasesForProfile(profile);
    const templatesDir = options?.templatesDir ?? this.templatesDir;
    const seeded =
      templatesDir != null
        ? seedChangeTemplates(dir, templatesDir, {
            slug,
            title: options?.title,
          })
        : [];

    if (profile === "api") {
      const uiPath = path.join(dir, "UI-DESIGN.md");
      if (!fs.existsSync(uiPath)) {
        fs.writeFileSync(
          uiPath,
          `# UI-DESIGN: ${options?.title ?? slug}\n\n## Scope\nN/A — 纯 API / 后端变更，无前端界面。\n\n## Links\n- DESIGN.md\n`,
          "utf8",
        );
        seeded.push("UI-DESIGN.md");
      }
    }

    const now = new Date().toISOString();
    const signals = inferComplexitySignals(dir);
    const complexity = assessComplexity(signals);

    const autoHarness =
      options?.autoHarness ??
      (process.env.TAIYI_AUTO_HARNESS === "1" || process.env.TAIYI_AUTO_HARNESS === "true");

    const state: ChangeState = {
      slug,
      currentPhase: "change",
      completedPhases: [],
      profile,
      skippedPhases,
      strictDev: options?.strictDev ?? false,
      autoHarness,
      complexity,
      auxiliaryCompleted: [],
      workflowStatus: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.writeState(state);
    return { ...state, seeded };
  }

  getState(slug: string): ChangeState | null {
    const slugCheck = validateSlug(slug);
    if (!slugCheck.ok) return null;
    const file = this.statePath(slug);
    if (!fs.existsSync(file)) return null;
    try {
      return normalizeState(JSON.parse(fs.readFileSync(file, "utf8")) as ChangeState);
    } catch {
      return null;
    }
  }

  private writeState(state: ChangeState): void {
    fs.writeFileSync(this.statePath(state.slug), JSON.stringify(state, null, 2));
  }

  private artifactPath(slug: string, phaseId: PhaseId): string {
    const phase = getPhase(phaseId);
    if (phase.kind === "code") {
      return path.join(this.changeDir(slug), ".dev-complete");
    }
    return path.join(this.changeDir(slug), phase.artifact);
  }

  private hasArtifact(slug: string, phaseId: PhaseId): boolean {
    const p = this.artifactPath(slug, phaseId);
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  }

  markAuxiliary(slug: string, skillId: string): { ok: boolean; error?: string } {
    const slugCheck = validateSlug(slug);
    if (!slugCheck.ok) return { ok: false, error: slugCheck.error };
    const state = this.getState(slug);
    if (!state) return { ok: false, error: "Change not found" };
    if (!skillId.startsWith("taiyi-")) {
      return { ok: false, error: "skillId must be taiyi-*" };
    }
    if (!isKnownAuxiliarySkill(skillId)) {
      return {
        ok: false,
        error: `Unknown auxiliary skill: ${skillId} (known: ${[...KNOWN_AUXILIARY_SKILLS].join(", ")})`,
      };
    }
    const auxiliaryCompleted = state.auxiliaryCompleted.includes(skillId)
      ? state.auxiliaryCompleted
      : [...state.auxiliaryCompleted, skillId];
    this.writeState({ ...state, auxiliaryCompleted, updatedAt: new Date().toISOString() });
    return { ok: true };
  }

  refreshComplexity(slug: string, signals?: ComplexitySignals) {
    const state = this.getState(slug);
    if (!state) throw new Error(`Change not found: ${slug}`);
    const inferred = signals ?? inferComplexitySignals(this.changeDir(slug));
    const complexity = assessComplexity(inferred);
    this.writeState({ ...state, complexity, updatedAt: new Date().toISOString() });
    return { signals: inferred, assessment: complexity };
  }

  completePhase(
    slug: string,
    phaseId: PhaseId,
    gates: GateInput,
    options?: { skipArtifactValidation?: boolean; forceHuman?: boolean; allowAutoHuman?: boolean },
  ): { ok: boolean; error?: string; qualityHints?: string[] } {
    const slugCheck = validateSlug(slug);
    if (!slugCheck.ok) return { ok: false, error: slugCheck.error };
    const state = this.getState(slug);
    if (!state) return { ok: false, error: "Change not found" };
    if (isWorkflowCompleted(state)) {
      return { ok: false, error: "Workflow already completed (九阶段已完成)" };
    }
    if (isPhaseSkipped(phaseId, state.skippedPhases)) {
      return { ok: false, error: `Phase ${phaseId} is skipped for profile ${state.profile}` };
    }
    if (state.currentPhase !== phaseId) {
      return {
        ok: false,
        error: `Current phase is ${state.currentPhase}, not ${phaseId}`,
      };
    }

    const enter = canEnterPhase(phaseId, {
      completedPhases: state.completedPhases,
      skippedPhases: state.skippedPhases,
    });
    if (!enter.ok) {
      return { ok: false, error: `Missing phases: ${enter.missing.join(", ")}` };
    }

    if (!this.hasArtifact(slug, phaseId)) {
      return {
        ok: false,
        error: `Artifact missing for phase ${phaseId}`,
      };
    }

    const changeDir = this.changeDir(slug);
    const syncedAux = syncAuxiliaryFromArtifacts(changeDir, state.auxiliaryCompleted);
    let workingState = { ...state, auxiliaryCompleted: syncedAux };
    if (syncedAux.length !== state.auxiliaryCompleted.length) {
      this.writeState({ ...workingState, updatedAt: new Date().toISOString() });
    }

    if (phaseId === "review" && workingState.complexity?.level === "high") {
      if (!workingState.auxiliaryCompleted.includes("taiyi-health")) {
        return {
          ok: false,
          error:
            "High complexity: complete taiyi-health and run `taiyi mark-aux <slug> taiyi-health` before review",
        };
      }
    }

    const workspaceDir = path.dirname(this.workspaceRoot);
    const autoCheck = enforceAutoHarnessBeforeComplete(
      workspaceDir,
      this.workspaceRoot,
      workingState,
    );
    if (!autoCheck.ok) {
      return { ok: false, error: autoCheck.error };
    }

    const tokenCheck = enforceTokenBudgetBeforeComplete(changeDir, slug, phaseId);
    if (!tokenCheck.ok) {
      return { ok: false, error: tokenCheck.error };
    }

    if (autoCheck.plan) {
      workingState = {
        ...workingState,
        auxiliaryCompleted: syncAuxiliaryFromArtifacts(
          changeDir,
          workingState.auxiliaryCompleted,
        ),
      };
    }

    let qualityScores = { ...gates.quality };
    let qualityHints: string[] | undefined;

    if (!options?.skipArtifactValidation) {
      const artifactFile = artifactPathForPhase(this.changeDir(slug), phaseId);
      const inferred = validateArtifactFile(artifactFile, phaseId);
      if (inferred) {
        qualityHints = inferred.hints;
        qualityScores = {
          completeness: qualityScores.completeness && inferred.scores.completeness,
          consistency: qualityScores.consistency && inferred.scores.consistency,
          verifiability:
            qualityScores.verifiability && inferred.scores.verifiability,
          traceability:
            qualityScores.traceability && inferred.scores.traceability,
          engineering_quality:
            qualityScores.engineering_quality && inferred.scores.engineering_quality,
        };
      }

      if (phaseId === "dev" && state.strictDev) {
        const devPath = this.artifactPath(slug, "dev");
        const devText = fs.readFileSync(devPath, "utf8");
        if (!/strict:\s*true/i.test(devText)) {
          qualityHints = [
            ...(qualityHints ?? []),
            "init 时启用了 strictDev：.dev-complete 首行写 strict: true",
          ];
          qualityScores.verifiability = false;
          qualityScores.completeness = false;
        }
      }
    }

    const quality = evaluateQualityGate(qualityScores);
    if (!quality.passed) {
      const hintText = qualityHints?.length ? ` — ${qualityHints.join("; ")}` : "";
      return {
        ok: false,
        error: `Quality gate failed: ${quality.failed.join(", ")}${hintText}`,
        qualityHints,
      };
    }

    const needsHuman = requiresHumanGate(phaseId) || options?.forceHuman;
    if (needsHuman) {
      const autoReject = rejectAutomatedHumanApproval(
        phaseId,
        gates.human,
        options?.allowAutoHuman,
      );
      if (!autoReject.ok) {
        return { ok: false, error: autoReject.error };
      }
      const human = evaluateHumanGate(gates.human);
      if (!human.passed) {
        return { ok: false, error: human.reason ?? "Human gate failed" };
      }
    }

    const completed = [...workingState.completedPhases, phaseId];
    const next = getNextPhase(phaseId, workingState.skippedPhases);
    const draft: ChangeState = {
      ...workingState,
      completedPhases: completed,
      currentPhase: next ?? phaseId,
      complexity: assessComplexity(inferComplexitySignals(changeDir)),
      updatedAt: new Date().toISOString(),
    };
    const allDone =
      !next &&
      completed.length >= expectedPhaseCount(draft) &&
      completed.includes("integration");
    const updated: ChangeState = {
      ...draft,
      workflowStatus: allDone ? "completed" : "active",
    };
    this.writeState(updated);

    if (workingState.autoHarness) {
      runPostCompleteShellHooks(workspaceDir, slug, phaseId);
    }
    return { ok: true };
  }

  assessComplexity(slug: string, signals?: ComplexitySignals) {
    return this.refreshComplexity(slug, signals);
  }
}
