import fs from "node:fs";
import path from "node:path";
import type { ChangeProfile } from "./types.js";

/** 消费方 `.taiyi/config.json` — 项目级默认与场景偏好 */
export type ProjectScenarioId =
  | "service"
  | "design-system"
  | "mvp"
  | "micro"
  | "nano"
  | "devops"
  | "default";

export type TaiyiProjectConfig = {
  /** 未指定 --profile 时的默认 profile */
  defaultProfile?: ChangeProfile;
  /** false 时关闭 integration 交付门（env 仍可覆盖） */
  deliveryGate?: boolean;
  /** 低于 env、高于 package.json 的交付验证命令 */
  deliveryVerifyCmd?: string;
  /** false 时关闭 commit trailer 检查 */
  commitTrailers?: boolean;
  /** 推荐场景（影响 playbook 文案与 `flow` 默认路径） */
  scenario?: ProjectScenarioId;
  harness?: { minimal?: boolean };
  openspec?: boolean;
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
