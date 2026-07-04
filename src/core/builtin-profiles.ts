import type { ProfileDefinition } from "./profile-registry.js";

/** 引擎内置 7 个 profile —— port 自原 src/core/profile.ts 的 PROFILE_SKIPPED 字典
 *  （PROFILE_ARCH_MAP 在 v1.x 改造中已合并到 ProfileDefinition.arch 字段）。 */
export const BUILTIN_PROFILES: ProfileDefinition[] = [
  {
    id: "full",
    skipPhases: [],
    arch: "auto",
    builtin: true,
    description: "完整 9 阶段流程（含人类评审 change/design/review）",
  },
  {
    id: "api",
    skipPhases: ["ui-design"],
    arch: "auto",
    builtin: true,
    description: "后端 API 变更（跳过 UI 设计）",
    keywords: ["api", "backend", "server", "后端"],
  },
  {
    id: "ui",
    skipPhases: [],
    auxiliaryHints: ["taiyi-restyle"],
    arch: "auto",
    builtin: true,
    description: "前端 UI 变更（含 UI 设计阶段，默认加载 taiyi-restyle）",
    keywords: ["ui", "frontend", "前端", "界面"],
  },
  {
    id: "lite",
    skipPhases: ["design", "ui-design", "task", "review"],
    arch: "auto",
    builtin: true,
    description: "轻量改动（跳过 4 阶段）",
  },
  {
    id: "spike",
    skipPhases: ["requirement", "design", "ui-design", "task", "review"],
    arch: "auto",
    builtin: true,
    description: "技术验证（跳过 5 阶段）",
  },
  {
    id: "micro",
    skipPhases: ["requirement", "design", "ui-design", "task", "test", "review"],
    arch: "generic",
    builtin: true,
    description: "微小改动（单文件/配置）",
    keywords: ["fix", "patch", "config"],
  },
  {
    id: "nano",
    skipPhases: ["change", "requirement", "design", "ui-design", "task", "test", "review"],
    arch: "generic",
    builtin: true,
    description: "零文档：只走 dev + integration",
    keywords: ["typo", "comment", "format", "注释", "排版"],
  },
];
