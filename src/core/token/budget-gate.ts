import type { PhaseId } from "../types.js";
import type { TokenBudgetConfig } from "./budget-config.js";
import type { TokenUsageFile } from "./usage-store.js";

export type TokenBudgetEvaluation = {
  ok: boolean;
  enforce: boolean;
  warnings: string[];
  reason?: string;
  globalUsed: number;
  globalBudget: number;
  phaseUsed?: number;
  phaseLimit?: number;
  phase?: PhaseId;
};

export function evaluateTokenBudget(
  cfg: TokenBudgetConfig,
  usage: TokenUsageFile | null,
  phase?: PhaseId,
): TokenBudgetEvaluation {
  const globalUsed = usage?.totalTokens ?? 0;
  const phaseUsed = phase && usage ? (usage.byPhase[phase] ?? 0) : undefined;
  const phaseLimit = phase ? cfg.phaseLimits[phase] : undefined;
  const warnings: string[] = [];

  if (!cfg.enabled) {
    return {
      ok: true,
      enforce: false,
      warnings: [],
      globalUsed,
      globalBudget: cfg.globalBudget,
      phaseUsed,
      phaseLimit,
      phase,
    };
  }

  if (globalUsed > cfg.globalBudget) {
    warnings.push(
      `全局 Token ${globalUsed.toLocaleString()} 已超过预算 ${cfg.globalBudget.toLocaleString()}`,
    );
  } else if (globalUsed > cfg.globalBudget * 0.85) {
    warnings.push(
      `全局 Token 已用 ${Math.round((globalUsed / cfg.globalBudget) * 100)}%（${globalUsed.toLocaleString()}/${cfg.globalBudget.toLocaleString()}）`,
    );
  }

  if (phase && phaseLimit !== undefined && phaseUsed !== undefined) {
    if (phaseUsed > phaseLimit) {
      warnings.push(
        `阶段 ${phase} Token ${phaseUsed.toLocaleString()} 已超过上限 ${phaseLimit.toLocaleString()}`,
      );
    } else if (phaseUsed > phaseLimit * 0.85) {
      warnings.push(
        `阶段 ${phase} 已用 ${Math.round((phaseUsed / phaseLimit) * 100)}% Token`,
      );
    }
  }

  const overGlobal = globalUsed > cfg.globalBudget;
  const overPhase =
    phase !== undefined &&
    phaseLimit !== undefined &&
    phaseUsed !== undefined &&
    phaseUsed > phaseLimit;

  if (cfg.enforce && (overGlobal || overPhase)) {
    const reason = overGlobal
      ? `Token budget exceeded: 全局 ${globalUsed}/${cfg.globalBudget}`
      : `Token budget exceeded: 阶段 ${phase} ${phaseUsed}/${phaseLimit}`;
    return {
      ok: false,
      enforce: true,
      warnings,
      reason,
      globalUsed,
      globalBudget: cfg.globalBudget,
      phaseUsed,
      phaseLimit,
      phase,
    };
  }

  return {
    ok: true,
    enforce: cfg.enforce,
    warnings,
    globalUsed,
    globalBudget: cfg.globalBudget,
    phaseUsed,
    phaseLimit,
    phase,
  };
}
