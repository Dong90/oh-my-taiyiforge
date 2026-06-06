import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assessReviewFreshness } from "../src/core/review-freshness.js";

describe("review-freshness", () => {
  it("flags missing REVIEW.md", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rf-"));
    const r = assessReviewFreshness(root, path.join(root, "REVIEW.md"), null);
    expect(r.needsFresh).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("flags stale review when loopStartedAt is newer than file", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rf2-"));
    const reviewPath = path.join(root, "REVIEW.md");
    fs.writeFileSync(reviewPath, "# REVIEW\n", "utf8");
    const future = new Date(Date.now() + 60_000).toISOString();
    const r = assessReviewFreshness(
      root,
      reviewPath,
      { slug: "x", round: 1, loopStartedAt: future, updatedAt: future },
      { requireFreshForLoop: true },
    );
    expect(r.needsFresh).toBe(true);
    expect(r.reasons.join(" ")).toMatch(/不可直接复用旧审查/);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
