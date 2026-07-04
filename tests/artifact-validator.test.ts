import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateArtifactFile } from "../src/core/artifact-validator.js";

function makeChangeDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "av-test-"));
}

function writeChangeDir(dir: string, opts: { md: string; json: object }): void {
  fs.writeFileSync(path.join(dir, "CHANGE.md"), opts.md);
  fs.writeFileSync(path.join(dir, "change.json"), JSON.stringify(opts.json));
}

describe("evidence 强校验(change/requirement/test 阶段)", () => {
  let dir: string;
  beforeEach(() => {
    dir = makeChangeDir();
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("change:is_checked=true 但缺 evidence → 返回 allFalse + Evidence hint", () => {
    writeChangeDir(dir, {
      md: "## Motivation\nbecause we need this\n## Scope\nIn: x\n## Success Criteria\n- [x] SC-01 done\n",
      json: {
        title: "t",
        motivation: "m",
        scope: { includes: ["x"] },
        success_criteria: [{ id: "SC-01", description: "d", is_checked: true }],
      },
    });
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r?.scores.verifiability).toBe(false);
    expect(r?.hints.some((h) => h.includes("[Evidence]"))).toBe(true);
  });

  it("change:is_checked=true + evidence 完整 → 全绿", () => {
    writeChangeDir(dir, {
      md: "## Motivation\nbecause we need this\n## Scope\nIn: x\n## Success Criteria\n- [x] SC-01 done\n",
      json: {
        title: "t",
        motivation: "m",
        scope: { includes: ["x"] },
        success_criteria: [{ id: "SC-01", description: "d", is_checked: true }],
        evidence: { command: "npm test", exitCode: 0, capturedAt: new Date().toISOString() },
      },
    });
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r?.scores.completeness).toBe(true);
  });

  it("change:is_checked 全 false + 无 evidence → 不报 evidence 错(放行)", () => {
    writeChangeDir(dir, {
      md: "## Motivation\nbecause we need this\n## Scope\nIn: x\n## Success Criteria\n- [ ] SC-01 todo\n",
      json: {
        title: "t",
        motivation: "m",
        scope: { includes: ["x"] },
        success_criteria: [{ id: "SC-01", description: "d", is_checked: false }],
      },
    });
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r?.scores.completeness).toBe(true);
  });

  it("change:evidence.exitCode !== 0 → Zod 校验失败", () => {
    writeChangeDir(dir, {
      md: "## Motivation\nbecause we need this\n## Scope\nIn: x\n## Success Criteria\n- [x] SC-01 done\n",
      json: {
        title: "t",
        motivation: "m",
        scope: { includes: ["x"] },
        success_criteria: [{ id: "SC-01", description: "d", is_checked: true }],
        evidence: { command: "npm test", exitCode: 1, capturedAt: new Date().toISOString() },
      },
    });
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r?.scores.consistency).toBe(false);
    expect(r?.hints.some((h) => h.toLowerCase().includes("exitcode"))).toBe(true);
  });

  it("change:evidence.capturedAt 非 ISO → Zod 校验失败", () => {
    writeChangeDir(dir, {
      md: "## Motivation\nbecause we need this\n## Scope\nIn: x\n## Success Criteria\n- [x] SC-01 done\n",
      json: {
        title: "t",
        motivation: "m",
        scope: { includes: ["x"] },
        success_criteria: [{ id: "SC-01", description: "d", is_checked: true }],
        evidence: { command: "npm test", exitCode: 0, capturedAt: "not-a-date" },
      },
    });
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r?.scores.consistency).toBe(false);
    expect(r?.hints.some((h) => h.toLowerCase().includes("capturedat") || h.toLowerCase().includes("iso"))).toBe(true);
  });

  it("requirement:is_checked=true 但缺 evidence → Evidence hint", () => {
    fs.writeFileSync(path.join(dir, "REQUIREMENT.md"), "## User Stories\nUS-1\n## Acceptance Criteria\n- [x] AC-01 done\n");
    fs.writeFileSync(path.join(dir, "requirement.json"), JSON.stringify({
      title: "t",
      user_stories: [{ as_a: "用户", i_want: "f", so_that: "g" }],
      features: ["f"],
      acceptance_criteria: [{ id: "AC-01", description: "d", is_checked: true }],
    }));
    const r = validateArtifactFile(path.join(dir, "REQUIREMENT.md"), "requirement");
    expect(r?.scores.verifiability).toBe(false);
    expect(r?.hints.some((h) => h.includes("[Evidence]"))).toBe(true);
  });
});
