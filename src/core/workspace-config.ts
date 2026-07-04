import fs from "node:fs";
import path from "node:path";
import type { DoctorCheck } from "./doctor.js";
import { loadProjectConfig, projectConfigPath, type TaiyiProjectConfig } from "./project-config.js";
import {
  projectDeliveryYamlPath,
  resolveDeliveryConfig,
  resolveDeliveryGateEnabled,
  type DeliveryConfig,
} from "./delivery-config.js";
import { loadTokenBudgetConfig, type TokenBudgetConfig } from "./token/budget-config.js";

/** `.taiyi/` 下各配置文件的标准路径（物理文件不合并，仅统一发现） */
export type WorkspaceConfigPaths = {
  configJson: string;
  deliveryYaml: string;
  providersYaml: string;
  runnerPoliciesYaml: string;
  codeStyleYaml: string;
};

export type WorkspaceConfigFiles = {
  configJson: boolean;
  deliveryYaml: boolean;
  providersYaml: boolean;
  runnerPoliciesYaml: boolean;
  codeStyleYaml: boolean;
};

/** 工作区配置快照 — 代码层统一入口，各域仍独立 loader */
export type WorkspaceConfigSnapshot = {
  paths: WorkspaceConfigPaths;
  files: WorkspaceConfigFiles;
  project: TaiyiProjectConfig;
  delivery: DeliveryConfig;
  tokenBudget: TokenBudgetConfig;
  deliveryGateEnabled: boolean;
};

export function listWorkspaceConfigPaths(workspaceDir: string): WorkspaceConfigPaths {
  const taiyi = path.join(workspaceDir, ".taiyi");
  return {
    configJson: path.join(taiyi, "config.json"),
    deliveryYaml: path.join(taiyi, "delivery.yaml"),
    providersYaml: path.join(taiyi, "providers.yaml"),
    runnerPoliciesYaml: path.join(taiyi, "runner-policies.yaml"),
    codeStyleYaml: path.join(taiyi, "code-style.yaml"),
  };
}

function fileExists(p: string): boolean {
  return fs.existsSync(p);
}

/**
 * 聚合加载工作区配置（不合并物理文件）。
 * 各子系统保持独立 schema / merge 规则；此处仅便于 doctor、status、MCP 一次读取。
 */
export function resolveWorkspaceConfig(
  workspaceDir: string,
  env = process.env,
  fromModuleUrl = import.meta.url,
): WorkspaceConfigSnapshot {
  const paths = listWorkspaceConfigPaths(workspaceDir);
  const files: WorkspaceConfigFiles = {
    configJson: fileExists(paths.configJson),
    deliveryYaml: fileExists(paths.deliveryYaml),
    providersYaml: fileExists(paths.providersYaml),
    runnerPoliciesYaml: fileExists(paths.runnerPoliciesYaml),
    codeStyleYaml: fileExists(paths.codeStyleYaml),
  };

  return {
    paths,
    files,
    project: loadProjectConfig(workspaceDir),
    delivery: resolveDeliveryConfig(workspaceDir, fromModuleUrl),
    tokenBudget: loadTokenBudgetConfig(env, workspaceDir),
    deliveryGateEnabled: resolveDeliveryGateEnabled(workspaceDir, env),
  };
}

/** doctor 用：配置发现与开关摘要（不重复各 gate 的 deep 校验） */
export function workspaceConfigDoctorChecks(snap: WorkspaceConfigSnapshot): DoctorCheck[] {
  const checks: DoctorCheck[] = [];

  checks.push({
    id: "workspace-config-json",
    ok: true,
    detail: snap.files.configJson
      ? `config.json 已配置（deliveryGate=${String(snap.deliveryGateEnabled)}）`
      : "config.json 未配置（可选 — taiyi init-wizard）",
  });

  checks.push({
    id: "workspace-delivery-yaml",
    ok: true,
    detail: snap.files.deliveryYaml
      ? "delivery.yaml 已覆盖包默认"
      : "delivery.yaml 未配置 — 使用 docs/taiyi/delivery.yaml 默认",
  });

  checks.push({
    id: "workspace-providers-yaml",
    ok: snap.files.providersYaml,
    detail: snap.files.providersYaml
      ? "providers.yaml 存在"
      : "providers.yaml 缺失 — taiyi-forge-install --all",
  });

  return checks;
}

export { projectConfigPath, projectDeliveryYamlPath };
