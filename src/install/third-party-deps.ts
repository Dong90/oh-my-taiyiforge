import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { homeDir } from "./paths.js";
import { addPluginEntryToConfigFile } from "./opencode-plugin.js";
import { opencodeConfigCandidates } from "./paths.js";
import type { InstallResult, InstallTarget } from "./types.js";
import { ProviderRegistry } from "../config/providers.js";

export const GSTACK_REPO = "https://github.com/garrytan/gstack.git";
export const SUPERPOWERS_GIT_PLUGIN = "superpowers@git+https://github.com/obra/superpowers.git";
export const SUPERPOWERS_REPO = "https://github.com/obra/superpowers.git";
export const OPENSPEC_PKG = "@fission-ai/openspec@latest";
export const WEB_QUALITY_SKILLS_REPO = "addyosmani/web-quality-skills";

export type ThirdPartyDepId = "openspec" | "gstack" | "superpowers" | "web-quality-skills";

export type DepDetectResult = {
  id: ThirdPartyDepId;
  installed: boolean;
  detail: string;
};

export function shouldInstallDeps(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.TAIYI_FORGE_SKIP_DEPS === "1") return false;
  if (env.CI === "true" || env.CI === "1") return false;
  if (env.TAIYI_FORGE_INSTALL_DEPS === "0") return false;
  return true;
}

export function commandExists(bin: string): boolean {
  const proc = spawnSync(process.platform === "win32" ? "where" : "which", [bin], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return proc.status === 0;
}

function run(cmd: string, args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): {
  ok: boolean;
  stdout: string;
  stderr: string;
} {
  const proc = spawnSync(cmd, args, {
    cwd: opts.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: opts.timeoutMs ?? 600_000,
    shell: process.platform === "win32",
  });
  return {
    ok: proc.status === 0 && !proc.error,
    stdout: (proc.stdout ?? "").trim(),
    stderr: (proc.stderr ?? "").trim(),
  };
}

export function gstackCandidatePaths(home = homeDir()): string[] {
  return [
    path.join(home, ".claude", "skills", "gstack"),
    path.join(home, ".gstack", "repos", "gstack"),
    path.join(home, ".cursor", "skills", "gstack"),
    path.join(home, ".codex", "skills", "gstack"),
    path.join(home, ".agents", "skills", "gstack"),
  ];
}

export function findGstackDir(home = homeDir()): string | null {
  for (const dir of gstackCandidatePaths(home)) {
    if (fs.existsSync(path.join(dir, "setup"))) return dir;
  }
  return null;
}

export function detectOpenspec(): DepDetectResult {
  if (!commandExists("openspec")) {
    return { id: "openspec", installed: false, detail: "openspec CLI not in PATH" };
  }
  const ver = run("openspec", ["--version"]);
  return {
    id: "openspec",
    installed: true,
    detail: ver.stdout || "openspec available",
  };
}

export function detectGstack(home = homeDir()): DepDetectResult {
  const dir = findGstackDir(home);
  if (!dir) {
    return { id: "gstack", installed: false, detail: "gstack setup not found" };
  }
  return { id: "gstack", installed: true, detail: dir };
}

function superpowersCursorInstalled(home = homeDir()): boolean {
  const plugins = path.join(home, ".cursor", "plugins", "cache", "cursor-public", "superpowers");
  if (fs.existsSync(plugins)) return true;
  const skillRoot = path.join(home, ".cursor", "skills", "superpowers");
  if (fs.existsSync(path.join(skillRoot, "brainstorming", "SKILL.md"))) return true;
  if (fs.existsSync(path.join(skillRoot, "SKILL.md"))) return true;
  return false;
}

function superpowersCodexInstalled(home = homeDir()): boolean {
  const agents = path.join(home, ".agents", "skills", "superpowers");
  if (fs.existsSync(agents)) return true;
  const codex = path.join(home, ".codex", "superpowers", "skills");
  return fs.existsSync(codex);
}

function superpowersClaudeInstalled(home = homeDir()): boolean {
  const claudeSkills = path.join(home, ".claude", "skills", "superpowers");
  if (fs.existsSync(claudeSkills)) return true;
  const plugins = path.join(home, ".claude", "plugins", "superpowers");
  return fs.existsSync(plugins);
}

export function detectSuperpowers(targets: InstallTarget[], home = homeDir()): DepDetectResult {
  const parts: string[] = [];
  let ok = false;

  if (targets.includes("cursor") && superpowersCursorInstalled(home)) {
    ok = true;
    parts.push("cursor");
  }
  if (targets.includes("codex") && superpowersCodexInstalled(home)) {
    ok = true;
    parts.push("codex");
  }
  if (targets.includes("claude") && superpowersClaudeInstalled(home)) {
    ok = true;
    parts.push("claude");
  }
  if (targets.includes("opencode")) {
    for (const cfg of opencodeConfigCandidates()) {
      if (!fs.existsSync(cfg)) continue;
      try {
        const j = JSON.parse(fs.readFileSync(cfg, "utf8")) as { plugin?: string[] };
        if (j.plugin?.some((p) => p.includes("superpowers"))) {
          ok = true;
          parts.push(`opencode(${path.basename(cfg)})`);
          break;
        }
      } catch {
        /* ignore */
      }
    }
  }

  if (ok) {
    return { id: "superpowers", installed: true, detail: parts.join(", ") || "detected" };
  }
  return { id: "superpowers", installed: false, detail: "not detected for selected platforms" };
}

const WEB_QUALITY_MARKERS = ["accessibility", "web-design-guidelines", "core-web-vitals"];

export function detectWebQualitySkills(home = homeDir()): DepDetectResult {
  const roots = [
    path.join(home, ".agents", "skills"),
    path.join(home, ".cursor", "skills"),
    path.join(home, ".claude", "skills"),
    path.join(home, ".codex", "skills"),
  ];
  const found: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const name of WEB_QUALITY_MARKERS) {
      if (fs.existsSync(path.join(root, name, "SKILL.md"))) found.push(`${name}@${root}`);
    }
  }
  if (found.length >= 2) {
    return { id: "web-quality-skills", installed: true, detail: found.slice(0, 3).join("; ") };
  }
  return {
    id: "web-quality-skills",
    installed: false,
    detail: found.length ? `partial: ${found.join(", ")}` : "web-quality skills not found",
  };
}

