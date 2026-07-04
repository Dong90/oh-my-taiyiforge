import fs from "node:fs";
import path from "node:path";
import { resolvePackageRoot } from "../core/package-root.js";
import { installCodexAgents } from "./codex-agents.js";
import { installClaudeControlPlane } from "./claude-control.js";
import { addPluginToConfigFile } from "./opencode-plugin.js";
import {
  claudeConfigDir,
  codexConfigPath,
  defaultSkillTargets,
  opencodeConfigCandidates,
  opencodeConfigDir,
  skillSourceRoot,
} from "./paths.js";
import { installCursorRules } from "./cursor-rules.js";
import { installThirdPartyDeps, shouldInstallDeps } from "./third-party-deps.js";
import { syncCodexPrompts, defaultCodexPromptsDir } from "./sync-codex-prompts.js";
import { installCodexDeveloperInstructions } from "./sync-codex-config.js";
import { syncClaudeCommands, defaultClaudeCommandsDir } from "./sync-claude-commands.js";
import { syncOpenCodeCommands, defaultOpenCodeCommandsDir } from "./sync-opencode-commands.js";
import { defaultCursorCommandsDir, syncCursorCommands } from "./sync-cursor-commands.js";
import { installCursorPhaseGuardHook } from "./sync-cursor-hooks.js";
import { installClaudePhaseGuardHook } from "./sync-claude-hooks.js";
import { installCursorMcpConfig } from "./sync-cursor-mcp.js";
import { installCodexMcpConfig, installClaudeMcpConfig } from "./sync-user-mcp.js";
import { installConsumerPackageScripts } from "./sync-consumer-scripts.js";
import { syncTaiyiSkills } from "./sync-skills.js";
import { installProjectWrapper } from "./sync-project-wrapper.js";
import type { InstallResult, InstallTarget } from "./types.js";
import { ALL_INSTALL_TARGETS, PLUGIN_NAME } from "./types.js";

export type RunInstallOptions = {
  pkgRoot?: string;
  targets?: InstallTarget[];
  /** Write plugin entry to opencode.json */
  registerPlugin?: boolean;
  /** npm install this package into ~/.config/opencode (local path or registry name) */
  opencodeNpmSpec?: string;
  /** Install OpenSpec / Superpowers / web-quality-skills / ECC (default true; CI skips) */
  installDeps?: boolean;
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
  installDeps: boolean;
  help?: boolean;
};

/** Parse `taiyi-forge-install` argv — supports `--all` or any combination of per-target flags. */
export function parseInstallCli(argv: string[]): ParsedInstallCli {
  if (argv.includes("-h") || argv.includes("--help")) {
    return { targets: [], registerPlugin: false, installDeps: true, help: true };
  }

  const skipDeps = argv.includes("--skip-deps");
  const installDeps = !skipDeps;

  if (argv.includes("--all") || argv.length === 0) {
    return {
      targets: [...ALL_INSTALL_TARGETS],
      registerPlugin: true,
      opencodeNpmSpec: "local",
      installDeps,
    };
  }

  const targets: InstallTarget[] = [];
  const unknownArgs: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const t = TARGET_FLAGS[arg];
      if (t) {
        if (!targets.includes(t)) targets.push(t);
      } else if (
        arg !== "--all" &&
        arg !== "--skip-deps" &&
        arg !== "--manifest" &&
        arg !== "--help" &&
        arg !== "-h"
      ) {
        // --manifest <value> 跳过下个参数（值）
        unknownArgs.push(arg);
      } else if (arg === "--manifest") {
        // 跳过 value（被 --manifest flag 消费）
        i++;
      }
    }
  }

  if (unknownArgs.length > 0) {
    const known = Object.keys(TARGET_FLAGS).concat(["--all", "--skip-deps", "--manifest <name>"]).join(", ");
    throw new Error(
      `Unknown argument(s): ${unknownArgs.join(" ")}\n` +
      `Known arguments: ${known}\n` +
      `Run with --help for usage.`,
    );
  }

  if (targets.length === 0) {
    return {
      targets: [...ALL_INSTALL_TARGETS],
      registerPlugin: true,
      opencodeNpmSpec: "local",
      installDeps,
    };
  }

  const hasOpencode = targets.includes("opencode");
  return {
    targets,
    registerPlugin: hasOpencode,
    opencodeNpmSpec: hasOpencode ? "local" : undefined,
    installDeps,
  };
}

