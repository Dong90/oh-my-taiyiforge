import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { resolvePackageRoot } from "./package-root.js";
import { loadProjectConfig } from "./project-config.js";

export type DeliveryTrailerRule = {
  key: string;
  value: string;
};

export type DeliveryCommitConfig = {
  /** Commit body 模板。变量 {slug}/{phase}/{type}/{summary}/{subject} 单次替换；
   *  {trailers} 占位符仅支持单次（替换为 trailer 块）。多个 {trailers} 仅第一个有效。 */
  subjectTemplate: string;
  bodyTemplate: string;
  defaultType: string;
  defaultSummary: string;
  maxSubjectLength: number;
  requiredTrailers: DeliveryTrailerRule[];
};

export type DeliveryGitConfig = {
  defaultRemote: string;
  branchTemplate: string;
  baseBranches: string[];
};

export type DeliveryShipPrConfig = {
  titleTemplate: string;
  bodyTemplate: string;
  base: string | null;
  labels: string[];
  draft: boolean;
};

export type DeliveryShipConfig = {
  provider: "gh" | "manual";
  push: boolean;
  preCommands: string[];
  pr: DeliveryShipPrConfig;
};

export type DeliveryLandMergeConfig = {
  method: "squash" | "merge" | "rebase";
  deleteBranch: boolean;
};

export type DeliveryLandConfig = {
  provider: "gh" | "manual";
  waitCi: boolean;
  postMergeCommands: string[];
  healthUrl: string | null;
  merge: DeliveryLandMergeConfig;
};

export type DeliveryVerifyConfig = {
  command: string | null;
};

export type DeliveryChainConfig = {
  steps: string[];
  requireConfirm: string[];
  requireConfirmBeforeStart: boolean;
};

export type DeliveryConfig = {
  version: number;
  commit: DeliveryCommitConfig;
  git: DeliveryGitConfig;
  ship: DeliveryShipConfig;
  land: DeliveryLandConfig;
  verify: DeliveryVerifyConfig;
  chain: DeliveryChainConfig;
};

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  version: 1,
  commit: {
    subjectTemplate: "{type}: {summary}",
    bodyTemplate: "",
    defaultType: "feat",
    defaultSummary: "deliver change slice",
    maxSubjectLength: 72,
    requiredTrailers: [
      { key: "Taiyi-Change", value: "{slug}" },
      { key: "Taiyi-Phase", value: "{phase}" },
    ],
  },
  git: {
    defaultRemote: "origin",
    branchTemplate: "feat/{slug}",
    baseBranches: ["origin/develop", "origin/main", "origin/master", "develop", "main", "master"],
  },
  verify: { command: null },
  ship: {
    provider: "gh",
    push: true,
    preCommands: [],
    pr: {
      titleTemplate: "[{slug}] {summary}",
      bodyTemplate: "",
      base: null,
      labels: [],
      draft: false,
    },
  },
  land: {
    provider: "manual",
    waitCi: false,
    postMergeCommands: [],
    healthUrl: null,
    merge: { method: "squash", deleteBranch: true },
  },
  chain: {
    steps: ["commit", "verify", "ship", "land", "continue-integration", "archive"],
    requireConfirm: ["ship", "land"],
    requireConfirmBeforeStart: true,
  },
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U> ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return undefined;
    out.push(item);
  }
  return out;
}

