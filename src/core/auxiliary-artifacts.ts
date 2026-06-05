import fs from "node:fs";
import path from "node:path";

/** 辅助 Skill 对应工件 — 用于自动检测与 auto 模式门禁 */
export const AUXILIARY_ARTIFACTS: Record<string, { files?: string[]; dirs?: string[] }> = {
  "taiyi-intel-scan": { files: ["CONTEXT.md"] },
  "taiyi-architect": { dirs: ["adr"] },
  "taiyi-health": { files: ["health-report.md"] },
  "taiyi-evolve": { files: ["architecture-sync.md"] },
  "taiyi-restyle": { files: ["ui-restyle-tasks.md"] },
};

export function auxiliaryArtifactSatisfied(changeDir: string, skillId: string): boolean {
  const spec = AUXILIARY_ARTIFACTS[skillId];
  if (!spec) return false;

  for (const f of spec.files ?? []) {
    const p = path.join(changeDir, f);
    if (fs.existsSync(p) && fs.statSync(p).size > 0) return true;
  }
  for (const d of spec.dirs ?? []) {
    const p = path.join(changeDir, d);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      const entries = fs.readdirSync(p).filter((e) => !e.startsWith("."));
      if (entries.length > 0) return true;
    }
  }
  return false;
}

export function detectCompletedAuxiliary(changeDir: string): string[] {
  const done: string[] = [];
  for (const skillId of Object.keys(AUXILIARY_ARTIFACTS)) {
    if (auxiliaryArtifactSatisfied(changeDir, skillId)) done.push(skillId);
  }
  return done;
}
