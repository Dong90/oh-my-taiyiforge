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
  const hasUsage = usage !== null && used > 0;
  // 未记录时 fallback 显示工件扫描结果（不写账本，纯读态）
  if (!hasUsage && opts?.artifactTokens && opts.artifactTokens > 0) {
    const est = opts.artifactTokens;
    const pct = cfg.globalBudget > 0 ? Math.round((est / cfg.globalBudget) * 100) : 0;
    const lines = [
      `Token: 未记录（工件 ≈ ${est.toLocaleString()} / ${cfg.globalBudget.toLocaleString()}，${pct}%）· 运行 ${tokenSlash("scan", opts.slug)} 正式入账`,
    ];
    // 阶段行：无记录时不显示（避免 0 / 80,000 误导）
    // suggestCompress：artifact 超阈值就提示
    const suggestCompress =
      est > cfg.compressThreshold ||
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
