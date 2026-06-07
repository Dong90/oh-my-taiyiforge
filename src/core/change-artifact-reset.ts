import fs from "node:fs";
import path from "node:path";
import { listPhases } from "./phase-registry.js";
import { AUXILIARY_ARTIFACTS } from "./auxiliary-artifacts.js";

const RUNTIME_FILES = [
  ".dev-complete",
  ".harness-checkpoints.json",
  ".loop-state.json",
  ".review-loop-state.json",
  ".token-usage.json",
];

/** --force 重初始化：清理工件与运行时状态，保留目录本身。 */
export function resetChangeArtifacts(changeDir: string): string[] {
  const removed: string[] = [];

  const unlink = (rel: string) => {
    const p = path.join(changeDir, rel);
    if (!fs.existsSync(p)) return;
    fs.unlinkSync(p);
    removed.push(rel);
  };

  const rmDir = (rel: string) => {
    const p = path.join(changeDir, rel);
    if (!fs.existsSync(p)) return;
    fs.rmSync(p, { recursive: true, force: true });
    removed.push(`${rel}/`);
  };

  for (const phase of listPhases()) {
    if (phase.kind === "markdown") unlink(phase.artifact);
  }

  for (const spec of Object.values(AUXILIARY_ARTIFACTS)) {
    for (const f of spec.files ?? []) unlink(f);
    for (const d of spec.dirs ?? []) rmDir(d);
  }

  for (const f of RUNTIME_FILES) unlink(f);

  return removed;
}
