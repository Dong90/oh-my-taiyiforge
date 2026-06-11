import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncClaudeCommands } from "../src/install/sync-claude-commands.js";
import { syncCodexPrompts } from "../src/install/sync-codex-prompts.js";
import { syncCursorCommands } from "../src/install/sync-cursor-commands.js";
import { syncOpenCodeCommands } from "../src/install/sync-opencode-commands.js";
import {
  CHAT_COMMAND_MARKER,
  expectedChatCommandBody,
  syncTaiyiChatCommands,
} from "../src/install/sync-chat-commands.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROMPTS_SRC = path.join(REPO, "prompts");

function listTaiyiPrompts(): string[] {
  return fs
    .readdirSync(PROMPTS_SRC)
    .filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"))
    .sort();
}

const PLATFORM_DIRS = ["cursor", "claude", "codex", "opencode"] as const;

/** 四端 commands/prompts 与 prompts/taiyi-*.md 字节级对账（渲染后） */
describe("install prompt parity (四端 ↔ prompts/taiyi-*.md)", () => {
  let tmp: string;
  const dirs: Record<(typeof PLATFORM_DIRS)[number], string> = {
    cursor: "",
    claude: "",
    codex: "",
    opencode: "",
  };

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-prompt-parity-"));
    dirs.cursor = path.join(tmp, "cursor");
    dirs.claude = path.join(tmp, "claude");
    dirs.codex = path.join(tmp, "codex");
    dirs.opencode = path.join(tmp, "opencode");
    syncCursorCommands(PROMPTS_SRC, dirs.cursor);
    syncClaudeCommands(PROMPTS_SRC, dirs.claude);
    syncCodexPrompts(PROMPTS_SRC, dirs.codex);
    syncOpenCodeCommands(PROMPTS_SRC, dirs.opencode);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  for (const platform of PLATFORM_DIRS) {
    it(`${platform} 写入全部 taiyi-*.md 且与 Cursor 同源`, () => {
      const prompts = listTaiyiPrompts();
      expect(prompts.length).toBeGreaterThanOrEqual(75);

      const installed = fs
        .readdirSync(dirs[platform])
        .filter((f) => f.startsWith("taiyi-"))
        .sort();
      expect(installed).toEqual(prompts);

      const mismatches: string[] = [];
      for (const name of prompts) {
        const got = fs.readFileSync(path.join(dirs[platform], name), "utf8");
        const raw = fs.readFileSync(path.join(PROMPTS_SRC, name), "utf8");
        const want = expectedChatCommandBody(name, raw, PROMPTS_SRC);
        if (got !== want) mismatches.push(name);
        expect(got.startsWith(`<!-- ${CHAT_COMMAND_MARKER}:${name} -->`)).toBe(true);
      }
      expect(mismatches, mismatches.join(", ")).toEqual([]);
    });
  }

  it("四端 taiyi-status.md 内容完全一致", () => {
    const bodies = PLATFORM_DIRS.map((platform) =>
      fs.readFileSync(path.join(dirs[platform], "taiyi-status.md"), "utf8"),
    );
    expect(new Set(bodies).size).toBe(1);
  });

  it("抽样 prompt 渲染后无未替换占位符", () => {
    for (const name of ["taiyi-write.md", "taiyi-gstack.md", "taiyi-sp.md"]) {
      const raw = fs.readFileSync(path.join(PROMPTS_SRC, name), "utf8");
      const body = expectedChatCommandBody(name, raw, PROMPTS_SRC);
      expect(body, name).not.toMatch(/\{\{[A-Z_]+\}\}/);
      expect(body.length, name).toBeGreaterThan(80);
    }
  });

  it("syncTaiyiChatCommands 仅同步 taiyi-*.md（不含 ty.md / taiyi.md）", () => {
    const src = path.join(tmp, "prompts-only-taiyi");
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, "taiyi-forge.md"), "# forge\n");
    fs.writeFileSync(path.join(src, "ty.md"), "# ty\n");
    fs.writeFileSync(path.join(src, "taiyi.md"), "# root\n");
    const dest = path.join(tmp, "filtered");
    syncTaiyiChatCommands(src, dest, "codex");
    expect(fs.readdirSync(dest).sort()).toEqual(["taiyi-forge.md"]);
  });
});
