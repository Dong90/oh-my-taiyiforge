import fs from "node:fs";
import path from "node:path";
import type { ChangeState, PhaseId } from "./types.js";
import { getPhase, getPhaseOrder, listPhases } from "./phase-registry.js";
import { isSeedTemplate } from "./seed-marker.js";

export type AheadArtifactFinding = {
  code: "artifacts.ahead-of-phase" | "artifacts.orphan-skipped";
  phase: PhaseId;
  file: string;
  message: string;
};

function artifactExists(changeDir: string, file: string): boolean {
  const p = path.join(changeDir, file);
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) return false;
  try {
    return !isSeedTemplate(fs.readFileSync(p, "utf8"));
  } catch {
    return true;
  }
}

/** 检测「阶段未到但工件已存在」或 profile 跳过阶段的遗留文件。 */
export function detectAheadArtifacts(
  changeDir: string,
  state: ChangeState,
): AheadArtifactFinding[] {
  const findings: AheadArtifactFinding[] = [];
  const currentOrder = getPhaseOrder(state.currentPhase);
  const completed = new Set(state.completedPhases);
  const skipped = new Set(state.skippedPhases ?? []);

  for (const phase of listPhases()) {
    if (phase.kind !== "markdown") continue;
    if (!artifactExists(changeDir, phase.artifact)) continue;

    if (skipped.has(phase.id)) {
      findings.push({
        code: "artifacts.orphan-skipped",
        phase: phase.id,
        file: phase.artifact,
        message: `profile 已跳过 ${phase.id}，但 ${phase.artifact} 仍存在（可能是旧版全量 seed 或手动创建）`,
      });
      continue;
    }

    if (completed.has(phase.id)) continue;
    if (phase.id === state.currentPhase) continue;

    if (getPhaseOrder(phase.id) > currentOrder) {
      findings.push({
        code: "artifacts.ahead-of-phase",
        phase: phase.id,
        file: phase.artifact,
        message: `当前阶段为 ${state.currentPhase}，但未来阶段工件 ${phase.artifact} 已存在，易误判进度`,
      });
    }
  }

  return findings;
}
