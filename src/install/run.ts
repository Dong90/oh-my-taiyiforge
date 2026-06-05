import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installCodexAgents } from "./codex-agents.js";
import { installClaudeControlPlane } from "./claude-control.js";
import { addPluginToConfigFile } from "./opencode-plugin.js";
import {
  claudeConfigDir,
  codexPromptsDir,
  defaultSkillTargets,
  opencodeConfigCandidates,
  opencodeConfigDir,
  skillSourceRoot,
} from "./paths.js";
import { installCursorRules } from "./cursor-rules.js";
import { syncCodexPrompts } from "./sync-codex-prompts.js";
import { syncTaiyiSkills } from "./sync-skills.js";
import type { InstallResult, InstallTarget } from "./types.js";
import { ALL_INSTALL_TARGETS, PLUGIN_NAME } from "./types.js";

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

const TARGET_FLAGS: Record<string, InstallTarget> = {
  "--opencode": "opencode",
  "--claude": "claude",
  "--codex": "codex",
  "--cursor": "cursor",
};

function log(silent: boolean | undefined, msg: string): void {
  if (!silent) console.log(msg);
}

function isInstallTarget(t: string): t is InstallTarget {
  return (ALL_INSTALL_TARGETS as string[]).includes(t);
}

export function parseInstallTargets(env = process.env): InstallTarget[] {
  const raw = env.TAIYI_FORGE_INSTALL?.trim();
  if (!raw) return [...ALL_INSTALL_TARGETS];
  const picked = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(isInstallTarget);
  return picked.length > 0 ? picked : [...ALL_INSTALL_TARGETS];
}

export type ParsedInstallCli = {
  targets: InstallTarget[];
  registerPlugin: boolean;
  opencodeNpmSpec?: string;
  help?: boolean;
};

/** Parse `taiyi-forge-install` argv — supports `--all` or any combination of per-target flags. */
export function parseInstallCli(argv: string[]): ParsedInstallCli {
  if (argv.includes("-h") || argv.includes("--help")) {
    return { targets: [], registerPlugin: false, help: true };
  }

  if (argv.includes("--all") || argv.length === 0) {
    return {
      targets: [...ALL_INSTALL_TARGETS],
      registerPlugin: true,
      opencodeNpmSpec: "local",
    };
  }

  const targets: InstallTarget[] = [];
  for (const arg of argv) {
    const t = TARGET_FLAGS[arg];
    if (t && !targets.includes(t)) targets.push(t);
  }

  if (targets.length === 0) {
    return {
      targets: [...ALL_INSTALL_TARGETS],
      registerPlugin: true,
      opencodeNpmSpec: "local",
    };
  }

  const hasOpencode = targets.includes("opencode");
  return {
    targets,
    registerPlugin: hasOpencode,
    opencodeNpmSpec: hasOpencode ? "local" : undefined,
  };
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

function formatInstallSummary(targets: InstallTarget[], dirs: ReturnType<typeof defaultSkillTargets>): string {
  const lines: string[] = [];
  if (targets.includes("opencode")) {
    lines.push(`  OpenCode  → opencode.json: "plugin": ["${PLUGIN_NAME}"]`);
    lines.push(`  OpenCode  → ${dirs.opencode}/taiyi-*`);
  }
  if (targets.includes("claude")) {
    lines.push(`  Claude    → ${dirs.claude}/taiyi-* + CLAUDE.md 控制面`);
  }
  if (targets.includes("codex")) {
    lines.push(`  Codex     → ${dirs.codex}/taiyi-* + AGENTS.md + $taiyi-forge prompt`);
  }
  if (targets.includes("cursor")) {
    lines.push(`  Cursor    → ${dirs.cursor}/taiyi-*`);
    lines.push(`  Cursor    → ${path.dirname(dirs.cursor)}/rules/taiyiforge.mdc`);
  }
  const footer = targets.includes("opencode")
    ? "\n重启 OpenCode 后使用 taiyi_init / taiyi_status 等工具。"
    : "\n聊天：taiyi-* Skill + 铁三角；引擎：Agent 代跑 taiyi-forge / scripts/taiyi-forge.sh（见 docs/taiyi/invoke.yaml）。";
  return `\n[${PLUGIN_NAME}] 已安装：\n${lines.join("\n")}${footer}\n`;
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
    results.push({ ...syncTaiyiSkills(skillsSrc, dirs.opencode), target: "opencode" });
  }
  if (targets.includes("claude")) {
    results.push({ ...syncTaiyiSkills(skillsSrc, dirs.claude), target: "claude" });
    results.push(installClaudeControlPlane(claudeConfigDir()));
  }
  if (targets.includes("codex")) {
    results.push({ ...syncTaiyiSkills(skillsSrc, dirs.codex), target: "codex" });
    results.push(installCodexAgents(resolvedRoot, path.dirname(dirs.codex)));
    results.push(syncCodexPrompts(path.join(resolvedRoot, "prompts"), codexPromptsDir()));
  }
  if (targets.includes("cursor")) {
    results.push({ ...syncTaiyiSkills(skillsSrc, dirs.cursor), target: "cursor" });
    results.push(installCursorRules(dirs.cursor));
  }

  const wantsOpencodeConfig =
    targets.includes("opencode") &&
    opts.registerPlugin !== false &&
    process.env.TAIYI_FORGE_SKIP_OPENCODE_CONFIG !== "1";
  if (wantsOpencodeConfig) {
    results.push(addPluginToConfigFile(pickOpencodeConfigPath(opts.cwd ?? process.cwd())));
  }

  if (opts.opencodeNpmSpec && targets.includes("opencode")) {
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
    console.log(formatInstallSummary(targets, dirs));
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
  const parsed = parseInstallCli(argv);

  if (parsed.help) {
    console.log(`Usage: taiyi-forge-install [--all] [--opencode] [--claude] [--codex] [--cursor]

  --all                 四端全装（默认，无参数时同 --all）
  --opencode              ~/.config/opencode skills + npm + opencode.json plugin
  --claude                ~/.claude/skills/taiyi-* + CLAUDE.md 控制面
  --codex                 ~/.codex/skills/taiyi-* + AGENTS.md + prompts
  --cursor                ~/.cursor/skills/taiyi-*

组合示例：
  taiyi-forge-install --claude --cursor
  taiyi-forge-install --opencode --cursor

Env:
  TAIYI_FORGE_SKIP_POSTINSTALL=1      跳过 postinstall
  TAIYI_FORGE_INSTALL=claude,cursor   postinstall 仅装指定端（逗号分隔）
  TAIYI_FORGE_SKIP_OPENCODE_CONFIG=1  不写入 opencode.json
  OPENCODE_SKILLS_DIR / CLAUDE_SKILLS_DIR / CODEX_SKILLS_DIR / CURSOR_SKILLS_DIR
`);
    return 0;
  }

  const base = resolvePackageRoot(import.meta.url);
  await runInstall({
    pkgRoot: base,
    targets: parsed.targets,
    registerPlugin: parsed.registerPlugin,
    opencodeNpmSpec: parsed.opencodeNpmSpec,
  });
  return 0;
}
