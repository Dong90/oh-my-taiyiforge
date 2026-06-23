import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  commitTrailersEnabled,
  evaluateCommitTrailers,
} from "./commit-trailer.js";
import { resolveDeliveryVerifyCmd } from "./consumer-config.js";

export type DeliveryGateResult = {
  passed: boolean;
  reason?: string;
  hints?: string[];
  skipped?: boolean;
};

function runGit(workspaceDir: string, args: string): string {
  return execSync(`git ${args}`, {
    cwd: workspaceDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10000,
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
      /* try next */
    }
  }
  try {
    runGit(workspaceDir, "rev-parse --verify HEAD~1");
    return "HEAD~1";
  } catch {
    return "HEAD";
  }
}

function normalizeRel(file: string): string {
  return file.replace(/\\/g, "/");
}

/** integration 交付门：仅本变更相关路径的未提交改动会阻塞过关。 */
export function isChangeScopedDirtyPath(file: string, slug: string): boolean {
  const n = normalizeRel(file);
  if (n.includes(`.taiyi/changes/${slug}/`)) return true;
  if (n.includes(`.taiyi/archive/${slug}`)) return true;
  if (n.includes(`.taiyi/ci-prompts/${slug}-`)) return true;
  if (n.startsWith(`openspec/changes/${slug}/`)) return true;
  if (n.includes("openspec/changes/archive/") && n.includes(slug)) return true;
  return false;
}

function listUncommitted(workspaceDir: string): string[] {
  const parts: string[] = [];
  for (const cmd of [
    "diff --name-only",
    "diff --cached --name-only",
    "ls-files --others --exclude-standard",
  ]) {
    try {
      const out = runGit(workspaceDir, cmd);
      if (out) parts.push(...out.split("\n").filter(Boolean));
    } catch {
      /* ignore */
    }
  }
  return [...new Set(parts)];
}

/** integration 交付门：代码须已 commit，工作区须干净（相对默认 base 分支）。 */
export function deliveryGateEnabled(workspaceDir: string, env = process.env): boolean {
  if (env.TAIYI_DELIVERY_GATE === "0" || env.TAIYI_DELIVERY_GATE === "false") {
    return false;
  }
  if (env.TAIYI_DELIVERY_GATE === "1" || env.TAIYI_DELIVERY_GATE === "true") {
    return true;
  }
  // 默认：git 仓库启用，非 git 工作区（单测 tmpdir）跳过
  return fs.existsSync(path.join(workspaceDir, ".git"));
}

export function evaluateDeliveryGate(
  workspaceDir: string,
  options?: { slug?: string; phase?: string },
): DeliveryGateResult {
  if (!fs.existsSync(path.join(workspaceDir, ".git"))) {
    return { passed: true, skipped: true };
  }

  const base = resolveBaseBranch(workspaceDir);
  let committedAhead: string[] = [];
  try {
    const out = runGit(workspaceDir, `diff --name-only ${base}...HEAD`);
    committedAhead = out ? out.split("\n").filter(Boolean) : [];
  } catch {
    return {
      passed: false,
      reason: `无法比较 ${base}...HEAD，请先 commit 实现代码再 complete integration`,
    };
  }

  if (committedAhead.length === 0) {
    let count = 0;
    try {
      count = parseInt(runGit(workspaceDir, "rev-list --count HEAD"), 10) || 0;
    } catch {
      count = 0;
    }
    if (base === "HEAD" && count >= 1) {
      // 新仓库仅 main 且无远端 base：首个 commit 即视为已有交付 commit
    } else {
      return {
        passed: false,
        reason: `integration 需在实现代码 commit 之后（相对 ${base} 无新 commit）`,
        hints: [
          "先按 TASK 切片 commit，再 complete integration",
          "或设置 TAIYI_DELIVERY_GATE=0 仅用于本地演示（不推荐）",
        ],
      };
    }
  }

  const dirty = listUncommitted(workspaceDir);
  const blockingDirty = options?.slug
    ? dirty.filter((f) => isChangeScopedDirtyPath(f, options.slug!))
    : dirty;
  if (blockingDirty.length > 0) {
    const slugTag = options?.slug ? `[${options.slug}] ` : "";
    const slugHint = options?.slug ?? "<slug>";
    return {
      passed: false,
      reason: `delivery.not-closed ${slugTag}${blockingDirty.length} 个未提交文件（本变更范围）`,
      hints: [
        `未提交: ${blockingDirty.slice(0, 8).join(", ")}${blockingDirty.length > 8 ? " …" : ""}`,
        "必须含 trailer,示例:",
        "  git add .",
        `  git commit -m "feat: deliver ${slugHint} slice\n\nTaiyi-Change: ${slugHint}\nTaiyi-Phase: integration"`,
        `或跑: taiyi-forge.sh commit ${slugHint} 生成带 trailer 的提交(推荐)`,
        "本地演示可设 TAIYI_DELIVERY_GATE=0（不推荐 CI）",
      ],
    };
  }

  const verifyCmd = resolveDeliveryVerifyCmd(workspaceDir);
  if (verifyCmd) {
    try {
      execSync(verifyCmd, {
        cwd: workspaceDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
      });
    } catch (e) {
      const detail =
        e instanceof Error && "stderr" in e && typeof e.stderr === "string"
          ? e.stderr.slice(0, 200)
          : e instanceof Error
            ? e.message
            : String(e);
      return {
        passed: false,
        reason: `TAIYI_DELIVERY_VERIFY_CMD 未通过: ${verifyCmd}`,
        hints: [detail || "命令退出非 0"],
      };
    }
  }

  if (options?.slug && commitTrailersEnabled()) {
    const trailers = evaluateCommitTrailers(
      workspaceDir,
      options.slug,
      options.phase ?? "integration",
    );
    if (!trailers.skipped && !trailers.passed) {
      return {
        passed: false,
        reason: trailers.reason ?? "Commit trailer check failed",
        hints: [
          ...(trailers.hints ?? []),
          ...(trailers.suggestion ? [`建议 commit message:\n${trailers.suggestion}`] : []),
        ],
      };
    }
  }

  return { passed: true };
}
