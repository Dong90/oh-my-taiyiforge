import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const promptsDir = path.join(repoRoot, "prompts");

/** 每个 prompt 文件应对应一个 /taiyi:* 斜杠（taiyi-forge 为引擎 Skill 路由除外） */
const SLASH_PROMPTS: Record<string, string> = {
  "taiyi-new.md": "/taiyi:new",
  "taiyi-status.md": "/taiyi:status",
  "taiyi-continue.md": "/taiyi:continue",
  "taiyi-apply.md": "/taiyi:apply",
  "taiyi-archive.md": "/taiyi:archive",
  "taiyi-cancel.md": "/taiyi:cancel",
  "taiyi-handoff.md": "/taiyi:handoff",
  "taiyi-list.md": "/taiyi:list",
  "taiyi-doctor.md": "/taiyi:doctor",
  "taiyi-audit.md": "/taiyi:audit",
  "taiyi-verify.md": "/taiyi:verify",
  "taiyi-health.md": "/taiyi:health",
  "taiyi-loop.md": "/taiyi:loop",
  "taiyi-review-loop.md": "/taiyi:review-loop",
  "taiyi-review-check.md": "/taiyi:review-check",
  "taiyi-ralph.md": "/taiyi:ralph",
  "taiyi-autopilot.md": "/taiyi:autopilot",
  "taiyi-team.md": "/taiyi:team",
  "taiyi-token-status.md": "/taiyi:token status",
  "taiyi-token-record.md": "/taiyi:token record",
  "taiyi-token-scan.md": "/taiyi:token scan",
  "taiyi-token-compress.md": "/taiyi:token compress",
  "taiyi-ci-platform.md": "/taiyi:ci platform",
  "taiyi-ci-prompt.md": "/taiyi:ci prompt",
  "taiyi-commit.md": "/taiyi:commit",
  "taiyi-ship.md": "/taiyi:ship",
  "taiyi-land.md": "/taiyi:land",
  "taiyi-gstack-review.md": "/taiyi:gstack review",
  "taiyi-gstack-qa.md": "/taiyi:gstack qa",
  "taiyi-gstack.md": "/taiyi:gstack",
  "taiyi-sp.md": "/taiyi:sp",
  "taiyi-resume.md": "/taiyi:resume",
  "taiyi-release.md": "/taiyi:release",
  "taiyi-explore.md": "/taiyi:explore",
  "taiyi-flow.md": "/taiyi:flow",
  "taiyi-tdd.md": "/taiyi:tdd",
  "taiyi-write.md": "/taiyi:write",
  "taiyi-deep-interview.md": "/taiyi:deep-interview",
  "taiyi-visual-verdict.md": "/taiyi:visual-verdict",
  "taiyi-ai-slop-cleaner.md": "/taiyi:ai-slop-cleaner",
  "taiyi-ecomode.md": "/taiyi:ecomode",
  "taiyi-external-context.md": "/taiyi:external-context",
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
    expect(files.length).toBeGreaterThanOrEqual(65);
  });
});
