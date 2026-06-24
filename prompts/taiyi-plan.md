---
description: "TaiyiForge /taiyi:plan — 项目规划：README/PRD → 拆解 + profile 推荐 + 批量创建 change"
---
User invoked **$taiyi-plan** (= `/taiyi:plan`).

加载 `taiyi-plan` Skill，按以下流程执行：

1. 读取项目 README 或用户指定的需求文档
2. 识别独立模块，按决策树为每个推荐 profile（不确定时追问）
3. 输出拆解计划（slug + profile + 理由 + 依赖 + 优先级）
4. 超过 5 个自动分波
5. 一次问完：确认？自动/手动/调整？
6. 用户选自动后，批量 `/taiyi:new` 创建；Wave 1 到 dev 后提醒启动 Wave 2
