import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncCursorCommands } from "../src/install/sync-cursor-commands.js";
import { syncCodexPrompts } from "../src/install/sync-codex-prompts.js";
import { renderTaiyiPrompt } from "../src/install/prompt-stage-protocol.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROMPTS_SRC = path.join(REPO, "prompts");
const COMMAND_MARKER = "TAIYI-FORGE:CURSOR-COMMAND";

function listTaiyiPrompts(): string[] {
  return fs
    .readdirSync(PROMPTS_SRC)
    .filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"))
    .sort();
}

function expectedCursorBody(name: string): string {
  const raw = fs.readFileSync(path.join(PROMPTS_SRC, name), "utf8");
  const rendered = renderTaiyiPrompt(name, raw, PROMPTS_SRC);
  return `<!-- ${COMMAND_MARKER}:${name} -->\n${rendered}`;
}

function expectedCodexBody(name: string): string {
  const raw = fs.readFileSync(path.join(PROMPTS_SRC, name), "utf8");
  return renderTaiyiPrompt(name, raw, PROMPTS_SRC);
}

/** Cursor commands / Codex prompts 与 prompts/ 源字节级对账（渲染后） */
describe("install prompt parity (Cursor ↔ Codex ↔ prompts/)", () => {
  let tmp: string;
  let cursorDir: string;
  let codexDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-prompt-parity-"));
    cursorDir = path.join(tmp, "cursor", "commands");
    codexDir = path.join(tmp, "codex", "prompts");
    syncCursorCommands(PROMPTS_SRC, cursorDir);
    syncCodexPrompts(PROMPTS_SRC, codexDir);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("syncCursorCommands 写入全部 taiyi-*.md 且内容与 render 一致", () => {
    const prompts = listTaiyiPrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(85);

    const installed = fs.readdirSync(cursorDir).filter((f) => f.startsWith("taiyi-")).sort();
    expect(installed).toEqual(prompts);

    const mismatches: string[] = [];
    for (const name of prompts) {
      const got = fs.readFileSync(path.join(cursorDir, name), "utf8");
      const want = expectedCursorBody(name);
      if (got !== want) mismatches.push(name);
    }
    expect(mismatches, mismatches.join(", ")).toEqual([]);
  });

  it("syncCodexPrompts 写入全部 .md 且 taiyi-* 与 render 一致", () => {
    const allMd = fs.readdirSync(codexDir).filter((f) => f.endsWith(".md")).sort();
    const srcAll = fs.readdirSync(PROMPTS_SRC).filter((f) => f.endsWith(".md")).sort();
    expect(allMd).toEqual(srcAll);

    for (const name of listTaiyiPrompts()) {
      const got = fs.readFileSync(path.join(codexDir, name), "utf8");
      expect(got, name).toBe(expectedCodexBody(name));
    }
  });

  it("抽样 prompt 渲染后无未替换占位符", () => {
    for (const name of ["taiyi-change.md", "taiyi-dev.md", "taiyi-gstack.md", "taiyi-sp.md"]) {
      const body = expectedCodexBody(name);
      expect(body, name).not.toMatch(/\{\{[A-Z_]+\}\}/);
      expect(body.length, name).toBeGreaterThan(80);
    }
  });
});
