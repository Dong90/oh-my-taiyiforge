import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addPluginToConfigFile } from "../src/install/opencode-plugin.js";
import { mergeCodexAgentsBlock } from "../src/install/codex-agents.js";
import { mergeClaudeControlBlock, claudeControlBlock } from "../src/install/claude-control.js";
import { syncCodexPrompts } from "../src/install/sync-codex-prompts.js";
import { syncTaiyiSkills } from "../src/install/sync-skills.js";
import { parseInstallCli, parseInstallTargets } from "../src/install/run.js";
import { PLUGIN_NAME } from "../src/install/types.js";

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
});
