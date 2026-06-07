import fs from "node:fs";
import path from "node:path";
import { WorkflowEngine } from "./workflow-engine.js";
import { E2E_ARTIFACTS, E2E_PHASE_ORDER } from "./e2e-fixtures.js";
import { getPhase } from "./phase-registry.js";
import { artifactPathForPhase } from "./artifact-validator.js";
import { DEV_COMPLETE_EVIDENCE } from "./dev-complete.js";
import type { PhaseId } from "./types.js";

const PASSING_GATES = {
  quality: {
    completeness: true,
    consistency: true,
    verifiability: true,
    traceability: true,
    engineering_quality: true,
  },
  human: { approved: true, approver: "e2e-runner" },
} as const;

export function writeE2eArtifacts(changeDir: string): void {
  for (const [phaseId, body] of Object.entries(E2E_ARTIFACTS)) {
    const phase = getPhase(phaseId as PhaseId);
    const file = path.join(changeDir, phase.artifact);
    fs.writeFileSync(file, body, "utf8");
  }
  fs.writeFileSync(path.join(changeDir, ".dev-complete"), DEV_COMPLETE_EVIDENCE, "utf8");
}

export function runE2eWorkflow(
  engine: WorkflowEngine,
  slug: string,
  templatesDir?: string,
): { ok: boolean; error?: string; completed: PhaseId[] } {
  if (!engine.getState(slug)) {
    engine.initChange(slug, { title: "E2E Demo", templatesDir });
  }

  const changeDir = engine.changeDir(slug);
  writeE2eArtifacts(changeDir);

  const completed: PhaseId[] = [];
  for (const phaseId of E2E_PHASE_ORDER) {
    const state = engine.getState(slug);
    if (!state || state.currentPhase !== phaseId) {
      return {
        ok: false,
        error: `Expected current phase ${phaseId}, got ${state?.currentPhase}`,
        completed,
      };
    }

    if (phaseId === "review") {
      fs.writeFileSync(
        path.join(changeDir, "health-report.md"),
        "# Health Report\n\nE2E smoke — no blocking findings.\n",
        "utf8",
      );
      const mark = engine.markAuxiliary(slug, "taiyi-health");
      if (!mark.ok) {
        return { ok: false, error: `review: ${mark.error}`, completed };
      }
    }

    const result = engine.completePhase(slug, phaseId, PASSING_GATES, {
      allowAutoHuman: true,
      skipStepOrderCheck: true,
    });
    if (!result.ok) {
      const artifact = artifactPathForPhase(changeDir, phaseId);
      return {
        ok: false,
        error: `${phaseId}: ${result.error} (artifact: ${artifact})`,
        completed,
      };
    }
    completed.push(phaseId);
  }

  const final = engine.getState(slug);
  if (!final || final.completedPhases.length !== 9) {
    return {
      ok: false,
      error: `Expected 9 completed phases, got ${final?.completedPhases.length}`,
      completed,
    };
  }

  return { ok: true, completed };
}
