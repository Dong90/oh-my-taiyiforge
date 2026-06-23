import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type { ReviewLoopStateFile } from "./review-loop-state.js";

export type ReviewFreshness = {
  needsFresh: boolean;
  reasons: string[];
  reviewMtimeMs: number;
};

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|swift|sh|yaml|yml|json|md)$/i;
const IGNORE_PREFIXES = [".taiyi/", "node_modules/", "dist/", "coverage/"];

function isSourcePath(rel: string): boolean {
  if (IGNORE_PREFIXES.some((p) => rel.startsWith(p))) return false;
  return SOURCE_EXT.test(rel);
}

function gitChangedFiles(workspaceDir: string): string[] {
  const files = new Set<string>();
  const run = (cmd: string) => {
    try {
      const out = execSync(cmd, { cwd: workspaceDir, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"], timeout: 5000 });
      for (const line of out.split("\n").map((l) => l.trim()).filter(Boolean)) {
        files.add(line);
      }
    } catch {
      /* not a git repo or git unavailable */
    }
  };
  run("git diff --name-only HEAD");
  run("git diff --name-only --cached");
  run("git ls-files -o --exclude-standard");
  return [...files].filter(isSourcePath);
}

function maxMtime(paths: string[], workspaceDir: string): number {
  let max = 0;
  for (const rel of paths) {
    const abs = path.join(workspaceDir, rel);
    try {
      const m = fs.statSync(abs).mtimeMs;
      if (m > max) max = m;
    } catch {
      /* deleted or missing */
    }
  }
  return max;
}

/** 代码是否比 REVIEW.md 更新 — 是则须重新 review */
export function assessReviewFreshness(
  workspaceDir: string,
  reviewPath: string,
  loopState: ReviewLoopStateFile | null,
  options?: { requireFreshForLoop?: boolean },
): ReviewFreshness {
  const reasons: string[] = [];

  if (!fs.existsSync(reviewPath)) {
    return { needsFresh: true, reasons: ["REVIEW.md 不存在 — 须先执行 taiyi-review"], reviewMtimeMs: 0 };
  }

  const reviewMtimeMs = fs.statSync(reviewPath).mtimeMs;

  if (options?.requireFreshForLoop) {
    const started = loopState?.loopStartedAt ? Date.parse(loopState.loopStartedAt) : NaN;
    // REVIEW.md 须在 review-loop 发起后重新写入（留 1s 容差避免文件系统时间戳误差）
    const FRESH_BUFFER_MS = 1000;
    if (Number.isFinite(started) && reviewMtimeMs < started + FRESH_BUFFER_MS) {
      reasons.push("须先执行新一轮 taiyi-review 并更新 REVIEW.md（不可直接复用旧审查）");
    }
  }

  const changed = gitChangedFiles(workspaceDir);
  const codeMtime = maxMtime(changed, workspaceDir);
  if (codeMtime > reviewMtimeMs + 1000) {
    const sample = changed.slice(0, 3).join(", ");
    reasons.push(
      `代码已变更（${sample}${changed.length > 3 ? "…" : ""}），须基于最新 diff 重新 review`,
    );
  }

  return { needsFresh: reasons.length > 0, reasons, reviewMtimeMs };
}
