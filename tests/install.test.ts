import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addPluginToConfigFile } from "../src/install/opencode-plugin.js";
import { mergeCodexAgentsBlock, installCodexAgents } from "../src/install/codex-agents.js";
import { installCodexDeveloperInstructions } from "../src/install/sync-codex-config.js";
import { codexDeveloperInstructions } from "../src/install/control-plane-markdown.js";
import { mergeClaudeControlBlock, claudeControlBlock } from "../src/install/claude-control.js";
import { installCursorMcpConfig } from "../src/install/sync-cursor-mcp.js";
import { installConsumerPackageScripts } from "../src/install/sync-consumer-scripts.js";
import { installCursorPhaseGuardHook } from "../src/install/sync-cursor-hooks.js";
import { installClaudePhaseGuardHook } from "../src/install/sync-claude-hooks.js";
import { installCodexMcpConfig } from "../src/install/sync-user-mcp.js";
import { syncCodexPrompts } from "../src/install/sync-codex-prompts.js";
import { syncTaiyiSkills } from "../src/install/sync-skills.js";
import { parseInstallCli, parseInstallTargets } from "../src/install/run.js";
import { PLUGIN_NAME } from "../src/install/types.js";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(repoRoot, "..");

describe("install", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-install-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("adds plugin to new opencode.json", () => {
    const cfg = path.join(tmp, "opencode.json");
    const r = addPluginToConfigFile(cfg);
    expect(r.action).toBe("created");
    const j = JSON.parse(fs.readFileSync(cfg, "utf8"));
    expect(j.plugin).toContain(PLUGIN_NAME);
  });

  it("skips when plugin already present", () => {
    const cfg = path.join(tmp, "opencode.json");
    fs.writeFileSync(cfg, JSON.stringify({ plugin: [PLUGIN_NAME] }));
    const r = addPluginToConfigFile(cfg);
    expect(r.action).toBe("skipped");
  });

  it("merges codex AGENTS block with markers", () => {
    const agents = path.join(tmp, "AGENTS.md");
    mergeCodexAgentsBlock(agents, "## Taiyi\n\nUse taiyi-change.");
    const raw = fs.readFileSync(agents, "utf8");
    expect(raw).toContain("TAIYI-FORGE:AGENTS:START");
    expect(raw).toContain("taiyi-change");
    mergeCodexAgentsBlock(agents, "## Taiyi v2");
    expect(fs.readFileSync(agents, "utf8")).toContain("Taiyi v2");
    expect(fs.readFileSync(agents, "utf8").match(/TAIYI-FORGE:AGENTS:START/g)?.length).toBe(1);
  });

  it("installCodexAgents appends OMC loop block for Codex", () => {
    const fakePkg = path.join(tmp, "fake-pkg");
    fs.mkdirSync(fakePkg, { recursive: true });
    fs.writeFileSync(path.join(fakePkg, "AGENTS.md"), "# base\n");
    const codexDir = path.join(tmp, "codex");
    fs.mkdirSync(codexDir, { recursive: true });
    const r = installCodexAgents(fakePkg, codexDir);
    expect(r.action).toMatch(/created|updated/);
    const raw = fs.readFileSync(path.join(codexDir, "AGENTS.md"), "utf8");
    expect(raw).toContain("OMC 式模式循环");
    expect(raw).toContain("$taiyi-preflight");
    expect(raw).toContain("codex-keyword-preflight");
  });

  it("installCodexDeveloperInstructions writes $taiyi-preflight to config.toml", () => {
    const configPath = path.join(tmp, "codex", "config.toml");
    const r = installCodexDeveloperInstructions(configPath);
    expect(r.action).toBe("created");
    const raw = fs.readFileSync(configPath, "utf8");
    expect(raw).toContain("developer_instructions");
    expect(raw).toContain("$taiyi-preflight");
    expect(raw).toContain(codexDeveloperInstructions().slice(0, 40));
    const r2 = installCodexDeveloperInstructions(configPath);
    expect(r2.action).toBe("updated");
    expect(raw.match(/TAIYI-FORGE:DEVELOPER-INSTRUCTIONS:START/g)?.length ?? 0).toBe(1);
    expect(fs.readFileSync(configPath, "utf8").match(/TAIYI-FORGE:DEVELOPER-INSTRUCTIONS:START/g)?.length).toBe(1);
  });

  it("installCodexDeveloperInstructions replaces legacy developer_instructions", () => {
    const configPath = path.join(tmp, "codex-legacy", "config.toml");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      'developer_instructions = "old loop"\nmodel = "gpt-4"\n',
      "utf8",
    );
    const r = installCodexDeveloperInstructions(configPath);
    expect(r.action).toBe("updated");
    expect(r.detail).toContain("replaced legacy");
    const raw = fs.readFileSync(configPath, "utf8");
    expect(raw).not.toMatch(/^developer_instructions\s*=\s*"old loop"/m);
    expect(raw).toContain("TAIYI-FORGE:DEVELOPER-INSTRUCTIONS:START");
    expect(raw).toContain('$taiyi-preflight');
    expect(raw).toContain('model = "gpt-4"');
  });

  it("defaults postinstall targets to all four platforms", () => {
    expect(parseInstallTargets({})).toEqual(["opencode", "claude", "codex", "cursor"]);
  });

  it("parses TAIYI_FORGE_INSTALL subset", () => {
    expect(parseInstallTargets({ TAIYI_FORGE_INSTALL: "claude,cursor" })).toEqual([
      "claude",
      "cursor",
    ]);
  });

  it("parseInstallCli supports combined flags", () => {
    const p = parseInstallCli(["--claude", "--cursor"]);
    expect(p.targets).toEqual(["claude", "cursor"]);
    expect(p.registerPlugin).toBe(false);
    expect(p.opencodeNpmSpec).toBeUndefined();
  });

  it("parseInstallCli --all includes cursor and opencode npm", () => {
    const p = parseInstallCli(["--all"]);
    expect(p.targets).toContain("cursor");
    expect(p.registerPlugin).toBe(true);
    expect(p.opencodeNpmSpec).toBe("local");
  });

  it("syncs codex prompts", () => {
    const src = path.join(tmp, "prompts");
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, "taiyi-forge.md"), "# forge");
    const dest = path.join(tmp, "codex-prompts");
    const r = syncCodexPrompts(src, dest);
    expect(r.action).toBe("updated");
    expect(fs.existsSync(path.join(dest, "taiyi-forge.md"))).toBe(true);
  });

  it("merges claude CLAUDE.md control block", () => {
    const claudeMd = path.join(tmp, "CLAUDE.md");
    mergeClaudeControlBlock(claudeMd, claudeControlBlock());
    const raw = fs.readFileSync(claudeMd, "utf8");
    expect(raw).toContain("TAIYI-FORGE:CLAUDE:START");
    expect(raw).toContain("taiyi-forge");
    expect(raw).toContain("/taiyi:handoff");
    expect(raw).toContain("/taiyi:cancel");
    expect(raw).toContain("100% 斜杠");
  });

  it("writes cursor mcp.json template when missing", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), "{}");
    const r = installCursorMcpConfig(tmp, tmp);
    expect(r.action).toBe("created");
    const cfg = JSON.parse(fs.readFileSync(path.join(tmp, ".cursor", "mcp.json"), "utf8"));
    expect(cfg.mcpServers["taiyi-forge"].env.TAIYI_WORKSPACE).toBe("${workspaceFolder}");
  });

  it("skips cursor mcp when taiyi-forge already configured", () => {
    fs.mkdirSync(path.join(tmp, ".cursor"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, ".cursor", "mcp.json"),
      JSON.stringify({ mcpServers: { "taiyi-forge": { command: "node" } } }),
    );
    fs.writeFileSync(path.join(tmp, "package.json"), "{}");
    const r = installCursorMcpConfig(tmp, tmp);
    expect(r.action).toBe("skipped");
  });

  it("merges consumer package.json scripts", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ name: "demo" }));
    const r = installConsumerPackageScripts(tmp);
    expect(r.action).toBe("updated");
    const pkg = JSON.parse(fs.readFileSync(path.join(tmp, "package.json"), "utf8"));
    expect(pkg.scripts["taiyi:doctor"]).toContain("strict-workspace");
  });

  it("adds taiyi.deliveryVerifyCmd when scripts.test exists", () => {
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ scripts: { test: "vitest run" } }),
    );
    const r = installConsumerPackageScripts(tmp);
    expect(r.action).toBe("updated");
    const pkg = JSON.parse(fs.readFileSync(path.join(tmp, "package.json"), "utf8"));
    expect(pkg.taiyi.deliveryVerifyCmd).toBe("npm test");
  });

  it("installs codex global mcp.json template", () => {
    const home = path.join(tmp, "fake-home");
    fs.mkdirSync(path.join(home, ".codex", "prompts"), { recursive: true });
    const prev = process.env.HOME;
    process.env.HOME = home;
    try {
      const r = installCodexMcpConfig();
      expect(r.action).toBe("created");
      expect(fs.existsSync(path.join(home, ".codex", "mcp.json"))).toBe(true);
    } finally {
      process.env.HOME = prev;
    }
  });

  it("syncs taiyi-* skill folders", () => {
    const src = path.join(tmp, "skills");
    fs.mkdirSync(path.join(src, "taiyi-demo"), { recursive: true });
    fs.writeFileSync(path.join(src, "taiyi-demo", "SKILL.md"), "# demo");
    const dest = path.join(tmp, "out-skills");
    const r = syncTaiyiSkills(src, dest);
    expect(r.action).toBe("updated");
    expect(fs.existsSync(path.join(dest, "taiyi-demo", "SKILL.md"))).toBe(true);
  });

  it("installs cursor hooks (phase guard + keyword + mode stop)", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), "{}");
    const r = installCursorPhaseGuardHook(tmp, pkgRoot);
    expect(r.action).toBe("updated");
    expect(fs.existsSync(path.join(tmp, ".cursor", "hooks", "taiyi-phase-guard.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".cursor", "hooks", "phase-guard-lib.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".cursor", "hooks", "taiyi-keyword.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".cursor", "hooks", "taiyi-mode-stop.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".cursor", "hooks", "keyword-modes-lib.mjs"))).toBe(true);
    const hooks = JSON.parse(fs.readFileSync(path.join(tmp, ".cursor", "hooks.json"), "utf8"));
    expect(hooks.hooks.beforeSubmitPrompt?.some((h: { command?: string }) =>
      h.command?.includes("taiyi-keyword"),
    )).toBe(true);
    expect(hooks.hooks.stop?.some((h: { command?: string }) =>
      h.command?.includes("taiyi-mode-stop"),
    )).toBe(true);
  });

  it("installs claude hooks (phase guard + keyword + mode stop)", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), "{}");
    const r = installClaudePhaseGuardHook(tmp, pkgRoot);
    expect(r.action).toBe("updated");
    expect(fs.existsSync(path.join(tmp, ".claude", "hooks", "taiyi-phase-guard.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".claude", "hooks", "taiyi-keyword.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".claude", "hooks", "taiyi-mode-stop.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".claude", "hooks", "keyword-modes-lib.mjs"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".claude", "hooks", "mode-stop-lib.mjs"))).toBe(true);
    const settings = JSON.parse(fs.readFileSync(path.join(tmp, ".claude", "settings.json"), "utf8"));
    expect(settings.hooks.UserPromptSubmit?.some((g: { hooks?: { command?: string }[] }) =>
      g.hooks?.some((h) => h.command?.includes("taiyi-keyword")),
    )).toBe(true);
    expect(settings.hooks.Stop?.some((g: { hooks?: { command?: string }[] }) =>
      g.hooks?.some((h) => h.command?.includes("taiyi-mode-stop")),
    )).toBe(true);
  });
});
