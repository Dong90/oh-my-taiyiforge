import fs from "node:fs";
import path from "node:path";
import type { ChangeState, PhaseId } from "./types.js";
import { getPhaseOrder, listPhases } from "./phase-registry.js";
import { isSeedTemplate } from "./seed-marker.js";

export type TrimAheadResult = {
  removed: string[];
  skipped: string[];
};

/** 删除当前阶段之后的 markdown 工件（Autopilot 批量写文件后的修复） */
export function trimAheadArtifacts(changeDir: string, state: ChangeState): TrimAheadResult {
  const removed: string[] = [];
  const skipped: string[] = [];
  const currentOrder = getPhaseOrder(state.currentPhase);
  const completed = new Set(state.completedPhases);

  for (const phase of listPhases()) {
    if (phase.kind !== "markdown") continue;
    if (completed.has(phase.id)) continue;
    if (phase.id === state.currentPhase) continue;
    if (getPhaseOrder(phase.id) <= currentOrder) continue;

    const filePath = path.join(changeDir, phase.artifact);
    if (!fs.existsSync(filePath)) continue;

    try {
      const body = fs.readFileSync(filePath, "utf8");
      if (!isSeedTemplate(body) && body.trim().length > 0) {
        skipped.push(phase.artifact);
        continue;
      }
    } catch {
      skipped.push(phase.artifact);
      continue;
    }

    fs.unlinkSync(filePath);
    removed.push(phase.artifact);
  }

  return { removed, skipped };
}

export function formatTrimAheadPlain(slug: string, result: TrimAheadResult): string {
  const lines = [`trim-ahead ${slug}:`];
  if (result.removed.length === 0) {
    lines.push("  无已删除文件（超前非空工件保留在 skipped）");
  } else {
    lines.push(`  已删除: ${result.removed.join(", ")}`);
  }
  if (result.skipped.length > 0) {
    lines.push(`  保留（已有实质内容）: ${result.skipped.join(", ")}`);
  }
  lines.push("  然后: scripts/taiyi-forge.sh continue " + slug);
  return lines.join("\n");
}
