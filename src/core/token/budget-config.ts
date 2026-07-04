import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "../types.js";
import { resolvePackageRoot } from "../package-root.js";

export type TokenBudgetConfig = {
  enabled: boolean;
  enforce: boolean;
  globalBudget: number;
  phaseLimits: Partial<Record<PhaseId, number>>;
  costPerMillionTokens: number;
  /** Suggest compress when artifact scan exceeds this */
  compressThreshold: number;
  maxSectionChars: number;
};

const DEFAULT_PHASE_LIMITS: Partial<Record<PhaseId, number>> = {
  change: 80_000,
  requirement: 60_000,
  design: 100_000,
  "ui-design": 80_000,
  task: 50_000,
  dev: 150_000,
  test: 80_000,
  review: 60_000,
  integration: 40_000,
};

const DEFAULTS: TokenBudgetConfig = {
  enabled: true,
  enforce: false,
  globalBudget: 500_000,
  phaseLimits: { ...DEFAULT_PHASE_LIMITS },
  costPerMillionTokens: 3,
  compressThreshold: 120_000,
  maxSectionChars: 600,
};

function parseYamlBudget(file: string): Partial<TokenBudgetConfig> | null {
  if (!fs.existsSync(file)) return null;
  const out: Partial<TokenBudgetConfig> & { phaseLimits?: Partial<Record<PhaseId, number>> } =
    {};
  let inPhase = false;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.match(/^phaseLimits:/)) {
      inPhase = true;
      out.phaseLimits = { ...DEFAULT_PHASE_LIMITS };
      continue;
    }
    if (inPhase) {
      const pm = line.match(/^  ([a-z-]+):\s*(\d+)/);
      if (pm) {
        out.phaseLimits![pm[1] as PhaseId] = Number(pm[2]);
        continue;
      }
      if (!line.startsWith("  ")) inPhase = false;
    }
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m || inPhase) continue;
    const [, key, raw] = m;
    const v = raw.trim();
    if (v === "true" || v === "false") {
      (out as Record<string, boolean>)[key] = v === "true";
    } else if (/^\d+(\.\d+)?$/.test(v)) {
      (out as Record<string, number>)[key] = Number(v);
    }
  }
  return out;
}

export function projectTokenBudgetPath(workspaceDir: string): string {
  return path.join(workspaceDir, ".taiyi", "token-budget.yaml");
}

function mergeTokenBudgetLayer(
  base: TokenBudgetConfig,
  layer: Partial<TokenBudgetConfig> | null,
): TokenBudgetConfig {
  if (!layer) return base;
  return {
    ...base,
    ...layer,
    phaseLimits: { ...base.phaseLimits, ...layer.phaseLimits },
  };
}

export function loadTokenBudgetConfig(
  env: NodeJS.ProcessEnv = process.env,
  workspaceDir?: string,
): TokenBudgetConfig {
  const pkgRoot = resolvePackageRoot(import.meta.url);
  const bundledPath = path.join(pkgRoot, "docs", "taiyi", "token-budget.yaml");
  const fromBundled = parseYamlBudget(bundledPath);
  let cfg: TokenBudgetConfig = {
    ...DEFAULTS,
    phaseLimits: { ...DEFAULT_PHASE_LIMITS, ...fromBundled?.phaseLimits },
    ...fromBundled,
  };

  if (workspaceDir) {
    const projectPath = projectTokenBudgetPath(workspaceDir);
    cfg = mergeTokenBudgetLayer(cfg, parseYamlBudget(projectPath));
  }

  if (env.TAIYI_TOKEN_BUDGET?.trim()) {
    cfg.globalBudget = Number(env.TAIYI_TOKEN_BUDGET);
  }
  if (env.TAIYI_TOKEN_ENFORCE === "1" || env.TAIYI_TOKEN_ENFORCE === "true") {
    cfg.enforce = true;
  }
  if (env.TAIYI_TOKEN_ENFORCE === "0" || env.TAIYI_TOKEN_ENFORCE === "false") {
    cfg.enforce = false;
  }
  if (env.TAIYI_TOKEN_DISABLED === "1") {
    cfg.enabled = false;
  }
  if (env.TAIYI_TOKEN_COST_PER_M?.trim()) {
    cfg.costPerMillionTokens = Number(env.TAIYI_TOKEN_COST_PER_M);
  }
  if (env.TAIYI_TOKEN_COMPRESS_THRESHOLD?.trim()) {
    cfg.compressThreshold = Number(env.TAIYI_TOKEN_COMPRESS_THRESHOLD);
  }

  return cfg;
}