export function shouldRunPostinstall(env = process.env): boolean {
  if (env.TAIYI_FORGE_SKIP_POSTINSTALL === "1") return false;
  if (env.CI === "true" || env.CI === "1") return false;
  return true;
}

function pickOpencodeConfigPath(cwd: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const global = path.join(home, ".config", "opencode", "opencode.json");
  // 项目内配置优先（避免污染全局配置）
  const projectConfig = opencodeConfigCandidates(cwd).find((p) => fs.existsSync(p));
  if (projectConfig) return projectConfig;
  return global;
}

function formatInstallSummary(targets: InstallTarget[], dirs: ReturnType<typeof defaultSkillTargets>): string {
  const lines: string[] = [];
  if (targets.includes("opencode")) {
    lines.push(`  OpenCode  → opencode.json: "plugin": ["${PLUGIN_NAME}"]`);
    lines.push(`  OpenCode  → ${dirs.opencode}/taiyi-*`);
    lines.push(`  OpenCode  → ${defaultOpenCodeCommandsDir()}/taiyi-*.md`);
  }
  if (targets.includes("codex")) {
    lines.push(`  Codex     → ${dirs.codex}/taiyi-* + AGENTS.md + config.toml ($taiyi-preflight)`);
    lines.push(`  Codex     → ${defaultCodexPromptsDir()}/taiyi-*.md + ~/.codex/mcp.json`);
  }
  if (targets.includes("claude")) {
    lines.push(`  Claude    → ${dirs.claude}/taiyi-* + CLAUDE.md + ~/.claude/mcp.json + .claude/settings.json hook`);
    lines.push(`  Claude    → ${defaultClaudeCommandsDir()}/taiyi-*.md`);
  }
  if (targets.includes("cursor")) {
    lines.push(`  Cursor    → ${dirs.cursor}/taiyi-*`);
    lines.push(`  Cursor    → ${path.dirname(dirs.cursor)}/rules/taiyiforge.mdc`);
    lines.push(`  Cursor    → ${defaultCursorCommandsDir()}/taiyi-*.md`);
    lines.push(`  Cursor    → .cursor/hooks/taiyi-phase-guard.mjs（消费方项目，dev 前改代码 ask）`);
    lines.push(`  Cursor    → .cursor/mcp.json（taiyi-forge MCP；跳过：TAIYI_FORGE_SKIP_MCP=1）`);
  }
  const footer = targets.includes("opencode")
    ? "\n重启 OpenCode 后使用 taiyi_new / taiyi_init / taiyi_status 等工具。"
    : "\n聊天：taiyi-* Skill + 双线 harness；引擎：Agent 代跑 taiyi-forge / scripts/taiyi-forge.sh（见 docs/taiyi/invoke.yaml）。";
  const depsNote =
    "\n双线 harness 依赖：默认自动安装 OpenSpec CLI、Superpowers（OpenCode/Codex/Cursor）、web-quality-skills、ECC；跳过：--skip-deps 或 TAIYI_FORGE_SKIP_DEPS=1。";
  const scriptsNote =
    "\n消费方项目：package.json 已合并 npm run taiyi:doctor / taiyi:verify（跳过：TAIYI_FORGE_SKIP_PKG_SCRIPTS=1）。";
  return `\n[${PLUGIN_NAME}] 已安装：\n${lines.join("\n")}${footer}${depsNote}${scriptsNote}\n`;
}

