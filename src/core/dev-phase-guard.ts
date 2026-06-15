import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { getPhaseOrder } from "./phase-registry.js";

export type EarlyCodeWarning = {
  code: "code.before-dev-phase";
  message: string;
  files: string[];
};

function listUncommitted(workspaceDir: string): string[] {
  if (!fs.existsSync(path.join(workspaceDir, ".git"))) return [];
  const parts: string[] = [];
  for (const args of [
    "diff --name-only",
    "diff --cached --name-only",
    "ls-files --others --exclude-standard",
  ]) {
    try {
      const out = execSync(`git ${args}`, {
        cwd: workspaceDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      if (out) parts.push(...out.split("\n").filter(Boolean));
    } catch {
      /* ignore */
    }
  }
  return [...new Set(parts)];
}

function isTaiyiArtifactPath(file: string): boolean {
  const n = file.replace(/\\/g, "/");
  return n.startsWith(".taiyi/") || n.includes("/.taiyi/");
}

/** 规划阶段误报：仓库级 OpenSpec / 根 CHANGELOG / 探针报告等与当前变更无关。 */
function isPlanningNoisePath(file: string): boolean {
  const n = file.replace(/\\/g, "/");
  if (n === "CHANGELOG.md") return true;
  if (n.startsWith("openspec/")) return true;
  if (n === ".DS_Store" || n.endsWith("/.DS_Store")) return true;
  if (n.startsWith(".taiyi/") && (n.endsWith(".json") || n.includes("probe"))) return true;
  if (n === "docs/taiyi/probe-triage.md") return true;
  if (n.startsWith("scripts/probes/")) return true;
  return false;
}

/** dev 之前若工作区有非 .taiyi 未提交改动，提示勿跳步写代码。 */
export function detectEarlyCodeChanges(
  workspaceDir: string,
  currentPhase: PhaseId,
): EarlyCodeWarning | null {
  if (process.env.TAIYI_EARLY_CODE_GUARD === "0") return null;
  if (getPhaseOrder(currentPhase) >= getPhaseOrder("dev")) return null;

  const dirty = listUncommitted(workspaceDir).filter(
    (f) => !isTaiyiArtifactPath(f) && !isPlanningNoisePath(f),
  );
  if (dirty.length === 0) return null;

  const sample = dirty.slice(0, 6).join(", ");
  const more = dirty.length > 6 ? ` 等 ${dirty.length} 个文件` : "";
  return {
    code: "code.before-dev-phase",
    message: `当前 ${currentPhase} 未到 dev，但工作区有业务代码改动（${sample}${more}）。规划阶段只写 .taiyi/changes/ 工件；实现请等到 dev 且 /taiyi:apply 后再改代码。`,
    files: dirty,
  };
}

export function earlyCodeBlockOnContinue(env = process.env): boolean {
  if (env.TAIYI_EARLY_CODE_BLOCK === "0" || env.TAIYI_EARLY_CODE_BLOCK === "false") {
    return false;
  }
  return true;
}
