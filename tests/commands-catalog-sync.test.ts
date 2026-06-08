import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROMPTS_DIR = path.join(REPO, "prompts");
const COMMANDS_YAML = path.join(REPO, "docs/taiyi/commands.yaml");

/** 子路由 / 引擎路由 — 不要求出现在 slash_catalog 列表行 */
const PROMPT_ALLOWLIST = new Set([
  "taiyi.md",
  "taiyi-forge.md",
  "taiyi-gstack-review.md",
  "taiyi-gstack-qa.md",
  "taiyi-ci-platform.md",
  "taiyi-ci-prompt.md",
  "taiyi-commit.md",
  "taiyi-ship.md",
  "taiyi-land.md",
  "taiyi-release.md",
  "taiyi-pause.md",
]);

function listPromptFiles(): string[] {
  return fs
    .readdirSync(PROMPTS_DIR)
    .filter((f) => f.startsWith("taiyi") && f.endsWith(".md"))
    .sort();
}

/** 只从 YAML 列表行 / chat: 字段提取斜杠，避免 description 里的中文 prose */
function collectCatalogSlashes(yaml: string): string[] {
  const slashes: string[] = [];
  for (const line of yaml.split("\n")) {
    const list = line.match(/^\s+-\s+(\/taiyi:[^\s#]+(?:\s[^\s#]+)?)\s*$/);
    if (list) {
      slashes.push(list[1].replace(/\s+x\d+$/i, "").trim());
      continue;
    }
    const chat = line.match(/chat:\s+"((?:\\.|[^"\\])*)"/);
    if (chat) {
      slashes.push(chat[1].replace(/\\"/g, '"').replace(/\s+x\d+$/i, "").trim());
    }
  }
  return [...new Set(slashes)];
}

/** slash_catalog 条目 → prompts 基名（无 .md） */
function slashToPromptBasenames(slash: string): string[] {
  const tokenVerb = slash.match(/^\/taiyi:token(?:\s+([a-z]+))?/i);
  if (tokenVerb) {
    const sub = tokenVerb[1];
    if (!sub) return [];
    if (sub.includes("|")) {
      return sub.split("|").map((p) => `taiyi-token-${p.trim()}`);
    }
    return [`taiyi-token-${sub}`];
  }

  const cleaned = slash
    .replace(/\s+x\d+$/i, "")
    .replace(/\s*<[^>]+>/g, "")
    .replace(/\s*\[[^\]]*\]/g, "")
    .replace(/\s*\\".*$/g, "")
    .trim();
  const m = cleaned.match(/^\/taiyi:([\w-]+)(?:\s(.+))?$/);
  if (!m) return [];

  const head = m[1];
  const tail = m[2]?.trim();

  if (!tail) return [`taiyi-${head}`];

  if (tail.includes("|")) {
    const parts = tail.split("|").map((p) => p.trim()).filter(Boolean);
    if (head === "token") return parts.map((p) => `taiyi-token-${p}`);
    if (head === "tdd") return ["taiyi-tdd"];
    return parts.map((p) => `taiyi-${head}-${p}`);
  }

  if (head === "ci" && tail.startsWith("platform")) return ["taiyi-ci-platform"];
  if (head === "ci" && tail.startsWith("prompt")) return ["taiyi-ci-prompt"];
  if (head === "gstack" && tail === "review") return ["taiyi-gstack-review"];
  if (head === "gstack" && tail === "qa") return ["taiyi-gstack-qa"];

  return [`taiyi-${head}`];
}

describe("commands.yaml ↔ prompts 对账", () => {
  const yaml = fs.readFileSync(COMMANDS_YAML, "utf8");
  const prompts = listPromptFiles();
  const promptSet = new Set(prompts);

  it("slash_catalog / engine_slash 每条斜杠均有对应 prompt 文件", () => {
    const slashes = collectCatalogSlashes(yaml);
    expect(slashes.length).toBeGreaterThan(50);

    const missing: string[] = [];
    for (const slash of slashes) {
      for (const base of slashToPromptBasenames(slash)) {
        const file = `${base}.md`;
        if (!promptSet.has(file)) {
          missing.push(`${slash} → ${file}`);
        }
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("每个 prompts/taiyi*.md（除 allowlist）在 commands.yaml 中有引用", () => {
    const unreferenced: string[] = [];
    for (const file of prompts) {
      if (PROMPT_ALLOWLIST.has(file)) continue;
      const stem = file.replace(/\.md$/, "");
      const needle = stem.replace(/^taiyi-/, "");
      const inYaml =
        yaml.includes(stem) ||
        yaml.includes(`/taiyi:${needle}`) ||
        yaml.includes(`$taiyi-${needle}`);
      if (!inYaml) unreferenced.push(file);
    }
    expect(unreferenced, unreferenced.join(", ")).toEqual([]);
  });

  it("prompt 数量与 Cursor commands 安装源一致", () => {
    const taiyiPrompts = prompts.filter((f) => f.startsWith("taiyi-"));
    expect(taiyiPrompts.length).toBeGreaterThanOrEqual(85);
  });
});
