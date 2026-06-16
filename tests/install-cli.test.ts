import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL_CLI = path.join(REPO, "dist/cli/install-cli.js");

describe("taiyi-forge-install CLI", () => {
  let tmp: string;
  let fakeHome: string;
  let prevEnv: Record<string, string | undefined>;

  beforeEach(() => {
    if (!fs.existsSync(INSTALL_CLI)) {
      spawnSync("npm", ["run", "build"], { cwd: REPO, stdio: "pipe" });
    }
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-install-cli-"));
    fakeHome = path.join(tmp, "home");
    fs.mkdirSync(fakeHome, { recursive: true });
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ name: "install-cli-smoke" }));

    prevEnv = {
      HOME: process.env.HOME,
      OPENCODE_SKILLS_DIR: process.env.OPENCODE_SKILLS_DIR,
      OPENCODE_COMMANDS_DIR: process.env.OPENCODE_COMMANDS_DIR,
      CLAUDE_SKILLS_DIR: process.env.CLAUDE_SKILLS_DIR,
      CLAUDE_COMMANDS_DIR: process.env.CLAUDE_COMMANDS_DIR,
      CODEX_SKILLS_DIR: process.env.CODEX_SKILLS_DIR,
      CODEX_PROMPTS_DIR: process.env.CODEX_PROMPTS_DIR,
      CURSOR_SKILLS_DIR: process.env.CURSOR_SKILLS_DIR,
      CURSOR_COMMANDS_DIR: process.env.CURSOR_COMMANDS_DIR,
      TAIYI_FORGE_SKIP_OPENCODE_CONFIG: process.env.TAIYI_FORGE_SKIP_OPENCODE_CONFIG,
      TAIYI_FORGE_SKIP_PROJECT_WRAPPER: process.env.TAIYI_FORGE_SKIP_PROJECT_WRAPPER,
    };

    process.env.HOME = fakeHome;
    process.env.OPENCODE_SKILLS_DIR = path.join(fakeHome, ".config/opencode/skills");
    process.env.OPENCODE_COMMANDS_DIR = path.join(fakeHome, ".config/opencode/commands");
    process.env.CLAUDE_SKILLS_DIR = path.join(fakeHome, ".claude/skills");
    process.env.CLAUDE_COMMANDS_DIR = path.join(fakeHome, ".claude/commands");
    process.env.CODEX_SKILLS_DIR = path.join(fakeHome, ".codex/skills");
    process.env.CODEX_PROMPTS_DIR = path.join(fakeHome, ".codex/prompts");
    process.env.CURSOR_SKILLS_DIR = path.join(fakeHome, ".cursor/skills");
    process.env.CURSOR_COMMANDS_DIR = path.join(fakeHome, ".cursor/commands");
    process.env.TAIYI_FORGE_SKIP_OPENCODE_CONFIG = "1";
    process.env.TAIYI_FORGE_SKIP_PROJECT_WRAPPER = "1";
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("--claude --codex --cursor --skip-deps 写入 skills + chat commands", () => {
    const r = spawnSync(
      "node",
      [INSTALL_CLI, "--claude", "--codex", "--cursor", "--skip-deps"],
      { cwd: tmp, encoding: "utf8", env: { ...process.env, TAIYI_FORGE_ALL_PROMPTS: "1" } },
    );
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);

    for (const [skillsDir, commandsDir] of [
      [process.env.CLAUDE_SKILLS_DIR!, process.env.CLAUDE_COMMANDS_DIR!],
      [process.env.CODEX_SKILLS_DIR!, process.env.CODEX_PROMPTS_DIR!],
      [process.env.CURSOR_SKILLS_DIR!, process.env.CURSOR_COMMANDS_DIR!],
    ]) {
      expect(fs.existsSync(path.join(skillsDir, "taiyi-forge", "SKILL.md"))).toBe(true);
      const cmds = fs
        .readdirSync(commandsDir)
        .filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"));
      expect(cmds.length).toBeGreaterThan(70);
    }
  }, 60_000);

  it("--cursor --skip-deps 子进程 exit 0 且写入 skills + commands", () => {
    const r = spawnSync(
      "node",
      [INSTALL_CLI, "--cursor", "--skip-deps"],
      { cwd: tmp, encoding: "utf8", env: { ...process.env, TAIYI_FORGE_ALL_PROMPTS: "1" } },
    );
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    expect(fs.existsSync(path.join(process.env.CURSOR_SKILLS_DIR!, "taiyi-forge", "SKILL.md"))).toBe(
      true,
    );
    const cmds = fs
      .readdirSync(process.env.CURSOR_COMMANDS_DIR!)
      .filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"));
    expect(cmds.length).toBeGreaterThan(70);
    expect(fs.existsSync(path.join(tmp, ".cursor", "hooks.json"))).toBe(true);
  }, 60_000);

  it("--help exit 0", () => {
    const r = spawnSync("node", [INSTALL_CLI, "--help"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("--cursor");
    expect(r.stdout).toContain("--skip-deps");
  });
});
