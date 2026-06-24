---
description: "TaiyiForge /taiyi:decompose — README/PRD 拆解为独立 change slug 清单"
---
User invoked **$taiyi-decompose** (= `/taiyi:decompose`).

加载 `taiyi-decompose` Skill，按以下流程执行：

1. 读取项目 README 或用户指定的需求文档
2. 识别独立模块，为每个推荐 profile（决策树判断，不确定时追问）
3. 输出拆解计划（slug + profile + 理由 + 依赖 + 优先级）
4. 询问：自动创建还是手动？
5. 用户确认后，自动调用 `/taiyi:new` 批量创建
6. 超过 5 个分波执行；Wave 1 完成后提醒用户启动 Wave 2