function asObject(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function parseRequiredTrailers(v: unknown): DeliveryTrailerRule[] | undefined {
  const arr = Array.isArray(v) ? v : undefined;
  if (!arr) return undefined;
  const out: DeliveryTrailerRule[] = [];
  for (const item of arr) {
    const obj = asObject(item);
    if (!obj) return undefined;
    const key = asString(obj.key);
    const value = asString(obj.value);
    if (!key || value === undefined) return undefined;
    out.push({ key, value });
  }
  return out;
}

/** 解析 delivery.yaml（标准 yaml 库，fail-soft：非法字段静默忽略） */
export function parseDeliveryYaml(content: string): DeepPartial<DeliveryConfig> {
  let raw: unknown;
  try {
    raw = YAML.parse(content);
  } catch {
    return {};
  }
  const root = asObject(raw);
  if (!root) return {};

  const out: DeepPartial<DeliveryConfig> = {};

  const version = asNumber(root.version);
  if (version !== undefined) out.version = version;

  const commitObj = asObject(root.commit);
  if (commitObj) {
    const commit: DeepPartial<DeliveryCommitConfig> = {};
    const st = asString(commitObj.subjectTemplate);
    if (st !== undefined) commit.subjectTemplate = st;
    const bt = asString(commitObj.bodyTemplate);
    if (bt !== undefined) commit.bodyTemplate = bt;
    const dt = asString(commitObj.defaultType);
    if (dt !== undefined) commit.defaultType = dt;
    const ds = asString(commitObj.defaultSummary);
    if (ds !== undefined) commit.defaultSummary = ds;
    const ms = asNumber(commitObj.maxSubjectLength);
    if (ms !== undefined) commit.maxSubjectLength = ms;
    const rt = parseRequiredTrailers(commitObj.requiredTrailers);
    if (rt) commit.requiredTrailers = rt;
    if (Object.keys(commit).length > 0) out.commit = commit;
  }

  const gitObj = asObject(root.git);
  if (gitObj) {
    const git: DeepPartial<DeliveryGitConfig> = {};
    const dr = asString(gitObj.defaultRemote);
    if (dr !== undefined) git.defaultRemote = dr;
    const bt2 = asString(gitObj.branchTemplate);
    if (bt2 !== undefined) git.branchTemplate = bt2;
    const bb = asStringArray(gitObj.baseBranches);
    if (bb) git.baseBranches = bb;
    if (Object.keys(git).length > 0) out.git = git;
  }

  const verifyObj = asObject(root.verify);
  if (verifyObj) {
    const verify: DeepPartial<DeliveryVerifyConfig> = {};
    const cmd = verifyObj.command === null ? null : asString(verifyObj.command);
    if (cmd !== undefined) verify.command = cmd;
    if (Object.keys(verify).length > 0) out.verify = verify;
  }

  const shipObj = asObject(root.ship);
  if (shipObj) {
    const ship: DeepPartial<DeliveryShipConfig> = {};
    const provider = asString(shipObj.provider);
    if (provider === "gh" || provider === "manual") ship.provider = provider;
    const push = asBoolean(shipObj.push);
    if (push !== undefined) ship.push = push;
    const pre = asStringArray(shipObj.preCommands);
    if (pre) ship.preCommands = pre;
    const prObj = asObject(shipObj.pr);
    if (prObj) {
      const pr: DeepPartial<DeliveryShipPrConfig> = {};
      const tt = asString(prObj.titleTemplate);
      if (tt !== undefined) pr.titleTemplate = tt;
      const bt3 = asString(prObj.bodyTemplate);
      if (bt3 !== undefined) pr.bodyTemplate = bt3;
      const base = prObj.base === null ? null : asString(prObj.base);
      if (base !== undefined) pr.base = base;
      const labels = asStringArray(prObj.labels);
      if (labels) pr.labels = labels;
      const draft = asBoolean(prObj.draft);
      if (draft !== undefined) pr.draft = draft;
      if (Object.keys(pr).length > 0) ship.pr = pr;
    }
    if (Object.keys(ship).length > 0) out.ship = ship;
  }

  const landObj = asObject(root.land);
  if (landObj) {
    const land: DeepPartial<DeliveryLandConfig> = {};
    const provider = asString(landObj.provider);
    if (provider === "gh" || provider === "manual") land.provider = provider;
    const waitCi = asBoolean(landObj.waitCi);
    if (waitCi !== undefined) land.waitCi = waitCi;
    const post = asStringArray(landObj.postMergeCommands);
    if (post) land.postMergeCommands = post;
    const health = landObj.healthUrl === null ? null : asString(landObj.healthUrl);
    if (health !== undefined) land.healthUrl = health;
    const mergeObj = asObject(landObj.merge);
    if (mergeObj) {
      const merge: DeepPartial<DeliveryLandMergeConfig> = {};
      const method = asString(mergeObj.method);
      if (method === "squash" || method === "merge" || method === "rebase") {
        merge.method = method;
      }
      const deleteBranch = asBoolean(mergeObj.deleteBranch);
      if (deleteBranch !== undefined) merge.deleteBranch = deleteBranch;
      if (Object.keys(merge).length > 0) land.merge = merge;
    }
    if (Object.keys(land).length > 0) out.land = land;
  }

  const chainObj = asObject(root.chain);
  if (chainObj) {
    const chain: DeepPartial<DeliveryChainConfig> = {};
    const steps = asStringArray(chainObj.steps);
    if (steps) chain.steps = steps;
    const requireConfirm = asStringArray(chainObj.requireConfirm);
    if (requireConfirm) chain.requireConfirm = requireConfirm;
    const rcb = asBoolean(chainObj.requireConfirmBeforeStart);
    if (rcb !== undefined) chain.requireConfirmBeforeStart = rcb;
    if (Object.keys(chain).length > 0) out.chain = chain;
  }

  return out;
}

export function deepMergeDeliveryConfig(base: DeliveryConfig, override: DeepPartial<DeliveryConfig>): DeliveryConfig {
  return {
    version: override.version ?? base.version,
    commit: {
      ...base.commit,
      ...override.commit,
      requiredTrailers: override.commit?.requiredTrailers ?? base.commit.requiredTrailers,
    },
    git: {
      ...base.git,
      ...override.git,
      baseBranches: override.git?.baseBranches ?? base.git.baseBranches,
    },
    verify: { ...base.verify, ...override.verify },
    ship: {
      ...base.ship,
      ...override.ship,
      preCommands: override.ship?.preCommands ?? base.ship.preCommands,
      pr: {
        ...base.ship.pr,
        ...override.ship?.pr,
        labels: override.ship?.pr?.labels ?? base.ship.pr.labels,
      },
    },
    land: {
      ...base.land,
      ...override.land,
      postMergeCommands: override.land?.postMergeCommands ?? base.land.postMergeCommands,
      merge: { ...base.land.merge, ...override.land?.merge },
    },
    chain: {
      ...base.chain,
      ...override.chain,
      steps: override.chain?.steps ?? base.chain.steps,
      requireConfirm: override.chain?.requireConfirm ?? base.chain.requireConfirm,
    },
  };
}

export function bundledDeliveryYamlPath(fromModuleUrl = import.meta.url): string {
  return path.join(resolvePackageRoot(fromModuleUrl), "docs", "taiyi", "delivery.yaml");
}

export function projectDeliveryYamlPath(workspaceDir: string): string {
  return path.join(workspaceDir, ".taiyi", "delivery.yaml");
}

export const DELIVERY_YAML_SEED = `# TaiyiForge 交付配置 — 只写与包默认不同的项
# 默认真源: docs/taiyi/delivery.yaml
# 说明: docs/taiyi/configuration.md
#
# commit:
#   subjectTemplate: "[{slug}] {type}: {summary}"
# verify:
#   command: npm run ci:verify
`;

/** init-wizard：不存在时写入注释骨架，不覆盖已有文件 */
export function seedProjectDeliveryYaml(workspaceDir: string): boolean {
  const target = projectDeliveryYamlPath(workspaceDir);
  if (fs.existsSync(target)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, DELIVERY_YAML_SEED, "utf8");
  return true;
}

function loadYamlFile(filePath: string): DeepPartial<DeliveryConfig> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return parseDeliveryYaml(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    process.stderr.write(
      `[taiyi-forge] warn: failed to parse ${filePath}: ` + `${e instanceof Error ? e.message : String(e)}\n`,
    );
    return {};
  }
}