export function detectThirdPartyDeps(
  targets: InstallTarget[],
  home = homeDir(),
): DepDetectResult[] {
  return [
    detectOpenspec(),
    detectGstack(home),
    detectSuperpowers(targets, home),
    detectWebQualitySkills(home),
  ];
}

function ensureBun(): { ok: boolean; detail: string } {
  if (commandExists("bun")) return { ok: true, detail: "bun present" };
  const viaNpm = run("npm", ["install", "-g", "bun", "--no-fund", "--no-audit"]);
  if (viaNpm.ok && commandExists("bun")) {
    return { ok: true, detail: "installed bun via npm" };
  }
  return {
    ok: false,
    detail: "bun required for gstack (https://bun.sh). Install bun and re-run taiyi-forge-install",
  };
}

export function gstackSetupHostArgs(installDir: string, targets: InstallTarget[]): string[] {
  if (!fs.existsSync(installDir)) return ["--host", "auto"];
  const setup = fs.readFileSync(path.join(installDir, "setup"), "utf8");
  const supportsCursor = /cursor/.test(setup) && /--host.*cursor|"cursor"/.test(setup);
  const wantsCodex = targets.includes("codex");
  const wantsCursor = targets.includes("cursor");
  const wantsClaude = targets.includes("claude") || targets.includes("opencode");

  if (wantsCursor && supportsCursor && !wantsCodex && !wantsClaude) {
    return ["--host", "cursor"];
  }
  if (wantsCodex && !wantsClaude && !wantsCursor) {
    return ["--host", "codex"];
  }
  if (wantsClaude && !wantsCodex && !wantsCursor) {
    return ["--host", "claude"];
  }
  return ["--host", "auto"];
}

