import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type { ChangeProfile } from "./types.js";
import type { PhaseDefinition } from "./types.js";

/** 消费方 `.taiyi/config.json` — 项目级开关与场景偏好（交付细节见 `.taiyi/delivery.yaml`） */
export type ProjectScenarioId =
  | "service"
  | "design-system"
  | "mvp"
  | "micro"
  | "nano"
  | "refactor"
  | "prototype"
  | "docs"
  | "devops"
  | "default";

export type TaiyiProjectConfig = {
  /** 未指定 --profile 时的默认 profile */
  defaultProfile?: ChangeProfile;
  /** false 时关闭 integration 交付门（env 仍可覆盖） */
  deliveryGate?: boolean;
  /** @deprecated 优先 `.taiyi/delivery.yaml` verify.command；仍可读且覆盖 yaml */
  deliveryVerifyCmd?: string;
  /** @deprecated 不可用 config 关闭 trailer；仅 env TAIYI_COMMIT_TRAILERS=0 */
  commitTrailers?: boolean;
  /** 推荐场景（影响 playbook 文案与 `flow` 默认路径） */
  scenario?: ProjectScenarioId;
  harness?: { minimal?: boolean };
  openspec?: boolean;
  /** User-defined custom phases extending the built-in 9-phase workflow. */
  customPhases?: PhaseDefinition[];
  /** Human-gate approver configuration */
  approver?: {
    /** "auto" = read from git config user.name; "prompt" = always require --approver */
    mode?: "auto" | "prompt";
    /** Literal approver name, overrides git config */
    name?: string;
  };
  /** Auto-skip ui-design phase when CHANGE.md has no UI keywords (default: false) */
  autoSkipUiDesign?: boolean;
};

const VALID_PROFILES = new Set<string>(["full", "api", "ui", "lite", "spike", "micro", "nano"]);

export function projectConfigPath(workspaceDir: string): string {
  return path.join(workspaceDir, ".taiyi", "config.json");
}

export function loadProjectConfig(workspaceDir: string): TaiyiProjectConfig {
  const configPath = projectConfigPath(workspaceDir);
  if (!fs.existsSync(configPath)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as TaiyiProjectConfig;
    if (raw.defaultProfile && !VALID_PROFILES.has(raw.defaultProfile)) {
      const { defaultProfile: _drop, ...rest } = raw;
      return rest;
    }
    return raw;
  } catch {
    return {};
  }
}

export function resolveDefaultProfile(workspaceDir: string): ChangeProfile {
  return loadProjectConfig(workspaceDir).defaultProfile ?? "full";
}

/** 场景 → 推荐 profile（可被 CLI --profile 覆盖） */
export function profileForScenario(scenario: ProjectScenarioId): ChangeProfile {
  switch (scenario) {
    case "mvp":
      return "spike";
    case "micro":
      return "micro";
    case "nano":
      return "nano";
    case "refactor":
      return "lite";
    case "prototype":
      return "spike";
    case "docs":
      return "nano";
    case "service":
      return "api";
    case "design-system":
      return "ui";
    case "devops":
    case "default":
    default:
      return "full";
  }
}

export function resolveScenarioFromConfig(workspaceDir: string): ProjectScenarioId {
  return loadProjectConfig(workspaceDir).scenario ?? "default";
}

export type ApproverConfig = {
  mode: "prompt" | "auto";
  name?: string;
};

export function resolveApproverConfig(workspaceDir: string): ApproverConfig {
  const cfg = loadProjectConfig(workspaceDir).approver;
  return {
    mode: cfg?.mode ?? "prompt",
    name: cfg?.name,
  };
}

export function resolveApproverName(workspaceDir: string): string {
  const cfg = resolveApproverConfig(workspaceDir);
  if (cfg.name) return cfg.name;
  try {
    const name = execSync("git config user.name", {
      cwd: workspaceDir,
      encoding: "utf8",
      timeout: 3000,
    }).trim();
    if (name) return name;
  } catch { /* git not available */ }
  return "cli-operator";
}
