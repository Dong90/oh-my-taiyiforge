import type { TokenBudgetConfig } from "./token/budget-config.js";
import type { TokenUsageFile } from "./token/usage-store.js";
import type { TokenBudgetEvaluation } from "./token/budget-gate.js";
import type { PhaseId } from "./types.js";
import { formatCompressHooksPlain } from "../integrations/token-compress-hooks.js";
import { tokenSlash } from "./token-invoke.js";

export function formatTokenBudgetPlain(
  cfg: TokenBudgetConfig,
  usage: TokenUsageFile | null,
  evalResult?: TokenBudgetEvaluation,
  opts?: { slug?: string; phase?: PhaseId; artifactTokens?: number },
): string {
  if (!cfg.enabled) return "Token: 预算追踪已关闭（TAIYI_TOKEN_DISABLED=1）";

  const used = usage?.totalTokens ?? 0;
  const pct = cfg.globalBudget > 0 ? Math.round((used / cfg.globalBudget) * 100) : 0;
  const cost = usage?.estimatedCostUsd ?? 0;
  const lines = [
    `Token: ${used.toLocaleString()} / ${cfg.globalBudget.toLocaleString()}（${pct}%）· 估算费用 ≈ $${cost.toFixed(4)}`,
  ];

  if (evalResult?.phase && evalResult.phaseLimit !== undefined) {
    const pu = evalResult.phaseUsed ?? 0;
    lines.push(
      `  阶段 ${evalResult.phase}: ${pu.toLocaleString()} / ${evalResult.phaseLimit.toLocaleString()}`,
    );
  }

  if (evalResult?.warnings.length) {
    for (const w of evalResult.warnings) lines.push(`  ⚠ ${w}`);
  }

  const overArtifact =
    opts?.artifactTokens !== undefined && opts.artifactTokens > cfg.compressThreshold;
  const suggestCompress =
    used > cfg.compressThreshold ||
    overArtifact ||
    (evalResult?.warnings.some((w) => w.includes("85%")) ?? false);

  if (suggestCompress) {
    lines.push(`  → 建议: ${tokenSlash("compress", opts?.slug)} 或读 CONTEXT-COMPACT.md`);
    if (opts?.slug && opts?.phase) {
      const hooks = formatCompressHooksPlain(opts.slug, opts.phase);
      if (hooks) lines.push(hooks);
    }
  }

  return lines.join("\n");
}
