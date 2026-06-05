import path from "node:path";
import type { PhaseId } from "./types.js";
import { loadTokenBudgetConfig } from "./token/budget-config.js";
import {
  ensureTokenUsage,
  readTokenUsage,
  recordTokenUsage,
} from "./token/usage-store.js";
import { evaluateTokenBudget } from "./token/budget-gate.js";
import { scanArtifactTokens } from "./token/scan-artifacts.js";
import { compressChangeContext } from "./token/compress-context.js";
import { formatTokenBudgetPlain } from "./format-token.js";
import { tokenSlash } from "./token-invoke.js";
import { formatCompressHooksPlain } from "../integrations/token-compress-hooks.js";

export function tokenStatusPlain(
  changeDir: string,
  slug: string,
  phase?: PhaseId,
): string {
  const cfg = loadTokenBudgetConfig();
  const usage = readTokenUsage(changeDir);
  const evalResult = evaluateTokenBudget(cfg, usage, phase);
  const artifactTokens = scanArtifactTokens(changeDir).total;
  return formatTokenBudgetPlain(cfg, usage, evalResult, {
    slug,
    phase,
    artifactTokens,
  });
}

export function tokenRecord(
  changeDir: string,
  slug: string,
  tokens: number,
  opts: { phase: PhaseId; kind?: "agent" | "artifact" | "scan"; label?: string },
): string {
  const cfg = loadTokenBudgetConfig();
  ensureTokenUsage(changeDir, slug, cfg.costPerMillionTokens);
  const usage = recordTokenUsage(
    changeDir,
    slug,
    {
      phase: opts.phase,
      kind: opts.kind ?? "agent",
      tokens,
      label: opts.label,
    },
    cfg.costPerMillionTokens,
  );
  const evalResult = evaluateTokenBudget(cfg, usage, opts.phase);
  return formatTokenBudgetPlain(cfg, usage, evalResult);
}

export function tokenScan(changeDir: string, slug: string, phase: PhaseId): string {
  const cfg = loadTokenBudgetConfig();
  const scan = scanArtifactTokens(changeDir);
  if (scan.total === 0) return "Token scan: 无可扫描工件";

  const usage = recordTokenUsage(
    changeDir,
    slug,
    {
      phase,
      kind: "scan",
      tokens: scan.total,
      label: `${scan.files.length} files`,
    },
    cfg.costPerMillionTokens,
  );
  const lines = [
    `Token scan: ${scan.total.toLocaleString()}（${scan.files.length} 个文件）`,
    ...scan.files.map((f) => `  - ${f.name}: ${f.tokens.toLocaleString()}`),
    formatTokenBudgetPlain(cfg, usage, evaluateTokenBudget(cfg, usage, phase)),
  ];
  return lines.join("\n");
}

export function tokenCompress(
  changeDir: string,
  slug: string,
  phase: PhaseId,
): string {
  const cfg = loadTokenBudgetConfig();
  const r = compressChangeContext(changeDir, {
    maxSectionChars: cfg.maxSectionChars,
    slug,
    phase,
    record: true,
    costPerMillion: cfg.costPerMillionTokens,
  });
  const usage = readTokenUsage(changeDir);
  const hooks = formatCompressHooksPlain(slug, phase);
  return [
    `已写入 ${path.basename(r.outputPath)}`,
    `输入 ~${r.inputTokens.toLocaleString()} → 输出 ~${r.outputTokens.toLocaleString()}（约省 ${r.savedTokens.toLocaleString()}）`,
    formatTokenBudgetPlain(cfg, usage, evaluateTokenBudget(cfg, usage, phase), {
      slug,
      phase,
    }),
    hooks ? `\n下一步（第三方，聊天加载 Skill）:\n${hooks}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function enforceTokenBudgetBeforeComplete(
  changeDir: string,
  slug: string,
  phase: PhaseId,
): { ok: boolean; error?: string } {
  const cfg = loadTokenBudgetConfig();
  if (!cfg.enabled || !cfg.enforce) return { ok: true };
  const usage = readTokenUsage(changeDir);
  const evalResult = evaluateTokenBudget(cfg, usage, phase);
  if (!evalResult.ok) {
    return {
      ok: false,
      error: `${evalResult.reason}. Run: ${tokenSlash("status", slug)}`,
    };
  }
  return { ok: true };
}

export function buildTokenBudgetSummary(
  changeDir: string,
  slug: string,
  phase: PhaseId,
): { cfg: ReturnType<typeof loadTokenBudgetConfig>; evalResult: ReturnType<typeof evaluateTokenBudget>; line: string } {
  const cfg = loadTokenBudgetConfig();
  const usage = readTokenUsage(changeDir);
  const evalResult = evaluateTokenBudget(cfg, usage, phase);
  const artifactTokens = scanArtifactTokens(changeDir).total;
  const line = formatTokenBudgetPlain(cfg, usage, evalResult, {
    slug,
    phase,
    artifactTokens,
  });
  return { cfg, evalResult, line };
}
