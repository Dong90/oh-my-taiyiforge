import fs from "node:fs";
import path from "node:path";
import { PLUGIN_NAME } from "./types.js";
import type { InstallResult } from "./types.js";

function stripJsonComments(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function parseConfig(raw: string): { plugin?: string[] } | null {
  try {
    return JSON.parse(raw) as { plugin?: string[] };
  } catch {
    try {
      return JSON.parse(stripJsonComments(raw)) as { plugin?: string[] };
    } catch {
      return null;
    }
  }
}

function hasPlugin(plugins: string[], name: string): boolean {
  return plugins.some((p) => p === name || p.startsWith(`${name}@`));
}

/** Insert plugin into JSON/JSONC config file. */
export function addPluginToConfigFile(configPath: string, pluginEntry = PLUGIN_NAME): InstallResult {
  if (!fs.existsSync(configPath)) {
    const initial = { plugin: [pluginEntry] };
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify(initial, null, 2)}\n`, "utf8");
    return { target: "opencode-config", path: configPath, action: "created" };
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = parseConfig(raw);
  if (!parsed) {
    return {
      target: "opencode-config",
      path: configPath,
      action: "failed",
      detail: "could not parse config (JSON/JSONC)",
    };
  }

  const plugins = parsed.plugin ?? [];
  if (hasPlugin(plugins, PLUGIN_NAME)) {
    return { target: "opencode-config", path: configPath, action: "skipped", detail: "already listed" };
  }

  const pluginArrayRegex = /(("plugin"|plugin)\s*:\s*)\[([\s\S]*?)\]/;
  if (pluginArrayRegex.test(raw)) {
    const next = plugins.includes(pluginEntry) ? plugins : [...plugins, pluginEntry];
    const formatted = next.map((p) => `"${p}"`).join(",\n    ");
    const updated = raw.replace(pluginArrayRegex, `$1[\n    ${formatted}\n  ]`);
    fs.writeFileSync(configPath, updated.endsWith("\n") ? updated : `${updated}\n`, "utf8");
    return { target: "opencode-config", path: configPath, action: "updated" };
  }

  parsed.plugin = [...plugins, pluginEntry];
  fs.writeFileSync(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return { target: "opencode-config", path: configPath, action: "updated" };
}

export function registerOpencodePlugin(candidates: string[]): InstallResult {
  const existing = candidates.find((p) => fs.existsSync(p));
  const target = existing ?? candidates[0];
  return addPluginToConfigFile(target);
}
