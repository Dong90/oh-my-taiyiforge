import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PRUNE = path.join(REPO, ".pitfalls/prune.mjs");
const BACKUP_DIR = path.join(REPO, "tests/pitfalls/__backup__");

// Create test fixtures
const TEST_FILE = path.join(REPO, "tests/pitfalls/__fixture__/test-pitfalls.md");
const TEST_DIR = path.dirname(TEST_FILE);
const TEST_ARCHIVE = path.join(REPO, ".pitfalls/archive.md");

function runPrune(args = "") {
  return execSync(`node ${PRUNE} ${args} --fixture-dir ${TEST_DIR}`, { cwd: REPO, encoding: "utf8", env: { ...process.env } });
}

function createFixture(entries: string[]) {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.writeFileSync(TEST_FILE, entries.join("\n\n"), "utf8");
}

// Backup + restore real PITFALLS files to avoid clobbering
beforeAll(() => {
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  fs.rmSync(TEST_ARCHIVE, { force: true }); // clean test archive
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.rmSync(TEST_ARCHIVE, { force: true });
});

describe("PITFALLS — prune.mjs lifecycle rules", () => {
  it("prune.mjs exists", () => {
    expect(fs.existsSync(PRUNE)).toBe(true);
  });

  it("dry-run produces no output for empty fixture", () => {
    createFixture([]);
    const out = runPrune(`--months 1`);
    expect(out).toContain("无需清理");
  });

  describe("process rules → immortal", () => {
    it("process-tagged rules never get pruned regardless of age", () => {
      createFixture([
        `### X-001 · [process] 周五不发版

- **首发**: n/a · 2024-01-01
- **适用栈**: all
- **状态**: active
- **关键词**: deploy friday
`,
      ]);
      const out = runPrune(`--months 1`);
      expect(out).toContain("immortal");
      expect(out).toContain("X-001");
      expect(out).toContain("无需清理"); // no stale entries
    });

    it("immortal rules count = number of process entries", () => {
      createFixture([
        `### X-002 · [process] Rule A
- **首发**: n/a · 2020-01-01
- **状态**: active
- **关键词**: a
`,
        `### X-003 · [process] Rule B
- **首发**: n/a · 2020-01-01
- **状态**: active
- **关键词**: b
`,
      ]);
      const out = runPrune(`--months 1`);
      expect(out).toContain("immortal: 2");
    });
  });

  describe("time-based stale — [arch] tag (default threshold)", () => {
    it("old [arch] entry triggers stale with default 12mo threshold", () => {
      createFixture([
        `### X-010 · [arch] Old architecture decision
- **首发**: n/a · 2020-01-01
- **状态**: active
- **关键词**: old arch
`,
      ]);
      const out = runPrune();
      expect(out).toContain("时间过时: 1");
      expect(out).toContain("X-010");
      expect(out).toContain("arch");
    });

    it("recent [arch] entry does NOT trigger stale", () => {
      const today = new Date().toISOString().slice(0, 10);
      createFixture([
        `### X-011 · [arch] Recent decision
- **首发**: n/a · ${today}
- **状态**: active
- **关键词**: recent
`,
      ]);
      const out = runPrune();
      expect(out).toContain("无需清理");
    });
  });

  describe("time-based stale — [sec/ops] tags (half threshold)", () => {
    it("[sec] entry uses half threshold", () => {
      // 12mo base → 6mo for sec. Entry older than 6mo should trigger
      const sevenMonthsAgo = new Date(Date.now() - 220 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      createFixture([
        `### X-020 · [sec] Old security rule
- **首发**: n/a · ${sevenMonthsAgo}
- **状态**: active
- **关键词**: security
`,
      ]);
      const out = runPrune();
      expect(out).toContain("X-020");
      expect(out).toContain("sec");
    });

    it("[ops] entry uses half threshold", () => {
      const eightMonthsAgo = new Date(Date.now() - 245 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      createFixture([
        `### X-021 · [ops] Old ops rule
- **首发**: n/a · ${eightMonthsAgo}
- **状态**: active
- **关键词**: ops
`,
      ]);
      const out = runPrune();
      expect(out).toContain("X-021");
    });
  });

  describe("already resolved → skip", () => {
    it("resolved entries are never marked stale", () => {
      createFixture([
        `### X-030 · [arch] Already resolved
- **首发**: n/a · 2020-01-01
- **状态**: resolved: fixed in v2.0
- **关键词**: fixed
`,
      ]);
      const out = runPrune(`--months 1`);
      expect(out).toContain("resolved: 1");
      expect(out).toContain("无需清理");
    });
  });

  describe("--apply mode", () => {
    it("--apply changes status from active to stale", () => {
      createFixture([
        `### X-040 · [arch] Will be marked stale
- **首发**: n/a · 2020-01-01
- **状态**: active
- **关键词**: test

**问题场景**
Test problem

**试过的方案**
Test solution

**为什么不行**
Because test
`,
      ]);

      // Run apply with short threshold
      runPrune(`--apply --months 1`);

      const content = fs.readFileSync(TEST_FILE, "utf8");
      expect(content).toContain("stale");
      expect(content).not.toMatch(/- \*\*状态\*\*: active/);
    });

    it("--apply writes to archive", () => {
      expect(fs.existsSync(TEST_ARCHIVE)).toBe(true);
      const archive = fs.readFileSync(TEST_ARCHIVE, "utf8");
      expect(archive).toContain("X-040");
      expect(archive).toContain("PITFALLS Archive");
    });
  });

  describe("custom months threshold", () => {
    it("--months 3 sets 3-month base threshold", () => {
      const fourMonthsAgo = new Date(Date.now() - 122 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      createFixture([
        `### X-050 · [arch] Four months old
- **首发**: n/a · ${fourMonthsAgo}
- **状态**: active
- **关键词**: test
`,
      ]);
      const out = runPrune(`--months 3`);
      expect(out).toContain("X-050");
    });

    it("--months 3 leaves recent entries alone", () => {
      const twoMonthsAgo = new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      createFixture([
        `### X-051 · [arch] Two months old
- **首发**: n/a · ${twoMonthsAgo}
- **状态**: active
- **关键词**: test
`,
      ]);
      const out = runPrune(`--months 3`);
      expect(out).toContain("无需清理");
    });
  });
});
