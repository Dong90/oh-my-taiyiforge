import fs from "node:fs";
import path from "node:path";
import { isSeedTemplate } from "./seed-marker.js";

/** 辅助 Skill 对应工件 — 用于自动检测与 auto 模式门禁 */
export const AUXILIARY_ARTIFACTS: Record<string, { files?: string[]; dirs?: string[] }> = {
  "taiyi-intel-scan": { files: ["CONTEXT.md"] },
  "taiyi-architect": { dirs: ["adr"] },
  "taiyi-health": { files: ["health-report.md"] },
  "taiyi-evolve": { files: ["architecture-sync.md"] },
  "taiyi-restyle": { files: ["ui-restyle-tasks.md"] },
  "taiyi-compress": { files: ["CONTEXT-COMPACT.md"] },
  "taiyi-diagram-arch": { files: ["diagrams/architecture.md"] },
  "taiyi-diagram-flow": { files: ["diagrams/flows.md"] },
  "taiyi-diagram-c4": { files: ["diagrams/c4/containers.md"] },
  "taiyi-diagram-render": { files: ["diagrams/c4/png/context.svg"] },
  "taiyi-reanalyze": { files: ["REANALYZE.md"] },
};

export function auxiliaryArtifactSatisfied(changeDir: string, skillId: string): boolean {
  const spec = AUXILIARY_ARTIFACTS[skillId];
  if (!spec) return false;

  for (const f of spec.files ?? []) {
    const p = path.join(changeDir, f);
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) continue;
    const text = fs.readFileSync(p, "utf8");
    if (isSeedTemplate(text)) continue;
    return true;
  }
  for (const d of spec.dirs ?? []) {
    const p = path.join(changeDir, d);
    if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) continue;
    for (const name of fs.readdirSync(p).filter((e) => e.endsWith(".md") && !e.startsWith("."))) {
      const text = fs.readFileSync(path.join(p, name), "utf8");
      if (isSeedTemplate(text)) continue;
      const body = text.replace(/<!--[\s\S]*?-->/g, "").trim();
      if (body.length >= 40) return true;
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
