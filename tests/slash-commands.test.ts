import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const promptsDir = path.join(repoRoot, "prompts");

/** 每个 prompt 文件应对应一个 /taiyi:* 斜杠（taiyi-forge 为引擎 Skill 路由除外） */
const SLASH_PROMPTS: Record<string, string> = {
  "taiyi-new.md": "/taiyi:new",
  "taiyi-init.md": "/taiyi:init",
  "taiyi-status.md": "/taiyi:status",
  "taiyi-state.md": "/taiyi:state",
  "taiyi-state-read.md": "/taiyi:state-read",
  "taiyi-continue.md": "/taiyi:continue",
  "taiyi-complete.md": "/taiyi:complete",
  "taiyi-done.md": "/taiyi:done",
  "taiyi-next.md": "/taiyi:next",
  "taiyi-apply.md": "/taiyi:apply",
  "taiyi-archive.md": "/taiyi:archive",
  "taiyi-cancel.md": "/taiyi:cancel",
  "taiyi-handoff.md": "/taiyi:handoff",
  "taiyi-list.md": "/taiyi:list",
  "taiyi-check.md": "/taiyi:check",
  "taiyi-harness-check.md": "/taiyi:harness-check",
  "taiyi-mark-aux.md": "/taiyi:mark-aux",
  "taiyi-assess.md": "/taiyi:assess",
  "taiyi-phases.md": "/taiyi:phases",
  "taiyi-guide.md": "/taiyi:guide",
  "taiyi-doctor.md": "/taiyi:doctor",
  "taiyi-audit.md": "/taiyi:audit",
  "taiyi-verify.md": "/taiyi:verify",
  "taiyi-health.md": "/taiyi:health",
  "taiyi-sync.md": "/taiyi:sync",
  "taiyi-run.md": "/taiyi:run",
  "taiyi-loop.md": "/taiyi:loop",
  "taiyi-review-loop.md": "/taiyi:review-loop",
  "taiyi-review-check.md": "/taiyi:review-check",
  "taiyi-commit-trailers.md": "/taiyi:commit-trailers",
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
  "taiyi-release.md": "/taiyi:release",
  "taiyi-explore.md": "/taiyi:explore",
  "taiyi-flow.md": "/taiyi:flow",
  "taiyi-full-flow.md": "/taiyi:full-flow",
  "taiyi-tdd.md": "/taiyi:tdd",
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

  it("has at least 45 taiyi-* prompt files for slash coverage", () => {
    const files = fs.readdirSync(promptsDir).filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"));
    expect(files.length).toBeGreaterThanOrEqual(45);
  });
});
