import { describe, expect, it } from "vitest";
import {
  buildWorkers,
  buildFanOutPlan,
  generateOpenCodeDispatch,
  generateClaudeDispatch,
  generateCursorDispatch,
  generateCodexDispatch,
  generateAllDispatches,
} from "../../src/core/fan-out-executor.js";
import { MAX_PARALLEL_AGENTS } from "../../src/core/runtime/spawn-delegation.js";
import type { TaskSpec } from "../../src/schemas/task.js";

const sampleTask: TaskSpec = {
  title: "用户登录模块",
  slices: [
    {
      id: "S1",
      label: "邮箱密码登录表单",
      description: "实现邮箱+密码的登录表单组件，含表单校验",
      test_command: "npm test -- -t 'LoginForm'",
    },
    {
      id: "S2",
      label: "JWT Token 管理",
      description: "实现 JWT 签发与刷新逻辑",
      test_command: "npm test -- -t 'JWT'",
    },
    {
      id: "S3",
      label: "登录状态持久化",
      description: "localStorage 存储 token + 自动恢复登录态",
      test_command: "npm test -- -t 'AuthStore'",
    },
  ],
};

describe("fan-out-executor", () => {
  describe("buildWorkers", () => {
    it("creates one worker per slice", () => {
      const workers = buildWorkers(sampleTask, "dev");
      expect(workers).toHaveLength(3);
      expect(workers[0].id).toBe("w1");
      expect(workers[0].label).toBe("邮箱密码登录表单");
      expect(workers[0].testCommand).toBe("npm test -- -t 'LoginForm'");
    });

    it("caps at MAX_PARALLEL_AGENTS (" + MAX_PARALLEL_AGENTS + ")", () => {
      const huge: TaskSpec = {
        title: "x",
        slices: Array.from({ length: 20 }, (_, i) => ({
          id: `S${i + 1}`,
          label: `Slice ${i + 1}`,
        })),
      };
      expect(buildWorkers(huge, "dev").length).toBeLessThanOrEqual(MAX_PARALLEL_AGENTS);
    });

    it("round-robin assigns executor/test-engineer/debugger roles", () => {
      const workers = buildWorkers(sampleTask, "dev");
      expect(workers[0].role).toBe("executor");
      expect(workers[1].role).toBe("test-engineer");
      expect(workers[2].role).toBe("debugger");
    });

    it("empty slices → falls back to phase-based agent roles", () => {
      const workers = buildWorkers({ title: "x", slices: [] }, "dev");
      expect(workers.length).toBeGreaterThan(0);
      expect(workers[0].role).toBeDefined();
    });
  });

  describe("buildFanOutPlan", () => {
    it("includes all default platforms", () => {
      const plan = buildFanOutPlan("slug-1", "dev", sampleTask);
      expect(plan.platforms).toContain("opencode");
      expect(plan.platforms).toContain("claude");
      expect(plan.platforms).toContain("cursor");
      expect(plan.platforms).toContain("codex");
      expect(plan.workers).toHaveLength(3);
    });

    it("respects custom platform list", () => {
      const plan = buildFanOutPlan("slug-1", "dev", sampleTask, ["opencode"]);
      expect(plan.platforms).toEqual(["opencode"]);
    });
  });

  describe("OpenCode dispatch", () => {
    it("generates Task() calls for all workers", () => {
      const plan = buildFanOutPlan("test-slug", "dev", sampleTask);
      const out = generateOpenCodeDispatch(plan);
      expect(out).toContain("Task(subagent_type=");
      expect(out).toContain("w1");
      expect(out).toContain("w2");
      expect(out).toContain("w3");
      expect(out).toContain("邮箱密码登录表单");
    });

    it("includes test commands", () => {
      const plan = buildFanOutPlan("test-slug", "dev", sampleTask);
      const out = generateOpenCodeDispatch(plan);
      expect(out).toContain("LoginForm");
    });
  });

  describe("Claude Code dispatch", () => {
    it("generates claude -p commands", () => {
      const plan = buildFanOutPlan("test-slug", "dev", sampleTask);
      const out = generateClaudeDispatch(plan);
      expect(out).toContain("claude -p");
      expect(out).toContain("Worker w1");
      expect(out).toContain("Merge");
    });
  });

  describe("Cursor dispatch", () => {
    it("generates Cursor Task protocol", () => {
      const plan = buildFanOutPlan("test-slug", "dev", sampleTask);
      const out = generateCursorDispatch(plan);
      expect(out).toContain("Task(subagent_type=");
      expect(out).toContain("/taiyi:agent executor");
      expect(out).toContain("/taiyi:sp test-driven-development");
    });
  });

  describe("Codex dispatch", () => {
    it("generates codex exec commands", () => {
      const plan = buildFanOutPlan("test-slug", "dev", sampleTask);
      const out = generateCodexDispatch(plan);
      expect(out).toContain("codex exec --full-auto");
      expect(out).toContain("worker w1");
      expect(out).toContain("Merge");
    });
  });

  describe("generateAllDispatches", () => {
    it("returns all 4 platform dispatches", () => {
      const plan = buildFanOutPlan("test-slug", "dev", sampleTask);
      const all = generateAllDispatches(plan);
      expect(Object.keys(all)).toHaveLength(4);
      expect(all.opencode).toContain("Task(subagent_type=");
      expect(all.claude).toContain("claude -p");
      expect(all.cursor).toContain("Task(subagent_type=");
      expect(all.codex).toContain("codex exec");
    });

    it("filters to requested platforms only", () => {
      const plan = buildFanOutPlan("test-slug", "dev", sampleTask, ["opencode", "cursor"]);
      const all = generateAllDispatches(plan);
      expect(Object.keys(all)).toEqual(["opencode", "cursor"]);
    });
  });
});
