import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const promptsDir = path.join(repoRoot, "prompts");

/** v30 顶栏 prompt 文件应对应 /taiyi:* 斜杠 */
const SLASH_PROMPTS: Record<string, string> = {
  "taiyi-new.md": "/taiyi:new",
  "taiyi-status.md": "/taiyi:status",
  "taiyi-continue.md": "/taiyi:continue",
  "taiyi-apply.md": "/taiyi:apply",
  "taiyi-archive.md": "/taiyi:archive",
  "taiyi-cancel.md": "/taiyi:cancel",
  "taiyi-list.md": "/taiyi:list",
  "taiyi-verify.md": "/taiyi:verify",
  "taiyi-render.md": "/taiyi:render",
  "taiyi-commit.md": "/taiyi:commit",
  "taiyi-ship.md": "/taiyi:ship",
  "taiyi-land.md": "/taiyi:land",
  "taiyi-plan.md": "/taiyi:plan",
  "taiyi-skill.md": "/taiyi:skill",
  "taiyi-write.md": "/taiyi:write",
};

describe("slash commands", () => {
  it("every catalogued prompt exists and mentions its slash", () => {
    for (const [file, slash] of Object.entries(SLASH_PROMPTS)) {
      const p = path.join(promptsDir, file);
      expect(fs.existsSync(p), `missing prompt ${file}`).toBe(true);
      const body = fs.readFileSync(p, "utf8");
      expect(body, file).toContain(slash.split(" ")[0]);
    }
  });

  it("has at least 21 taiyi-* prompt files for v30 slash coverage", () => {
    const files = fs.readdirSync(promptsDir).filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(21);
  });
});
