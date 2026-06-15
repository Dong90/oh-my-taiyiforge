import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  markReviewLoopStarted,
  readReviewLoopState,
} from "../src/core/review-loop-state.js";
import { runReviewMachineCheck } from "../src/core/review-loop-runner.js";
import { WorkflowEngine } from "../src/core/workflow-engine.js";

const APPROVE_REVIEW = `# REVIEW

## Verdict
Approve

## Findings
| Severity | Status | Item |
|----------|--------|------|
| high | resolved | none |
`;

describe("review-loop-state", () => {
  it("markReviewLoopStarted preserves loopStartedAt for same slug", () => {
    const changeDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rls-"));
    const first = markReviewLoopStarted(changeDir, "s1");
    expect(first.loopStartedAt).toBeTruthy();

    // Simulate time passing before the next review-loop CLI invocation
    const second = markReviewLoopStarted(changeDir, "s1");
    expect(second.loopStartedAt).toBe(first.loopStartedAt);

    fs.rmSync(changeDir, { recursive: true, force: true });
  });

  it("markReviewLoopStarted resets loopStartedAt when slug changes", () => {
    const changeDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rls2-"));
    const first = markReviewLoopStarted(changeDir, "s1");
    // Force an older timestamp so a new slug cannot accidentally reuse it
    const stale = { ...first, loopStartedAt: "2000-01-01T00:00:00.000Z" };
    fs.writeFileSync(
      path.join(changeDir, ".review-loop-state.json"),
      JSON.stringify(stale, null, 2),
      "utf8",
    );

    const second = markReviewLoopStarted(changeDir, "s2");
    expect(second.slug).toBe("s2");
    expect(second.loopStartedAt).toBeTruthy();
    expect(second.loopStartedAt).not.toBe("2000-01-01T00:00:00.000Z");

    fs.rmSync(changeDir, { recursive: true, force: true });
  });

  it("second review-loop round accepts REVIEW.md written after first round", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rls3-"));
    const engine = new WorkflowEngine(root);
    engine.initChange("round2");
    const changeDir = path.join(root, "changes", "round2");
    const reviewPath = path.join(changeDir, "REVIEW.md");
    fs.writeFileSync(reviewPath, APPROVE_REVIEW, "utf8");

    const first = runReviewMachineCheck(engine, "round2", {
      bumpRound: true,
      workspaceDir: root,
    });
    expect(first.ok).toBe(false);
    expect(first.text).toMatch(/新一轮 code review|不可直接复用旧审查/);

    const loopStartedAt = readReviewLoopState(changeDir)?.loopStartedAt;
    expect(loopStartedAt).toBeTruthy();

    // Agent writes fresh REVIEW.md after fixing findings
    fs.writeFileSync(reviewPath, APPROVE_REVIEW, "utf8");
    const t = new Date(Date.parse(loopStartedAt!) + 2000);
    fs.utimesSync(reviewPath, t, t);

    const second = runReviewMachineCheck(engine, "round2", {
      bumpRound: true,
      workspaceDir: root,
    });
    expect(second.ok).toBe(true);
    // 通过后引擎会 clearReviewLoopState，loopStartedAt 不再保留
    expect(readReviewLoopState(changeDir)).toBeNull();

    fs.rmSync(root, { recursive: true, force: true });
  });
});
