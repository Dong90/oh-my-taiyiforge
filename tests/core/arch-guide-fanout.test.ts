import { describe, it, expect } from "vitest";
import {
  buildWorkers,
  buildFanOutPlan,
  generateOpenCodeDispatch,
  generateClaudeDispatch,
  generateCursorDispatch,
  generateCodexDispatch,
} from "../../src/core/fan-out-executor.js";
import type { TaskSpec } from "../../src/schemas/task.js";
import type { FanOutPlan } from "../../src/core/fan-out-executor.js";

const sampleTask: TaskSpec = {
  title: "翻译助手",
  slices: [
    {
      id: "S1",
      label: "翻译 API 端点",
      description: "实现翻译路由与控制器",
    },
  ],
};

const archGuide =
  "FastAPI 约定：使用 create_app() 工厂函数 + lifespan 上下文管理器。" +
  "控制器放在 controllers/ 目录，每个文件一个 router。";

describe("fan-out-executor archGuide injection", () => {
  function planWithGuide(): FanOutPlan {
    const plan = buildFanOutPlan("test-slug", "dev", sampleTask);
    plan.archGuide = archGuide;
    return plan;
  }

  it("OpenCode dispatch includes archGuide", () => {
    const out = generateOpenCodeDispatch(planWithGuide());
    expect(out).toContain("create_app()");
    expect(out).toContain("lifespan");
    expect(out).toContain("控制器放在 controllers/");
  });

  it("Claude dispatch includes archGuide", () => {
    const out = generateClaudeDispatch(planWithGuide());
    expect(out).toContain("create_app()");
    expect(out).toContain("lifespan");
  });

  it("Cursor dispatch includes archGuide", () => {
    const out = generateCursorDispatch(planWithGuide());
    expect(out).toContain("create_app()");
    expect(out).toContain("controllers/");
  });

  it("Codex dispatch includes archGuide", () => {
    const out = generateCodexDispatch(planWithGuide());
    expect(out).toContain("create_app()");
    expect(out).toContain("lifespan");
  });

  it("no archGuide → no extra section in OpenCode output", () => {
    const plan = buildFanOutPlan("test-slug", "dev", sampleTask);
    const out = generateOpenCodeDispatch(plan);
    // Should not contain arch guidance if no archGuide
    expect(out).not.toContain("## 架构约定");
  });
});
