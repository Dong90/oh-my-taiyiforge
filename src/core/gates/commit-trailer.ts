import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  resolveDeliveryConfig,
  resolveSlugTrailerKey,
  type DeliveryConfig,
} from "../delivery-config.js";
import { renderCommitMessage } from "../delivery-templates.js";

export type CommitTrailerResult = {
  passed: boolean;
  reason?: string;
  hints?: string[];
  missingCommits?: number;
  suggestion?: string;
  skipped?: boolean;
};

export const TRAILER_CHANGE = "Taiyi-Change";
export const TRAILER_PHASE = "Taiyi-Phase";

function runGit(workspaceDir: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: workspaceDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10000,
    shell: false,
  }).trim();
}

export function resolveBaseBranch(
  workspaceDir: string,
  baseBranches?: string[],
): string {
  let current = "HEAD";
  try {
    current = runGit(workspaceDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {
    /* keep HEAD */
  }

  const candidates = baseBranches ?? [
    "origin/develop",
    "origin/main",
    "origin/master",
    "develop",
    "main",
    "master",
  ];

  for (const candidate of candidates) {
    if (candidate === current) continue;
    try {
      runGit(workspaceDir, ["rev-parse", "--verify", candidate]);
      return candidate;
    } catch {
      /* next */
    }
  }
  try {
    runGit(workspaceDir, ["rev-parse", "--verify", "HEAD~1"]);
    return "HEAD~1";
  } catch {
    return "HEAD";
  }
}

function parseTrailers(body: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.+)$/);
    if (m) {
      const key = m[1]!.toLowerCase();
      const val = m[2]!.trim();
      if (out[key]) out[key]!.push(val);
      else out[key] = [val];
    }
  }
  return out;
}

function listCommitBodies(workspaceDir: string, base: string): { hash: string; body: string }[] {
  try {
    const hashes = runGit(workspaceDir, ["log", `${base}..HEAD`, "--format=%H"]);
    if (!hashes) return [];
    return hashes.split("\n").filter(Boolean).map((hash) => ({
      hash,
      body: runGit(workspaceDir, ["log", "-1", "--format=%B", hash]),
    }));
  } catch {
    return [];
  }
}

export function commitTrailersEnabled(_workspaceDir?: string, env = process.env): boolean {
  if (env.TAIYI_COMMIT_TRAILERS === "0" || env.TAIYI_COMMIT_TRAILERS === "false") {
    return false;
  }
  return true;
}

function parseSubjectParts(subject: string): { type: string; summary: string } {
  const m = subject.match(/^(\w+)(?:\([^)]*\))?:\s*(.+)$/);
  if (m) return { type: m[1]!, summary: m[2]! };
  return { type: "feat", summary: subject };
}

/** 建议的下一条 commit message（读 delivery.yaml 模板） */
export function suggestCommitMessage(
  slug: string,
  phase: string,
  subject = "feat: deliver change slice",
  workspaceDir?: string,
): string {
  const { type, summary } = parseSubjectParts(subject);
  const config = workspaceDir ? resolveDeliveryConfig(workspaceDir) : undefined;
  if (config) {
    return renderCommitMessage(config, { slug, phase, type, summary });
  }
  return `${type}: ${summary}

Taiyi-Change: ${slug}
Taiyi-Phase: ${phase}`;
}

function trailerValuesMatch(ruleValue: string, slug: string, phase: string): string {
  return ruleValue.replace("{slug}", slug).replace("{phase}", phase);
}

function evaluateTrailersForConfig(
  config: DeliveryConfig,
  commits: { hash: string; body: string }[],
  slug: string,
  phase: string,
): { matched: number; missing: number } {
  const slugKey = resolveSlugTrailerKey(config);
  const slugRule = config.commit.requiredTrailers.find((r) => r.key === slugKey);
  const expectedSlug = slugRule
    ? trailerValuesMatch(slugRule.value, slug, phase)
    : slug;

  let matched = 0;
  let missing = 0;
  for (const c of commits) {
    const trailers = parseTrailers(c.body);
    // parseTrailers lowercases keys for case-insensitive match; lookup canonical key
    const change = trailers[slugKey.toLowerCase()];
    if (change?.includes(expectedSlug) || change?.includes(slug)) matched++;
    else if (!change) missing++;
  }
  return { matched, missing };
}

export function evaluateCommitTrailers(
  workspaceDir: string,
  slug: string,
  phase = "integration",
): CommitTrailerResult {
  if (!commitTrailersEnabled(workspaceDir)) {
    return { passed: true, skipped: true };
  }
  if (!fs.existsSync(path.join(workspaceDir, ".git"))) {
    return { passed: true, skipped: true };
  }

  const config = resolveDeliveryConfig(workspaceDir);
  const slugKey = resolveSlugTrailerKey(config);
  const base = resolveBaseBranch(workspaceDir, config.git.baseBranches);
  const commits = listCommitBodies(workspaceDir, base);
  if (commits.length === 0) {
    return { passed: true, skipped: true };
  }

  const { matched, missing } = evaluateTrailersForConfig(config, commits, slug, phase);

  if (matched > 0) {
    return { passed: true };
  }

  const suggestion = suggestCommitMessage(
    slug,
    phase,
    "feat: deliver change slice",
    workspaceDir,
  );
  // 提示期望的标准大写形式（git trailer 实际为 case-insensitive，但人类用户易写错）
  const canonicalKey = slugKey.charAt(0).toUpperCase() + slugKey.slice(1);
  return {
    passed: false,
    reason: `相对 ${base} 的 ${commits.length} 个 commit 中无 ${canonicalKey}: <slug> trailer（匹配 case-insensitive，期望 \`${canonicalKey}: ${slug}\`）`,
    missingCommits: missing || commits.length,
    hints: [
      `在实现 commit message 末尾加 trailer（行尾格式 \`${canonicalKey}: <slug>\`）`,
      "git trailer 匹配为大小写不敏感，但建议保持标准大写以提高可读性",
      "示例见下方 suggestion",
      "关闭检查: TAIYI_COMMIT_TRAILERS=0",
    ],
    suggestion,
  };
}
