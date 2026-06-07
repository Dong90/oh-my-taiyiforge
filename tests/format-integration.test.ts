import { describe, expect, it } from "vitest";
import {
  formatArchivePlain,
  formatSyncOpenspecPlain,
} from "../src/core/format-integration.js";

describe("format-integration", () => {
  it("formats successful sync", () => {
    const text = formatSyncOpenspecPlain("feat-a", {
      ok: true,
      copied: ["proposal.md", "design.md"],
      skippedFiles: [],
      changePath: "/tmp/openspec/changes/feat-a",
    });
    expect(text).toMatch(/✓ 已同步 feat-a/);
    expect(text).toMatch(/proposal\.md/);
  });

  it("formats skipped archive", () => {
    const text = formatArchivePlain("feat-a", {
      ok: true,
      skipped: true,
      reason: "OpenSpec not initialized in this project",
    });
    expect(text).toMatch(/○ archive 跳过/);
  });
});
