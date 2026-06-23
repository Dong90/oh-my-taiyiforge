import { describe, it, expect } from "vitest";
import {
  parseSliceDependencies,
  buildExecutionPlan,
  type TaskSlice,
  type ExecutionWave,
} from "../../src/core/task-dag.js";

describe("Task DAG — parse dependencies and build execution plan", () => {
  describe("parseSliceDependencies", () => {
    it("parses slices with no dependencies (wave 1)", () => {
      const slices: TaskSlice[] = [
        { id: "S1", label: "Init project", dependencies: "", parallelizable: true },
        { id: "S2", label: "Add auth", dependencies: "S1", parallelizable: false },
      ];
      const deps = parseSliceDependencies(slices);
      expect(deps.get("S1")!.dependsOn).toEqual([]);
      expect(deps.get("S2")!.dependsOn).toEqual(["S1"]);
    });

    it("identifies parallelizable slices", () => {
      const slices: TaskSlice[] = [
        { id: "S1", label: "Frontend", dependencies: "", parallelizable: true },
        { id: "S2", label: "Backend", dependencies: "", parallelizable: true },
        { id: "S3", label: "Integration", dependencies: "S1", parallelizable: false },
      ];
      const deps = parseSliceDependencies(slices);
      expect(deps.get("S1")!.canParallelize).toBe(true);
      expect(deps.get("S2")!.canParallelize).toBe(true);
      expect(deps.get("S3")!.canParallelize).toBe(false);
    });

    it("handles multiple comma-separated dependencies", () => {
      const slices: TaskSlice[] = [
        { id: "S1", label: "A", dependencies: "", parallelizable: true },
        { id: "S2", label: "B", dependencies: "", parallelizable: true },
        { id: "S3", label: "C", dependencies: "S1, S2", parallelizable: false },
      ];
      const deps = parseSliceDependencies(slices);
      expect(deps.get("S3")!.dependsOn).toEqual(["S1", "S2"]);
    });
  });

  describe("buildExecutionPlan", () => {
    it("builds single wave when all slices are dependent", () => {
      const slices: TaskSlice[] = [
        { id: "S1", label: "A", dependencies: "", parallelizable: true },
        { id: "S2", label: "B", dependencies: "S1", parallelizable: false },
        { id: "S3", label: "C", dependencies: "S2", parallelizable: false },
      ];
      const plan = buildExecutionPlan(slices);
      expect(plan.waves.length).toBe(3);
      expect(plan.waves[0].sliceIds).toEqual(["S1"]);
      expect(plan.waves[1].sliceIds).toEqual(["S2"]);
      expect(plan.waves[2].sliceIds).toEqual(["S3"]);
    });

    it("parallelizes independent slices in the same wave", () => {
      const slices: TaskSlice[] = [
        { id: "S1", label: "Frontend", dependencies: "", parallelizable: true },
        { id: "S2", label: "Backend", dependencies: "", parallelizable: true },
        { id: "S3", label: "Integration", dependencies: "S1, S2", parallelizable: false },
      ];
      const plan = buildExecutionPlan(slices);
      expect(plan.waves.length).toBe(2);
      expect(plan.waves[0].sliceIds).toContain("S1");
      expect(plan.waves[0].sliceIds).toContain("S2");
      expect(plan.parallelCount).toBe(2);
      expect(plan.waves[1].sliceIds).toEqual(["S3"]);
    });

    it("detects circular dependencies", () => {
      const slices: TaskSlice[] = [
        { id: "S1", label: "A", dependencies: "S2", parallelizable: false },
        { id: "S2", label: "B", dependencies: "S1", parallelizable: false },
      ];
      const plan = buildExecutionPlan(slices);
      expect(plan.circularDeps.length).toBeGreaterThan(0);
      expect(plan.circularDeps[0]).toContain("S1");
    });

    it("empty slices produce empty plan", () => {
      const plan = buildExecutionPlan([]);
      expect(plan.waves).toEqual([]);
      expect(plan.totalSlices).toBe(0);
    });

    it("single slice produces single wave", () => {
      const slices: TaskSlice[] = [
        { id: "S1", label: "Solo", dependencies: "", parallelizable: true },
      ];
      const plan = buildExecutionPlan(slices);
      expect(plan.waves.length).toBe(1);
      expect(plan.totalSlices).toBe(1);
    });

    it("calculates estimated time based on waves", () => {
      const slices: TaskSlice[] = [
        { id: "S1", label: "A", dependencies: "", parallelizable: true },
        { id: "S2", label: "B", dependencies: "", parallelizable: true },
        { id: "S3", label: "C", dependencies: "", parallelizable: true },
      ];
      const plan = buildExecutionPlan(slices, 2); // maxParallel = 2
      // 3 slices with maxParallel=2: wave1 gets 2, wave2 gets 1
      expect(plan.waves.length).toBe(2);
      expect(plan.waves[0].sliceIds.length).toBe(2);
      expect(plan.waves[1].sliceIds.length).toBe(1);
      expect(plan.parallelCount).toBe(2);
    });

    it("respects maxParallel when more slices than slots", () => {
      const slices: TaskSlice[] = [
        { id: "S1", label: "A", dependencies: "", parallelizable: true },
        { id: "S2", label: "B", dependencies: "", parallelizable: true },
        { id: "S3", label: "C", dependencies: "", parallelizable: true },
        { id: "S4", label: "D", dependencies: "", parallelizable: true },
      ];
      const plan = buildExecutionPlan(slices, 2);
      expect(plan.waves.length).toBe(2);
      expect(plan.waves[0].sliceIds.length).toBe(2);
      expect(plan.waves[1].sliceIds.length).toBe(2);
    });
  });
});