function installOpenspecCli(): InstallResult {
  const before = detectOpenspec();
  if (before.installed) {
    return {
      target: "openspec",
      path: "PATH",
      action: "skipped",
      detail: before.detail,
    };
  }
  if (!commandExists("npm")) {
    return {
      target: "openspec",
      path: OPENSPEC_PKG,
      action: "failed",
      detail: "npm not found",
    };
  }
  const proc = run("npm", ["install", "-g", OPENSPEC_PKG, "--no-fund", "--no-audit"]);
  const after = detectOpenspec();
  if (after.installed) {
    return {
      target: "openspec",
      path: "global",
      action: "created",
      detail: after.detail,
    };
  }
  return {
    target: "openspec",
    path: OPENSPEC_PKG,
    action: "failed",
    detail: proc.stderr.slice(0, 240) || proc.stdout.slice(0, 240) || "npm install failed",
  };
}

function installGstack(targets: InstallTarget[], home = homeDir()): InstallResult {
  const existing = findGstackDir(home);
  const installDir = existing ?? path.join(home, ".claude", "skills", "gstack");

  if (!existing) {
    if (!commandExists("git")) {
      return {
        target: "gstack",
        path: installDir,
        action: "failed",
        detail: "git not found",
      };
    }
    fs.mkdirSync(path.dirname(installDir), { recursive: true });
    const clone = run("git", [
      "clone",
      "--single-branch",
      "--depth",
      "1",
      GSTACK_REPO,
      installDir,
    ]);
    if (!clone.ok) {
      return {
        target: "gstack",
        path: installDir,
        action: "failed",
        detail: clone.stderr.slice(0, 240) || "git clone failed",
      };
    }
  }

  const bun = ensureBun();
  if (!bun.ok) {
    return { target: "gstack", path: installDir, action: "failed", detail: bun.detail };
  }

  const hostArgs = gstackSetupHostArgs(installDir, targets);
  const setup = run("bash", ["./setup", ...hostArgs, "--no-team"], {
    cwd: installDir,
    timeoutMs: 900_000,
  });
  if (!setup.ok) {
    return {
      target: "gstack",
      path: installDir,
      action: "failed",
      detail: setup.stderr.slice(0, 240) || setup.stdout.slice(0, 240) || "./setup failed",
    };
  }

  return {
    target: "gstack",
    path: installDir,
    action: existing ? "updated" : "created",
    detail: `setup ${hostArgs.join(" ")}`,
  };
}

