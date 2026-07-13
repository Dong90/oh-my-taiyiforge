import fs from "node:fs";
import path from "node:path";
import type { TaiyiProjectConfig } from "./../core/project-config.js";
import type { ChangeProfile } from "./../core/types.js";
import { seedProjectDeliveryYaml } from "../core/delivery-config.js";

export type InitWizardAnswers = {
  scenario: TaiyiProjectConfig["scenario"];
  defaultProfile: ChangeProfile;
  deliveryGate: boolean;
};

const VALID_SCENARIOS = new Set([
  "service",
  "design-system",
  "mvp",
  "micro",
  "nano",
  "devops",
  "default",
]);

const VALID_PROFILES = new Set([
  "full",
  "api",
  "ui",
  "lite",
  "spike",
  "micro",
  "nano",
]);

function readEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

function readEnvBoolean(key: string, fallback: boolean): boolean {
  const v = readEnv(key);
  if (v === undefined) return fallback;
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return fallback;
}

/**
 * Run the init wizard in non-interactive (env-var-driven) mode.
 *
 * Reads environment variables to determine configuration:
 * - `TAIYI_SCENARIO` — project scenario identifier
 * - `TAIYI_DEFAULT_PROFILE` — default change profile
 * - `TAIYI_DELIVERY_GATE` — "0" or "1"
 * - `TAIYI_COMMIT_TRAILERS` — "0" or "1"
 *
 * Writes the resolved config to `.taiyi/config.json`.
 */
export async function runInitWizard(
  workspaceDir: string,
): Promise<InitWizardAnswers> {
  const rawScenario = readEnv("TAIYI_SCENARIO") ?? "default";
  const scenario = VALID_SCENARIOS.has(rawScenario)
    ? (rawScenario as TaiyiProjectConfig["scenario"])
    : "default";

  const rawProfile = readEnv("TAIYI_DEFAULT_PROFILE") ?? "api";
  const defaultProfile = VALID_PROFILES.has(rawProfile)
    ? (rawProfile as ChangeProfile)
    : "api";

  const deliveryGate = readEnvBoolean("TAIYI_DELIVERY_GATE", false);

  const config: TaiyiProjectConfig = {
    scenario,
    defaultProfile,
    deliveryGate,
  };

  const configDir = path.join(workspaceDir, ".taiyi");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(configDir, "config.json"),
    JSON.stringify(config, null, 2) + "\n",
    "utf8",
  );

  seedProjectDeliveryYaml(workspaceDir);

  return { scenario, defaultProfile, deliveryGate };
}
