import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const promptsDir = path.join(repoRoot, "prompts");

/** 每个 v28 canonical prompt 文件应对应一个 /taiyi:* 斜杠 */
const SLASH_PROMPTS: Record<string, string> = {
  "taiyi-new.md": "/taiyi:new",
  "taiyi-status.md": "/taiyi:status",
  "taiyi-continue.md": "/taiyi:continue",
  "taiyi-apply.md": "/taiyi:apply",
  "taiyi-archive.md": "/taiyi:archive",
  "taiyi-cancel.md": "/taiyi:cancel",
  "taiyi-list.md": "/taiyi:list",
  "taiyi-doctor.md": "/taiyi:doctor",
  "taiyi-audit.md": "/taiyi:audit",
  "taiyi-verify.md": "/taiyi:verify",
  "taiyi-commit.md": "/taiyi:commit",
  "taiyi-ship.md": "/taiyi:ship",
  "taiyi-land.md": "/taiyi:land",
  "taiyi-gstack.md": "/taiyi:gstack",
  "taiyi-sp.md": "/taiyi:sp",
  "taiyi-release.md": "/taiyi:release",
  "taiyi-write.md": "/taiyi:write",
};

describe("slash commands", () => {
  it("every catalogued prompt exists and mentions its slash", () => {
    for (const [file, slash] of Object.entries(SLASH_PROMPTS)) {
      const p = path.join(promptsDir, file);
      expect(fs.existsSync(p), `missing prompt ${file}`).toBe(true);
      const body = fs.readFileSync(p, "utf8");
      expect(body, file).toContain(slash.replace("|", "\\|").split(" ")[0]);
    }
  });

  it("has at least 65 taiyi-* prompt files for slash coverage", () => {
    const files = fs.readdirSync(promptsDir).filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(20);
  });
});
