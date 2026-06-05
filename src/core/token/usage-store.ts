import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "../types.js";
import { estimateCostUsd } from "./estimate.js";
import type { TokenBudgetConfig } from "./budget-config.js";

export type TokenUsageKind = "agent" | "artifact" | "compress" | "scan";

export type TokenUsageEntry = {
  at: string;
  phase: PhaseId;
  kind: TokenUsageKind;
  tokens: number;
  label?: string;
};

export type TokenUsageFile = {
  version: 1;
  slug: string;
  totalTokens: number;
  estimatedCostUsd: number;
  byPhase: Partial<Record<PhaseId, number>>;
  entries: TokenUsageEntry[];
  lastCompactAt?: string;
};

const FILE = ".token-usage.json";

function usagePath(changeDir: string): string {
  return path.join(changeDir, FILE);
}

export function readTokenUsage(changeDir: string): TokenUsageFile | null {
  const p = usagePath(changeDir);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as TokenUsageFile;
  } catch {
    return null;
  }
}

function recompute(usage: TokenUsageFile, costPerMillion: number): TokenUsageFile {
  const byPhase: Partial<Record<PhaseId, number>> = {};
  let total = 0;
  for (const e of usage.entries) {
    byPhase[e.phase] = (byPhase[e.phase] ?? 0) + e.tokens;
    total += e.tokens;
  }
  return {
    ...usage,
    totalTokens: total,
    byPhase,
    estimatedCostUsd: estimateCostUsd(total, costPerMillion),
  };
}

export function recordTokenUsage(
  changeDir: string,
  slug: string,
  entry: Omit<TokenUsageEntry, "at"> & { at?: string },
  costPerMillion = 3,
): TokenUsageFile {
  const existing =
    readTokenUsage(changeDir) ??
    ({
      version: 1,
      slug,
      totalTokens: 0,
      estimatedCostUsd: 0,
      byPhase: {},
      entries: [],
    } satisfies TokenUsageFile);

  const full: TokenUsageEntry = {
    at: entry.at ?? new Date().toISOString(),
    phase: entry.phase,
    kind: entry.kind,
    tokens: entry.tokens,
    label: entry.label,
  };
  existing.entries.push(full);
  if (entry.kind === "compress") {
    existing.lastCompactAt = full.at;
  }
  const next = recompute({ ...existing, slug }, costPerMillion);
  fs.writeFileSync(usagePath(changeDir), JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

export function totalTokenUsage(usage: TokenUsageFile): number {
  return usage.totalTokens;
}

export function sumUsageByPhase(usage: TokenUsageFile, phase: PhaseId): number {
  return usage.byPhase[phase] ?? 0;
}

export function ensureTokenUsage(
  changeDir: string,
  slug: string,
  costPerMillion: number,
): TokenUsageFile {
  const u = readTokenUsage(changeDir);
  if (u) return u;
  const empty: TokenUsageFile = {
    version: 1,
    slug,
    totalTokens: 0,
    estimatedCostUsd: 0,
    byPhase: {},
    entries: [],
  };
  fs.writeFileSync(usagePath(changeDir), JSON.stringify(empty, null, 2) + "\n", "utf8");
  return recompute(empty, costPerMillion);
}

export function getTokenBudgetContext(
  changeDir: string,
  slug: string,
  phase: PhaseId,
  cfg: TokenBudgetConfig,
): { usage: TokenUsageFile; phaseUsed: number; phaseLimit?: number } {
  const usage = ensureTokenUsage(changeDir, slug, cfg.costPerMillionTokens);
  return {
    usage,
    phaseUsed: sumUsageByPhase(usage, phase),
    phaseLimit: cfg.phaseLimits[phase],
  };
}
