import fs from "node:fs";
import path from "node:path";
import type { ChangeState, GateInput, PhaseId } from "./types.js";
import { evaluateHumanGate } from "./gates/human-gate.js";
import { evaluateQualityGate } from "./gates/quality-gate.js";
import {
  canEnterPhase,
  getNextPhase,
  getPhase,
} from "./phase-registry.js";
import { assessComplexity, type ComplexitySignals } from "./routing/complexity.js";
import { seedChangeTemplates } from "./template-seed.js";
import {
  artifactPathForPhase,
  validateArtifactFile,
} from "./artifact-validator.js";

export type InitChangeOptions = {
  title?: string;
  templatesDir?: string;
};

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

  private changeDir(slug: string): string {
    return path.join(this.changesDir(), slug);
  }

  initChange(slug: string, options?: InitChangeOptions): ChangeState & { seeded: string[] } {
    const dir = this.changeDir(slug);
    fs.mkdirSync(dir, { recursive: true });
    const templatesDir = options?.templatesDir ?? this.templatesDir;
    const seeded =
      templatesDir != null
        ? seedChangeTemplates(dir, templatesDir, {
            slug,
            title: options?.title,
          })
        : [];
    const now = new Date().toISOString();
    const state: ChangeState = {
      slug,
      currentPhase: "change",
      completedPhases: [],
      createdAt: now,
      updatedAt: now,
    };
    this.writeState(state);
    return { ...state, seeded };
  }

  getState(slug: string): ChangeState | null {
    const file = this.statePath(slug);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as ChangeState;
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

  completePhase(
    slug: string,
    phaseId: PhaseId,
    gates: GateInput,
    options?: { skipArtifactValidation?: boolean },
  ): { ok: boolean; error?: string; qualityHints?: string[] } {
    const state = this.getState(slug);
    if (!state) return { ok: false, error: "Change not found" };
    if (state.currentPhase !== phaseId) {
      return {
        ok: false,
        error: `Current phase is ${state.currentPhase}, not ${phaseId}`,
      };
    }

    const enter = canEnterPhase(phaseId, {
      completedPhases: state.completedPhases,
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

    const human = evaluateHumanGate(gates.human);
    if (!human.passed) {
      return { ok: false, error: human.reason ?? "Human gate failed" };
    }

    const completed = [...state.completedPhases, phaseId];
    const next = getNextPhase(phaseId);
    const updated: ChangeState = {
      ...state,
      completedPhases: completed,
      currentPhase: next ?? phaseId,
      updatedAt: new Date().toISOString(),
    };
    this.writeState(updated);
    return { ok: true };
  }

  assessComplexity(slug: string, signals: ComplexitySignals) {
    const state = this.getState(slug);
    if (!state) throw new Error(`Change not found: ${slug}`);
    return assessComplexity(signals);
  }
}
