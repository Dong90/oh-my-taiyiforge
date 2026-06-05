import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installCodexAgents } from "./codex-agents.js";
import { addPluginToConfigFile } from "./opencode-plugin.js";
import {
  defaultSkillTargets,
  opencodeConfigCandidates,
  opencodeConfigDir,
  skillSourceRoot,
} from "./paths.js";
import { syncTaiyiSkills } from "./sync-skills.js";
import type { InstallResult, InstallTarget } from "./types.js";
import { PLUGIN_NAME } from "./types.js";

export type RunInstallOptions = {
  pkgRoot?: string;
  targets?: InstallTarget[];
  /** Write plugin entry to opencode.json */
  registerPlugin?: boolean;
  /** npm install this package into ~/.config/opencode (local path or registry name) */
  opencodeNpmSpec?: string;
  cwd?: string;
  silent?: boolean;
};

function log(silent: boolean | undefined, msg: string): void {
  if (!silent) console.log(msg);
}

export function parseInstallTargets(env = process.env): InstallTarget[] {
  const raw = env.TAIYI_FORGE_INSTALL?.trim();
  if (!raw) return ["opencode", "claude", "codex"];
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t): t is InstallTarget => t === "opencode" || t === "claude" || t === "codex");
}

export function shouldRunPostinstall(env = process.env): boolean {
  if (env.TAIYI_FORGE_SKIP_POSTINSTALL === "1") return false;
  if (env.CI === "true" || env.CI === "1") return false;
  return true;
}

export function resolvePackageRoot(moduleUrl: string): string {
  const dir = path.dirname(fileURLToPath(moduleUrl));
  if (dir.endsWith(`${path.sep}dist${path.sep}install`)) {
    return path.join(dir, "..", "..");
  }
  if (dir.endsWith(`${path.sep}install`)) {
    return path.join(dir, "..");
  }
  return dir;
}

function pickOpencodeConfigPath(cwd: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const global = path.join(home, ".config", "opencode", "opencode.json");
  if (fs.existsSync(global)) return global;
  const found = opencodeConfigCandidates(cwd).find((p) => fs.existsSync(p));
  return found ?? global;
}

export async function runInstall(opts: RunInstallOptions = {}): Promise<InstallResult[]> {
  const pkgRoot = opts.pkgRoot ?? resolvePackageRoot(import.meta.url);
  const resolvedRoot = fs.existsSync(path.join(pkgRoot, "skills")) ? pkgRoot : path.resolve(pkgRoot, "..");
  const skillsSrc = skillSourceRoot(resolvedRoot);
  const targets = opts.targets ?? parseInstallTargets();
  const dirs = defaultSkillTargets();
  const results: InstallResult[] = [];
  const silent = opts.silent;

  if (targets.includes("opencode")) {
    results.push(syncTaiyiSkills(skillsSrc, dirs.opencode));
  }
  if (targets.includes("claude")) {
    const r = syncTaiyiSkills(skillsSrc, dirs.claude);
    results.push({ ...r, target: "claude" });
  }
  if (targets.includes("codex")) {
    const r = syncTaiyiSkills(skillsSrc, dirs.codex);
    results.push({ ...r, target: "codex" });
    results.push(installCodexAgents(resolvedRoot, path.dirname(dirs.codex)));
  }

  if (opts.registerPlugin !== false && process.env.TAIYI_FORGE_SKIP_OPENCODE_CONFIG !== "1") {
    results.push(addPluginToConfigFile(pickOpencodeConfigPath(opts.cwd ?? process.cwd())));
  }

  if (opts.opencodeNpmSpec) {
    const npmResult = await npmInstallOpencode(opts.opencodeNpmSpec, resolvedRoot);
    results.push(npmResult);
  }

  for (const r of results) {
    if (r.action === "failed") {
      log(silent, `[${PLUGIN_NAME}] ✗ ${r.target} ${r.path}: ${r.detail ?? r.action}`);
    } else {
      log(silent, `[${PLUGIN_NAME}] ✓ ${r.target} ${r.path} (${r.detail ?? r.action})`);
    }
  }

  if (!silent) {
    console.log(`
[${PLUGIN_NAME}] 三端就绪：
  OpenCode  → opencode.json: "plugin": ["${PLUGIN_NAME}"]
  Claude    → ${dirs.claude}/taiyi-*
  Codex     → ${dirs.codex}/taiyi-* + AGENTS.md 段落

重启 OpenCode 后使用 taiyi_init / taiyi_status 等工具。
`);
  }

  return results;
}

async function npmInstallOpencode(spec: string, pkgRoot: string): Promise<InstallResult> {
  const dir = opencodeConfigDir();
  const pkgJson = path.join(dir, "package.json");
  try {
    fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(pkgJson)) {
      fs.writeFileSync(pkgJson, JSON.stringify({ name: "opencode-config", private: true }, null, 2) + "\n");
    }
    const { spawnSync } = await import("node:child_process");
    const installSpec = spec === "local" ? pkgRoot : spec;
    const proc = spawnSync("npm", ["install", installSpec, "--no-fund", "--no-audit"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (proc.status !== 0) {
      return {
        target: "opencode",
        path: dir,
        action: "failed",
        detail: proc.stderr?.slice(0, 200) || proc.stdout?.slice(0, 200),
      };
    }
    return { target: "opencode", path: dir, action: "updated", detail: `npm install ${installSpec}` };
  } catch (e) {
    return {
      target: "opencode",
      path: dir,
      action: "failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

/** CLI entry for bin/taiyi-forge-install */
export async function runInstallCli(argv: string[]): Promise<number> {
  const scope = argv[0] ?? "--all";
  const base = resolvePackageRoot(import.meta.url);

  switch (scope) {
    case "--opencode":
      await runInstall({
        pkgRoot: base,
        targets: ["opencode"],
        registerPlugin: true,
        opencodeNpmSpec: "local",
      });
      break;
    case "--claude":
      await runInstall({ pkgRoot: base, targets: ["claude"], registerPlugin: false });
      break;
    case "--codex":
      await runInstall({ pkgRoot: base, targets: ["codex"], registerPlugin: false });
      break;
    case "--all":
    default:
      await runInstall({
        pkgRoot: base,
        targets: ["opencode", "claude", "codex"],
        registerPlugin: true,
        opencodeNpmSpec: "local",
      });
      break;
    case "-h":
    case "--help":
      console.log(`Usage: taiyi-forge-install [--all|--opencode|--claude|--codex]

  --all       OpenCode plugin + npm + opencode.json + Claude + Codex (default)
  --opencode  ~/.config/opencode npm install + plugin + skills
  --claude    ~/.claude/skills/taiyi-*
  --codex     ~/.codex/skills/taiyi-* + AGENTS.md

Env:
  TAIYI_FORGE_SKIP_POSTINSTALL=1   skip postinstall
  TAIYI_FORGE_INSTALL=opencode,claude,codex
  TAIYI_FORGE_SKIP_OPENCODE_CONFIG=1
`);
      return 0;
  }
  return 0;
}
