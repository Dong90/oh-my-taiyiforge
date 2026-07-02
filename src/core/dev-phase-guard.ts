import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { getPhaseOrder } from "./phase-registry.js";

export type EarlyCodeWarning = {
  code: "code.before-dev-phase";
  message: string;
  files: string[];
};

const GIT_DIFF_COMMANDS: string[][] = [
  ["diff", "--name-only"],
  ["diff", "--cached", "--name-only"],
  ["ls-files", "--others", "--exclude-standard"],
];

/** 安全的 git 调用：参数化，禁用 shell（防命令注入） */
function listUncommitted(workspaceDir: string): string[] {
  if (!fs.existsSync(path.join(workspaceDir, ".git"))) return [];
  const parts: string[] = [];
  for (const args of GIT_DIFF_COMMANDS) {
    try {
      const out = execFileSync("git", args, {
        cwd: workspaceDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000,
        shell: false,
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
  // 1. .taiyi/ 全部都是规划阶段产物
  if (n.startsWith(".taiyi/") || n.includes("/.taiyi/")) return true;
  // 2. 仓库级产物（与当前 change 无关）
  if (n === "CHANGELOG.md") return true;
  if (n.startsWith("openspec/")) return true;
  if (n === ".DS_Store" || n.endsWith("/.DS_Store")) return true;
  // 3. 探针/报告类
  if (n === "docs/taiyi/probe-triage.md") return true;
  if (n.startsWith("scripts/probes/")) return true;
  return false;
}

/** @deprecated 已合并到 isTaiyiArtifactPath，保留仅作向后兼容。 */
function isPlanningNoisePath(file: string): boolean {
  return isTaiyiArtifactPath(file);
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
