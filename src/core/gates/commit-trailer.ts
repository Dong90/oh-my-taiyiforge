import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type CommitTrailerResult = {
  passed: boolean;
  reason?: string;
  hints?: string[];
  missingCommits?: number;
  suggestion?: string;
  skipped?: boolean;
};

const TRAILER_CHANGE = "Taiyi-Change";
const TRAILER_PHASE = "Taiyi-Phase";

function runGit(workspaceDir: string, args: string): string {
  return execSync(`git ${args}`, {
    cwd: workspaceDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function resolveBaseBranch(workspaceDir: string): string {
  let current = "HEAD";
  try {
    current = runGit(workspaceDir, "rev-parse --abbrev-ref HEAD");
  } catch {
    /* keep HEAD */
  }

  for (const candidate of ["origin/develop", "origin/main", "origin/master", "develop", "main", "master"]) {
    if (candidate === current) continue;
    try {
      runGit(workspaceDir, `rev-parse --verify ${candidate}`);
      return candidate;
    } catch {
      /* next */
    }
  }
  try {
    runGit(workspaceDir, "rev-parse --verify HEAD~1");
    return "HEAD~1";
  } catch {
    return "HEAD";
  }
}

function parseTrailers(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.+)$/);
    if (m) out[m[1]!] = m[2]!.trim();
  }
  return out;
}

function listCommitBodies(workspaceDir: string, base: string): { hash: string; body: string }[] {
  try {
    const hashes = runGit(workspaceDir, `log ${base}..HEAD --format=%H`);
    if (!hashes) return [];
    return hashes.split("\n").filter(Boolean).map((hash) => ({
      hash,
      body: runGit(workspaceDir, `log -1 --format=%B ${hash}`),
    }));
  } catch {
    return [];
  }
}

export function commitTrailersEnabled(env = process.env): boolean {
  if (env.TAIYI_COMMIT_TRAILERS === "0" || env.TAIYI_COMMIT_TRAILERS === "false") {
    return false;
  }
  return true;
}

/** 建议的下一条 commit message（含 Taiyi  trailers） */
export function suggestCommitMessage(
  slug: string,
  phase: string,
  subject = "implement slice",
): string {
  return `${subject}

Taiyi-Change: ${slug}
Taiyi-Phase: ${phase}`;
}

/** integration 前：base...HEAD 须有带匹配 slug 的 Taiyi-Change trailer */
export function evaluateCommitTrailers(
  workspaceDir: string,
  slug: string,
  phase = "integration",
): CommitTrailerResult {
  if (!commitTrailersEnabled()) {
    return { passed: true, skipped: true };
  }
  if (!fs.existsSync(path.join(workspaceDir, ".git"))) {
    return { passed: true, skipped: true };
  }

  const base = resolveBaseBranch(workspaceDir);
  const commits = listCommitBodies(workspaceDir, base);
  if (commits.length === 0) {
    return { passed: true, skipped: true };
  }

  let matched = 0;
  let missing = 0;
  for (const c of commits) {
    const trailers = parseTrailers(c.body);
    const change = trailers[TRAILER_CHANGE];
    if (change === slug) matched++;
    else if (!change) missing++;
  }

  if (matched > 0) {
    return { passed: true };
  }

  const suggestion = suggestCommitMessage(slug, phase, "feat: deliver change slice");
  return {
    passed: false,
    reason: `相对 ${base} 的 ${commits.length} 个 commit 中无 Taiyi-Change: ${slug} trailer`,
    missingCommits: missing || commits.length,
    hints: [
      "在实现 commit message 末尾加 trailer（见 delivery-gate.md）",
      "示例见下方 suggestion",
      "关闭检查: TAIYI_COMMIT_TRAILERS=0",
    ],
    suggestion,
  };
}

export { TRAILER_CHANGE, TRAILER_PHASE };