/** 双层 YAML merge：包默认 + 项目覆盖 */
export function loadDeliveryYamlLayers(workspaceDir: string, fromModuleUrl = import.meta.url): DeliveryConfig {
  const bundled = loadYamlFile(bundledDeliveryYamlPath(fromModuleUrl));
  const project = loadYamlFile(projectDeliveryYamlPath(workspaceDir));
  let cfg = deepMergeDeliveryConfig(DEFAULT_DELIVERY_CONFIG, bundled);
  cfg = deepMergeDeliveryConfig(cfg, project);
  return cfg;
}

export function resolveDeliveryConfig(workspaceDir: string, fromModuleUrl = import.meta.url): DeliveryConfig {
  return loadDeliveryYamlLayers(workspaceDir, fromModuleUrl);
}

export function resolveSlugTrailerKey(config: DeliveryConfig): string {
  const rule = config.commit.requiredTrailers.find((t) => t.value.includes("{slug}"));
  return rule?.key ?? "Taiyi-Change";
}

export function resolveDeliveryGateEnabled(workspaceDir: string, env = process.env): boolean {
  if (env.TAIYI_DELIVERY_GATE === "0" || env.TAIYI_DELIVERY_GATE === "false") {
    return false;
  }
  if (env.TAIYI_DELIVERY_GATE === "1" || env.TAIYI_DELIVERY_GATE === "true") {
    return true;
  }
  const cfg = loadProjectConfig(workspaceDir);
  if (cfg.deliveryGate === false) return false;
  if (cfg.deliveryGate === true) return true;
  return fs.existsSync(path.join(workspaceDir, ".git"));
}

export function resolveDeliveryVerifyFromConfig(
  workspaceDir: string,
  delivery: DeliveryConfig,
  env = process.env,
): string | undefined {
  const fromEnv = env.TAIYI_DELIVERY_VERIFY_CMD?.trim();
  if (fromEnv) return fromEnv;

  const fromJson = loadProjectConfig(workspaceDir).deliveryVerifyCmd?.trim();
  if (fromJson) return fromJson;

  const fromYaml = delivery.verify.command?.trim();
  if (fromYaml) return fromYaml;

  const pkgPath = path.join(workspaceDir, "package.json");
  if (!fs.existsSync(pkgPath)) return undefined;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
      taiyi?: { deliveryVerifyCmd?: string };
    };
    return pkg.taiyi?.deliveryVerifyCmd?.trim() || undefined;
  } catch {
    return undefined;
  }
}
