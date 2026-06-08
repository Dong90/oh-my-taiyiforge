import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInstall, installResultsExitCode } from "../src/install/run.js";
import { defaultCursorCommandsDir } from "../src/install/sync-cursor-commands.js";
import { defaultCursorRulesPath } from "../src/install/cursor-rules.js";
import { codexPromptsDir, codexConfigPath, claudeConfigDir } from "../src/install/paths.js";
import { skillSourceRoot } from "../src/install/paths.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMAND_MARKER = "TAIYI-FORGE:CURSOR-COMMAND";
const RULE_MARKER = "TAIYI-FORGE:CURSOR-RULE";

function countTaiyiSkills(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("taiyi-")).length;
}

function countTaiyiPrompts(repoRoot: string): number {
  const promptsDir = path.join(repoRoot, "prompts");
  return fs
    .readdirSync(promptsDir)
    .filter((f) => f.startsWith("taiyi-") && f.endsWith(".md")).length;
}

function listSkillIds(repoRoot: string): string[] {
  const src = skillSourceRoot(repoRoot);
  return fs
    .readdirSync(src, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("taiyi-"))
    .map((d) => d.name)
    .sort();
}

/** 四端 install 写入隔离 HOME — 比 install.test.ts 单函数测更接近真机布局 */
describe("post-install smoke (isolated HOME)", () => {
  let tmp: string;
  let fakeHome: string;
  let prevHome: string | undefined;
  let prevEnv: Record<string, string | undefined>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-post-install-"));
    fakeHome = path.join(tmp, "home");
    fs.mkdirSync(fakeHome, { recursive: true });
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ name: "install-smoke" }));

    prevHome = process.env.HOME;
    prevEnv = {
      HOME: process.env.HOME,
      OPENCODE_SKILLS_DIR: process.env.OPENCODE_SKILLS_DIR,
      CLAUDE_SKILLS_DIR: process.env.CLAUDE_SKILLS_DIR,
      CODEX_SKILLS_DIR: process.env.CODEX_SKILLS_DIR,
      CURSOR_SKILLS_DIR: process.env.CURSOR_SKILLS_DIR,
      CURSOR_COMMANDS_DIR: process.env.CURSOR_COMMANDS_DIR,
      CODEX_PROMPTS_DIR: process.env.CODEX_PROMPTS_DIR,
      CODEX_CONFIG_PATH: process.env.CODEX_CONFIG_PATH,
      CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR,
      TAIYI_FORGE_SKIP_OPENCODE_CONFIG: process.env.TAIYI_FORGE_SKIP_OPENCODE_CONFIG,
      TAIYI_FORGE_SKIP_PROJECT_WRAPPER: process.env.TAIYI_FORGE_SKIP_PROJECT_WRAPPER,
    };

    process.env.HOME = fakeHome;
    process.env.OPENCODE_SKILLS_DIR = path.join(fakeHome, ".config/opencode/skills");
    process.env.CLAUDE_SKILLS_DIR = path.join(fakeHome, ".claude/skills");
    process.env.CODEX_SKILLS_DIR = path.join(fakeHome, ".codex/skills");
    process.env.CURSOR_SKILLS_DIR = path.join(fakeHome, ".cursor/skills");
    process.env.CURSOR_COMMANDS_DIR = path.join(fakeHome, ".cursor/commands");
    process.env.CODEX_PROMPTS_DIR = path.join(fakeHome, ".codex/prompts");
    process.env.CODEX_CONFIG_PATH = path.join(fakeHome, ".codex/config.toml");
    process.env.CLAUDE_CONFIG_DIR = path.join(fakeHome, ".claude");
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

  it("runInstall --all 写入四端 skills、Cursor 斜杠、Codex/Claude 控制面", async () => {
    const skillIds = listSkillIds(REPO);
    expect(skillIds.length).toBeGreaterThanOrEqual(16);

    const results = await runInstall({
      pkgRoot: REPO,
      cwd: tmp,
      targets: ["opencode", "claude", "codex", "cursor"],
      registerPlugin: false,
      installDeps: false,
      silent: true,
    });
    expect(installResultsExitCode(results)).toBe(0);

    for (const dir of [
      process.env.OPENCODE_SKILLS_DIR!,
      process.env.CLAUDE_SKILLS_DIR!,
      process.env.CODEX_SKILLS_DIR!,
      process.env.CURSOR_SKILLS_DIR!,
    ]) {
      expect(countTaiyiSkills(dir)).toBe(skillIds.length);
      for (const id of skillIds) {
        const skillMd = path.join(dir, id, "SKILL.md");
        expect(fs.existsSync(skillMd), `${dir}/${id}`).toBe(true);
      }
    }

    const forgeSkill = fs.readFileSync(
      path.join(process.env.CURSOR_SKILLS_DIR!, "taiyi-forge", "SKILL.md"),
      "utf8",
    );
    expect(forgeSkill).toMatch(/taiyi-forge\.sh|scripts\/taiyi-forge/);

    const promptCount = countTaiyiPrompts(REPO);
    const commandsDir = defaultCursorCommandsDir();
    const commandFiles = fs
      .readdirSync(commandsDir)
      .filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"));
    expect(commandFiles.length).toBe(promptCount);
    for (const f of commandFiles) {
      const raw = fs.readFileSync(path.join(commandsDir, f), "utf8");
      expect(raw).toContain(COMMAND_MARKER);
      expect(raw.length).toBeGreaterThan(50);
    }

    const rulesPath = defaultCursorRulesPath();
    expect(fs.existsSync(rulesPath)).toBe(true);
    expect(fs.readFileSync(rulesPath, "utf8")).toContain(RULE_MARKER);

    const codexPrompts = fs
      .readdirSync(codexPromptsDir())
      .filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"));
    expect(codexPrompts.length).toBe(promptCount);

    const codexCfg = fs.readFileSync(codexConfigPath(), "utf8");
    expect(codexCfg).toContain("$taiyi-preflight");

    const claudeMd = fs.readFileSync(path.join(claudeConfigDir(), "CLAUDE.md"), "utf8");
    expect(claudeMd).toContain("TAIYI-FORGE:CLAUDE:START");
    expect(claudeMd).toContain("taiyi-forge");

    expect(fs.existsSync(path.join(tmp, ".cursor", "hooks.json"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".cursor", "mcp.json"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".claude", "settings.json"))).toBe(true);
  }, 60_000);
});

/** 本机已 npx taiyi-forge-install 后可选验收：`TAIYI_VERIFY_REAL_INSTALL=1 npm test -- tests/post-install-smoke.test.ts` */
describe.skipIf(process.env.TAIYI_VERIFY_REAL_INSTALL !== "1")(
  "real install smoke (~/.cursor after user install)",
  () => {
    it("~/.cursor/skills/taiyi-forge 与 commands/taiyi-status.md 存在", () => {
      const home = process.env.HOME || os.homedir();
      const forgeSkill = path.join(home, ".cursor/skills/taiyi-forge/SKILL.md");
      const statusCmd = path.join(home, ".cursor/commands/taiyi-status.md");
      expect(fs.existsSync(forgeSkill)).toBe(true);
      expect(fs.existsSync(statusCmd)).toBe(true);
      expect(fs.readFileSync(statusCmd, "utf8")).toContain(COMMAND_MARKER);
    });
  },
);
