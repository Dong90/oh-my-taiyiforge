import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { commitTrailersEnabled, evaluateCommitTrailers, resolveBaseBranch } from "./commit-trailer.js";
import { resolveDeliveryVerifyCmd } from "./consumer-config.js";
import { resolveDeliveryConfig, resolveDeliveryGateEnabled } from "../delivery-config.js";
import type { ArchitectureTemplate } from "../types.js";

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

function resolveBaseBranchForWorkspace(workspaceDir: string): string {
  const config = resolveDeliveryConfig(workspaceDir);
  return resolveBaseBranch(workspaceDir, config.git.baseBranches);
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
  for (const cmd of ["diff --name-only", "diff --cached --name-only", "ls-files --others --exclude-standard"]) {
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
  return resolveDeliveryGateEnabled(workspaceDir, env);
}

export function evaluateDeliveryGate(
  workspaceDir: string,
  options?: { slug?: string; phase?: string },
): DeliveryGateResult {
  if (!fs.existsSync(path.join(workspaceDir, ".git"))) {
    return { passed: true, skipped: true };
  }

  const base = resolveBaseBranchForWorkspace(workspaceDir);
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
    // 当 base 是远端追踪分支且同步后 diff 为空时，用 HEAD~1 作为 fallback
    if (base !== "HEAD" && !base.startsWith("HEAD")) {
      try {
        const out = runGit(workspaceDir, "diff --name-only HEAD~1 HEAD");
        committedAhead = out ? out.split("\n").filter(Boolean) : [];
      } catch {
        /* HEAD~1 不存在（单 commit 仓库）— 走下方逻辑 */
      }
    }
    if (committedAhead.length === 0 && base === "HEAD") {
      // 完全空仓库（无 commit + base 解析 fallback 到 HEAD）— 明确 fail，避免静默通过
      return {
        passed: false,
        reason: `未检测到任何 commit 且未识别 base 分支（main/master/develop 等）；请先 git commit 初始内容并 git push 远端`,
        hints: [
          "git push -u origin <branch>  # 创建远端 base 后重试",
          "或设置 TAIYI_DELIVERY_GATE=0 仅本地演示（不推荐）",
        ],
      };
    }
    if (committedAhead.length > 0 && base === "HEAD") {
      // 单 commit 仓库（base fallback 到 HEAD）— 旧 silent-pass 保留，避免破坏单 commit 起步场景
      // no-op
    } else {
      return {
        passed: false,
        reason: `integration 需在实现代码 commit 之后（相对 ${base} 无新 commit）`,
        hints: [
          "先按 TASK 切片 commit，再 complete integration",
          "或设置 TAIYI_DELIVERY_GATE=0 仅用于本地演示（不推荐）",
        ],
      };    }
  }

  const dirty = listUncommitted(workspaceDir);
  const blockingDirty = options?.slug ? dirty.filter((f) => isChangeScopedDirtyPath(f, options.slug!)) : dirty;
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
    const trailers = evaluateCommitTrailers(workspaceDir, options.slug, options.phase ?? "integration");
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

export type ProductionReadinessResult = {
  passed: boolean;
  warnings: string[];
};

/** Check that package.json contains required scripts. */
function checkPackageScripts(workspaceDir: string, required: string[]): ProductionReadinessResult {
  const pkgPath = path.join(workspaceDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { passed: false, warnings: ["missing package.json"] };
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      scripts?: Record<string, string>;
    };
    const missing = required.filter((s) => !pkg.scripts?.[s]);
    if (missing.length > 0) {
      return {
        passed: false,
        warnings: [`package.json 缺少 script: ${missing.join(", ")}`],
      };
    }
    return { passed: true, warnings: [] };
  } catch {
    return { passed: false, warnings: ["package.json 解析失败"] };
  }
}

/** Scan source files for health endpoint pattern (GET /health, GET /api/health, /ready, /live). */
function scanHealthEndpoint(workspaceDir: string): ProductionReadinessResult {
  const patterns = [/(?:\/health|\/api\/health|\/ready|\/live)/i, /healthCheck|health_check|\/healthz/i];
  const srcDir = path.join(workspaceDir, "src");
  if (!fs.existsSync(srcDir)) {
    return { passed: false, warnings: ["src/ 目录不存在，无法检查 health endpoint"] };
  }
  try {
    const files = listFilesRecursive(srcDir).filter((f) => f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".py"));
    const found = files.some((f) => {
      const content = fs.readFileSync(path.join(workspaceDir, f), "utf8");
      return patterns.some((p) => p.test(content));
    });
    if (!found) {
      return {
        passed: false,
        warnings: ["未发现 health endpoint（GET /health 或 /api/health）"],
      };
    }
    return { passed: true, warnings: [] };
  } catch {
    return { passed: false, warnings: ["health endpoint 检查失败"] };
  }
}

/** Scan source files for CORS middleware usage. */
function scanCorsUsage(workspaceDir: string): ProductionReadinessResult {
  const corsPattern = /cors|cors\(|allow_origins|Access-Control-/i;
  const srcDir = path.join(workspaceDir, "src");
  if (!fs.existsSync(srcDir)) {
    return { passed: false, warnings: ["src/ 目录不存在，无法检查 CORS"] };
  }
  try {
    const files = listFilesRecursive(srcDir).filter((f) => f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".py"));
    const found = files.some((f) => {
      const content = fs.readFileSync(path.join(workspaceDir, f), "utf8");
      return corsPattern.test(content);
    });
    if (!found) {
      return { passed: false, warnings: ["未发现 CORS 配置"] };
    }
    return { passed: true, warnings: [] };
  } catch {
    return { passed: false, warnings: ["CORS 检查失败"] };
  }
}

function listFilesRecursive(dir: string): string[] {
  const result: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          result.push(...listFilesRecursive(full));
        }
      } else {
        result.push(full);
      }
    }
  } catch {
    /* permission denied or missing — skip */
  }
  return result;
}

/** evaluateProductionReadiness: check arch-template production-readiness constraints.
 *  Does not block integration, returns warnings for the audit report.
 */
export function evaluateProductionReadiness(
  workspaceDir: string,
  archTemplate?: ArchitectureTemplate,
): ProductionReadinessResult {
  if (!archTemplate?.productionReadiness) {
    return { passed: true, warnings: [] };
  }
  const pr = archTemplate.productionReadiness;
  const warnings: string[] = [];

  if (pr.requiredScripts && pr.requiredScripts.length > 0) {
    const scriptsResult = checkPackageScripts(workspaceDir, pr.requiredScripts);
    if (!scriptsResult.passed) {
      warnings.push(...scriptsResult.warnings);
    }
  }

  if (pr.healthEndpoint) {
    const healthResult = scanHealthEndpoint(workspaceDir);
    if (!healthResult.passed) {
      warnings.push(...healthResult.warnings);
    }
  }

  if (pr.corsCheck) {
    const corsResult = scanCorsUsage(workspaceDir);
    if (!corsResult.passed) {
      warnings.push(...corsResult.warnings);
    }
  }

  return { passed: warnings.length === 0, warnings };
}
