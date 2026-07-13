import type { RunnerPolicyDefinition } from "./runner-policy-registry.js";

/** 4 个内置 runner policy preset + 2 个 helper (loop / review-loop)。
 *
 *  设计原则：
 *  - 4 个 preset 对应用户最常见的 4 种执行模式（自主 / 反问 / 角色 / 并行切片）
 *  - loop / review-loop 不算"用户主入口"，是辅助
 *  - 每个 preset 给底层 runner 传具体参数（maxIterations / autoHarness / parallelism 等）
 *  - 用户可在 .taiyi/runner-policies.yaml 加 custom preset
 */
export const BUILTIN_RUNNER_POLICIES: RunnerPolicyDefinition[] = [
  {
    id: "autopilot",
    runner: "autopilot",
    maxIterations: 100,
    maxTokens: 500000,
    autoHarness: true,
    parallelism: 1,
    verifyEachPhase: false,
    builtin: true,
    description: "全自动推进：从当前阶段跑到完，不反问，不暂停",
  },
  {
    id: "ralph",
    runner: "ralph",
    maxIterations: 100,
    maxTokens: 200000,
    autoHarness: true,
    parallelism: 1,
    verifyEachPhase: true,
    builtin: true,
    description: "反向提示循环：每次写完问\"还差什么 → 继续写\"",
  },
  {
    id: "team",
    runner: "team",
    maxIterations: 30,
    maxTokens: 500000,
    autoHarness: true,
    parallelism: 1,
    verifyEachPhase: false,
    roleOverride: undefined,
    builtin: true,
    description: "多 agent 角色协作：analyst/planner/architect/executor 顺序",
  },
  {
    id: "ultrawork",
    runner: "ultrawork",
    maxIterations: 50,
    maxTokens: 500000,
    autoHarness: true,
    parallelism: 5,
    verifyEachPhase: true,
    builtin: true,
    description: "并行切片：把 task 拆细，多 agent 并行写",
  },
  // ── Helper categories (not "main" presets, but registered for convenience) ──
  {
    id: "loop",
    runner: "loop",
    maxIterations: 5,
    maxTokens: 50000,
    autoHarness: false,
    parallelism: 1,
    verifyEachPhase: false,
    builtin: true,
    description: "Helper: N 轮重试（用于 retry 失败阶段）",
  },
  {
    id: "review-loop",
    runner: "review-loop",
    maxIterations: 3,
    maxTokens: 50000,
    autoHarness: false,
    parallelism: 1,
    verifyEachPhase: true,
    builtin: true,
    description: "Helper: review 阶段 N 轮收敛（用于迭代评审反馈）",
  },
];
