import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { checkFrSliceCoverage } from "../../src/core/fr-coverage-check.js";

describe("checkFrSliceCoverage", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-fr-cov-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function writeJson(name: string, data: unknown) {
    fs.writeFileSync(path.join(tmp, name), JSON.stringify(data, null, 2));
  }

  it("passes when no requirement.json exists", () => {
    const result = checkFrSliceCoverage(tmp);
    expect(result.passed).toBe(true);
    expect(result.warnings[0]).toContain("not found");
  });

  it("passes when requirement.json has no functional_requirements", () => {
    writeJson("requirement.json", {
      title: "test",
      user_stories: [{ as_a: "dev", i_want: "x", so_that: "y" }],
      acceptance_criteria: [{ id: "AC-01", description: "works", is_checked: false }],
    });
    const result = checkFrSliceCoverage(tmp);
    expect(result.passed).toBe(true);
    expect(result.totalFrs).toBe(0);
  });

  it("fails when task.json is missing but FRs need coverage", () => {
    writeJson("requirement.json", {
      title: "Token tracking",
      user_stories: [{ as_a: "dev", i_want: "track tokens", so_that: "budget" }],
      acceptance_criteria: [{ id: "AC-01", description: "works", is_checked: false }],
      functional_requirements: [{
        module: "orchestrator",
        items: [{
          id: "FR-T01",
          description: "track token usage",
          trigger: "executor.dispatch() after each call",
          caller_module: "packages/orchestrator/src/executor.ts",
        }],
      }],
    });
    const result = checkFrSliceCoverage(tmp);
    expect(result.passed).toBe(false);
    expect(result.totalFrs).toBe(1);
    expect(result.coveredFrs).toBe(0);
    expect(result.uncoveredFrs).toContain("FR-T01");
  });

  it("passes when all FRs are covered by slices", () => {
    writeJson("requirement.json", {
      title: "Token tracking",
      user_stories: [{ as_a: "dev", i_want: "track tokens", so_that: "budget" }],
      acceptance_criteria: [{ id: "AC-01", description: "works", is_checked: false }],
      functional_requirements: [{
        module: "orchestrator",
        items: [
          { id: "FR-T01", description: "track token usage", trigger: "executor.dispatch()", caller_module: "packages/orchestrator/src/executor.ts" },
          { id: "FR-P01", description: "check token budget", trigger: "pipeline.continue()", caller_module: "packages/orchestrator/src/pipeline.ts" },
        ],
      }],
    });
    writeJson("task.json", {
      title: "Token tracking tasks",
      slices: [
        { id: "S1", description: "implement track integration", time_estimate: "2h", covers_frs: ["FR-T01"] },
        { id: "S2", description: "implement check in pipeline", time_estimate: "1h", covers_frs: ["FR-P01"] },
      ],
    });
    const result = checkFrSliceCoverage(tmp);
    expect(result.passed).toBe(true);
    expect(result.totalFrs).toBe(2);
    expect(result.coveredFrs).toBe(2);
    expect(result.uncoveredFrs).toHaveLength(0);
  });

  it("fails when some FRs are uncovered (M15 scenario)", () => {
    writeJson("requirement.json", {
      title: "Token tracking",
      user_stories: [{ as_a: "dev", i_want: "track tokens", so_that: "budget" }],
      acceptance_criteria: [{ id: "AC-01", description: "works", is_checked: false }],
      functional_requirements: [{
        module: "orchestrator",
        items: [
          { id: "FR-T01", description: "track token usage", trigger: "executor.dispatch()", caller_module: "packages/orchestrator/src/executor.ts" },
          { id: "FR-P01", description: "check token budget", trigger: "pipeline.continue()", caller_module: "packages/orchestrator/src/pipeline.ts" },
        ],
      }],
    });
    writeJson("task.json", {
      title: "Token tracking tasks",
      slices: [
        { id: "S1", description: "implement check in pipeline", time_estimate: "1h", covers_frs: ["FR-P01"] },
      ],
    });
    const result = checkFrSliceCoverage(tmp);
    expect(result.passed).toBe(false);
    expect(result.totalFrs).toBe(2);
    expect(result.coveredFrs).toBe(1);
    expect(result.uncoveredFrs).toContain("FR-T01");
  });

  it("skips FRs with blocked_by (out-of-scope callers)", () => {
    writeJson("requirement.json", {
      title: "Token tracking",
      user_stories: [{ as_a: "dev", i_want: "track tokens", so_that: "budget" }],
      acceptance_criteria: [{ id: "AC-01", description: "works", is_checked: false }],
      functional_requirements: [{
        module: "orchestrator",
        items: [
          { id: "FR-T01", description: "track token usage", trigger: "executor.dispatch()", caller_module: "packages/orchestrator/src/executor.ts", blocked_by: "M4-executor" },
          { id: "FR-P01", description: "check token budget", trigger: "pipeline.continue()", caller_module: "packages/orchestrator/src/pipeline.ts" },
        ],
      }],
    });
    writeJson("task.json", {
      title: "Token tracking tasks",
      slices: [
        { id: "S1", description: "implement check in pipeline", time_estimate: "1h", covers_frs: ["FR-P01"] },
      ],
    });
    const result = checkFrSliceCoverage(tmp);
    expect(result.passed).toBe(true);
    expect(result.totalFrs).toBe(1);
    expect(result.coveredFrs).toBe(1);
  });

  it("warns when caller_module not in scope", () => {
    writeJson("requirement.json", {
      title: "Token tracking",
      user_stories: [{ as_a: "dev", i_want: "track tokens", so_that: "budget" }],
      acceptance_criteria: [{ id: "AC-01", description: "works", is_checked: false }],
      functional_requirements: [{
        module: "orchestrator",
        items: [
          { id: "FR-T01", description: "track token usage", trigger: "executor.dispatch()", caller_module: "packages/orchestrator/src/executor.ts" },
        ],
      }],
    });
    writeJson("task.json", {
      title: "tasks",
      slices: [{ id: "S1", description: "do work", time_estimate: "1h" }],
    });
    const result = checkFrSliceCoverage(tmp, ["packages/orchestrator/src/pipeline.ts"]);
    expect(result.warnings.some((w) => w.includes("not in scope"))).toBe(true);
  });

  it("includes FR without caller_module even when scopeFiles is non-empty", () => {
    writeJson("requirement.json", {
      title: "Token tracking",
      user_stories: [{ as_a: "dev", i_want: "track tokens", so_that: "budget" }],
      acceptance_criteria: [{ id: "AC-01", description: "works", is_checked: false }],
      functional_requirements: [{
        module: "orchestrator",
        items: [
          { id: "FR-T01", description: "track token usage", trigger: "executor.dispatch()", caller_module: "packages/orchestrator/src/executor.ts" },
          { id: "FR-X01", description: "generic FR without known caller" },
        ],
      }],
    });
    writeJson("task.json", {
      title: "Token tracking tasks",
      slices: [
        { id: "S1", description: "implement track", time_estimate: "2h", covers_frs: ["FR-T01"] },
      ],
    });
    const result = checkFrSliceCoverage(tmp, ["packages/orchestrator/src/executor.ts"]);
    // FR-X01 has no caller_module → should be treated as in-scope and thus uncovered
    expect(result.totalFrs).toBe(2);
    expect(result.uncoveredFrs).toContain("FR-X01");
    expect(result.passed).toBe(false);
  });
});