export async function runInstall(opts: RunInstallOptions = {}): Promise<InstallResult[]> {
  const pkgRoot = opts.pkgRoot ?? resolvePackageRoot(import.meta.url);
  const resolvedRoot = fs.existsSync(path.join(pkgRoot, "skills")) ? pkgRoot : path.resolve(pkgRoot, "..");
  const skillsSrc = skillSourceRoot(resolvedRoot);
  const targets = opts.targets ?? parseInstallTargets();
  const dirs = defaultSkillTargets();
  const results: InstallResult[] = [];
  const silent = opts.silent;

  const promptsSrc = path.join(resolvedRoot, "prompts");

  if (targets.includes("opencode")) {
    results.push({ ...syncTaiyiSkills(skillsSrc, dirs.opencode), target: "opencode" });
    results.push(syncOpenCodeCommands(promptsSrc, defaultOpenCodeCommandsDir()));
  }
  if (targets.includes("claude")) {
    results.push({ ...syncTaiyiSkills(skillsSrc, dirs.claude), target: "claude" });
    results.push(installClaudeControlPlane(claudeConfigDir()));
    results.push(syncClaudeCommands(promptsSrc, defaultClaudeCommandsDir()));
    results.push(installClaudeMcpConfig());
    results.push(installClaudePhaseGuardHook(opts.cwd ?? process.cwd(), resolvedRoot));
  }
  if (targets.includes("codex")) {
    results.push({ ...syncTaiyiSkills(skillsSrc, dirs.codex), target: "codex" });
    results.push(installCodexAgents(resolvedRoot, path.dirname(dirs.codex)));
    results.push(installCodexDeveloperInstructions(codexConfigPath()));
    results.push(syncCodexPrompts(promptsSrc, defaultCodexPromptsDir()));
    results.push(installCodexMcpConfig());
  }
  if (targets.includes("cursor")) {
    results.push({ ...syncTaiyiSkills(skillsSrc, dirs.cursor), target: "cursor" });
    results.push(installCursorRules(dirs.cursor));
    results.push(syncCursorCommands(promptsSrc, defaultCursorCommandsDir()));
    results.push(installCursorPhaseGuardHook(opts.cwd ?? process.cwd(), resolvedRoot));
    results.push(installCursorMcpConfig(opts.cwd ?? process.cwd(), resolvedRoot));
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

  const wantsDeps = opts.installDeps ?? shouldInstallDeps();
  if (wantsDeps) {
    results.push(...installThirdPartyDeps({
      targets,
      silent,
      workspaceDir: opts.cwd ?? process.cwd(),
    }));
  }

  if (process.env.TAIYI_FORGE_SKIP_PROJECT_WRAPPER !== "1") {
    const cwd = opts.cwd ?? process.cwd();
    results.push(installProjectWrapper(cwd, resolvedRoot));
    results.push(installConsumerPackageScripts(cwd));
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

export function installResultsExitCode(results: InstallResult[]): number {
  return results.some((r) => r.action === "failed") ? 1 : 0;
}

/** CLI entry for bin/taiyi-forge-install */
export async function runInstallCli(argv: string[]): Promise<number> {
  const parsed = parseInstallCli(argv);

  // 处理 --manifest <name> flag（注册式 manifest 选择）
  const manifestIdx = argv.indexOf("--manifest");
  if (manifestIdx >= 0 && argv[manifestIdx + 1]) {
    process.env.TAIYI_WORKFLOW_MANIFEST = argv[manifestIdx + 1];
    log(false, `[oh-my-taiyiforge] using manifest preset: ${argv[manifestIdx + 1]}`);
  }

  if (parsed.help) {
    console.log(`Usage: taiyi-forge-install [--all] [--opencode] [--claude] [--codex] [--cursor]

  --all                 四端全装（默认，无参数时同 --all）
  --opencode              ~/.config/opencode skills + commands/taiyi-* + npm + opencode.json plugin
  --claude                ~/.claude/skills/taiyi-* + commands/taiyi-* + CLAUDE.md 控制面
  --codex                 ~/.codex/skills/taiyi-* + prompts/taiyi-* + AGENTS.md + config.toml
  --cursor                ~/.cursor/skills/taiyi-* + commands/taiyi-*
  --skip-deps             不自动安装 OpenSpec / Superpowers / web-quality-skills / ECC
  --manifest <name>       选择 manifest preset: default | optimized（激进：ECC 强约束）

组合示例：
  taiyi-forge-install --claude --cursor
  taiyi-forge-install --opencode --cursor
  TAIYI_WORKFLOW_MANIFEST=optimized taiyi status foo   # 运行时切换

Env:
  TAIYI_FORGE_SKIP_POSTINSTALL=1      跳过 postinstall
  TAIYI_FORGE_SKIP_DEPS=1             跳过双线 harness 依赖自动安装
  TAIYI_FORGE_INSTALL_DEPS=0          同 SKIP_DEPS
  TAIYI_FORGE_INSTALL=claude,cursor   postinstall 仅装指定端（逗号分隔）
  TAIYI_FORGE_SKIP_OPENCODE_CONFIG=1  不写入 opencode.json
  OPENCODE_SKILLS_DIR / CLAUDE_SKILLS_DIR / CODEX_SKILLS_DIR / CURSOR_SKILLS_DIR
`);
    return 0;
  }

  const base = resolvePackageRoot(import.meta.url);
  const results = await runInstall({
    pkgRoot: base,
    targets: parsed.targets,
    registerPlugin: parsed.registerPlugin,
    opencodeNpmSpec: parsed.opencodeNpmSpec,
    installDeps: parsed.installDeps,
  });
  return installResultsExitCode(results);
}