function installSuperpowersForTargets(targets: InstallTarget[], home = homeDir()): InstallResult {
  const actions: string[] = [];
  let anyFailed = false;
  let anyChanged = false;

  if (targets.includes("opencode")) {
    const cfg = opencodeConfigCandidates().find((p) => fs.existsSync(p))
      ?? path.join(home, ".config", "opencode", "opencode.json");
    const r = addPluginEntryToConfigFile(cfg, SUPERPOWERS_GIT_PLUGIN, "superpowers");
    if (r.action === "failed") anyFailed = true;
    else if (r.action !== "skipped") anyChanged = true;
    actions.push(`opencode:${r.action}`);
  }

  if (targets.includes("codex") && !superpowersCodexInstalled(home)) {
    const repoDir = path.join(home, ".codex", "superpowers");
    if (!fs.existsSync(path.join(repoDir, "skills"))) {
      if (!commandExists("git")) {
        anyFailed = true;
        actions.push("codex:git-missing");
      } else {
        fs.mkdirSync(path.dirname(repoDir), { recursive: true });
        const clone = run("git", ["clone", "--depth", "1", SUPERPOWERS_REPO, repoDir]);
        if (!clone.ok) {
          anyFailed = true;
          actions.push(`codex:clone-failed`);
        } else {
          anyChanged = true;
          actions.push("codex:cloned");
        }
      }
    }
    const agentsSkills = path.join(home, ".agents", "skills");
    const link = path.join(agentsSkills, "superpowers");
    fs.mkdirSync(agentsSkills, { recursive: true });
    try {
      if (fs.existsSync(link)) fs.rmSync(link, { recursive: true, force: true });
      fs.symlinkSync(path.join(repoDir, "skills"), link, "dir");
      anyChanged = true;
      actions.push("codex:symlink");
    } catch (e) {
      anyFailed = true;
      actions.push(`codex:symlink-failed:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (targets.includes("cursor") && !superpowersCursorInstalled(home)) {
    if (commandExists("npx")) {
      const skills = run("npx", [
        "skills",
        "add",
        SUPERPOWERS_REPO,
        "-g",
        "-y",
        "-a",
        "cursor",
      ]);
      if (skills.ok && superpowersCursorInstalled(home)) {
        anyChanged = true;
        actions.push("cursor:npx-skills");
      } else {
        actions.push("cursor:manual-marketplace");
      }
    } else {
      actions.push("cursor:manual-marketplace");
    }
  }

  if (targets.includes("claude") && !superpowersClaudeInstalled(home)) {
    actions.push("claude:manual-plugin");
  }

  const after = detectSuperpowers(targets, home);
  if (anyFailed) {
    return {
      target: "superpowers",
      path: SUPERPOWERS_REPO,
      action: "failed",
      detail: actions.join("; "),
    };
  }
  if (!after.installed && actions.some((a) => a.includes("manual"))) {
    return {
      target: "superpowers",
      path: SUPERPOWERS_REPO,
      action: "skipped",
      detail: `${actions.join("; ")} — Cursor/Claude: install Superpowers from marketplace if needed`,
    };
  }
  return {
    target: "superpowers",
    path: SUPERPOWERS_REPO,
    action: anyChanged ? "updated" : "skipped",
    detail: after.installed ? after.detail : actions.join("; ") || after.detail,
  };
}

function skillsAgentsForTargets(targets: InstallTarget[]): string[] {
  const agents: string[] = [];
  if (targets.includes("cursor")) agents.push("cursor");
  if (targets.includes("codex")) agents.push("codex");
  if (targets.includes("claude")) agents.push("claude-code");
  if (targets.includes("opencode")) agents.push("opencode");
  return agents;
}

function installWebQualitySkills(targets: InstallTarget[]): InstallResult {
  const before = detectWebQualitySkills();
  if (before.installed) {
    return {
      target: "web-quality-skills",
      path: WEB_QUALITY_SKILLS_REPO,
      action: "skipped",
      detail: before.detail,
    };
  }
  if (!commandExists("npx")) {
    return {
      target: "web-quality-skills",
      path: WEB_QUALITY_SKILLS_REPO,
      action: "failed",
      detail: "npx not found",
    };
  }

  const agents = skillsAgentsForTargets(targets);
  const args = ["skills", "add", WEB_QUALITY_SKILLS_REPO, "-g", "-y"];
  for (const a of agents) {
    args.push("-a", a);
  }
  if (agents.length === 0) args.push("--all");

  const proc = run("npx", args);
  const after = detectWebQualitySkills();
  if (after.installed) {
    return {
      target: "web-quality-skills",
      path: WEB_QUALITY_SKILLS_REPO,
      action: "created",
      detail: after.detail,
    };
  }
  return {
    target: "web-quality-skills",
    path: WEB_QUALITY_SKILLS_REPO,
    action: proc.ok ? "skipped" : "failed",
    detail: proc.stderr.slice(0, 200) || proc.stdout.slice(0, 200) || after.detail,
  };
}

/**
 * 安装后检测 provider 可用性，写入 .taiyi/providers.yaml。
 * 自动创建 .taiyi/ 目录（如果不存在）。
 */
export function writeDetectedProviderConfig(
  workspaceDir: string,
  targets: InstallTarget[],
  home = homeDir(),
): { ok: boolean; path: string; detail: string } {
  const taiyiDir = path.join(path.resolve(workspaceDir), ".taiyi");
  const configPath = path.join(taiyiDir, "providers.yaml");

  fs.mkdirSync(taiyiDir, { recursive: true });

  const results = detectThirdPartyDeps(targets, home);

  const lines: string[] = [
    "version: 1",
    "",
    "# 安装时自动检测到的 Provider assignment（仅供查阅）",
    "# 如需覆盖某能力的 provider，修改下方 assignment 后保存即可生效",
    "# 未列出的能力使用内置默认",
    "",
    "assignments:",
  ];

  const installed: Record<string, boolean> = {};
  for (const r of results) installed[r.id] = r.installed;

  if (installed.openspec) {
    lines.push("  spec_archive: openspec");
    lines.push("  spec_sync: openspec");
  }
  if (installed.gstack) {
    lines.push("  browser_qa: gstack");
    lines.push("  eng_review: gstack");
    lines.push("  design_review: gstack");
    lines.push("  code_review: gstack");
    lines.push("  doc_release: gstack");
  }
  if (installed.superpowers) {
    lines.push("  process_skills: superpowers");
  }
  if (installed["web-quality-skills"]) {
    lines.push("  accessibility: web-quality");
    lines.push("  design_guidelines: web-quality");
  }

  // 注释 header 告知用户：运行时 providers 定义和 defaults 来自引擎内置，
  // 不写入 providers 段（auto-gen 格式无法被 parseSimpleYaml 回读）。
  lines.push("", "# Provider 定义和默认分配见引擎内置 (src/config/providers.ts) 或插件的 package.json");

  fs.writeFileSync(configPath, lines.join("\n") + "\n");

  const count = results.filter((r) => r.installed).length;
  return {
    ok: true,
    path: configPath,
    detail: `检测到 ${count}/${results.length} 个 provider 已安装；配置写入 ${configPath}`,
  };
}

/**
 * 重新检测已安装的 provider，写入 .taiyi/providers.yaml，刷新 ProviderRegistry 缓存。
 *
 * 典型调用场景：
 * - 安装后（installThirdPartyDeps 内部自动调用）
 * - doctor 时重新检测
 * - 用户手动触发 sync（/taiyi:doctor 或 CLI taiyi-forge-install --rescan）
 */
export function syncProviders(
  workspaceDir: string,
  targets: InstallTarget[],
  home = homeDir(),
): { ok: boolean; registry: ProviderRegistry; detail: string } {
  const result = writeDetectedProviderConfig(workspaceDir, targets, home);
  const registry = ProviderRegistry.forProjectFresh(workspaceDir);
  return { ok: result.ok, registry, detail: result.detail };
}

export type InstallThirdPartyOptions = {
  targets: InstallTarget[];
  home?: string;
  silent?: boolean;
  /** 如果提供 workspace 路径，安装完成后写入 .taiyi/providers.yaml */
  workspaceDir?: string;
};

export function installThirdPartyDeps(opts: InstallThirdPartyOptions): InstallResult[] {
  const home = opts.home ?? homeDir();
  const results: InstallResult[] = [];

  results.push(installOpenspecCli());
  results.push(installGstack(opts.targets, home));
  results.push(installSuperpowersForTargets(opts.targets, home));
  results.push(installWebQualitySkills(opts.targets));

  if (!opts.silent) {
    for (const r of results) {
      const mark = r.action === "failed" ? "✗" : "✓";
      console.log(`[oh-my-taiyiforge] ${mark} deps/${r.target}: ${r.action} — ${r.detail ?? r.path}`);
      void mark;
    }
  }

  if (opts.workspaceDir) {
    const providerResult = syncProviders(opts.workspaceDir, opts.targets, home);
    if (!opts.silent) {
      console.log(`[oh-my-taiyiforge] ✓ providers: ${providerResult.detail}`);
    }
  }

  return results;
}
