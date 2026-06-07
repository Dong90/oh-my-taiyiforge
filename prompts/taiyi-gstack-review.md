---
description: "TaiyiForge /taiyi:gstack review — gstack PR diff review (not /taiyi:review-loop)"
argument-hint: "[optional slug]"
---
User invoked **$taiyi-gstack-review** (= `/taiyi:gstack review`). **gstack 结构审查** — 与 Taiyi **`/taiyi:review-loop`**（REVIEW.md 机器门）不同。

1. `/taiyi:status` — 当前阶段
2. 加载 **gstack `review`** Skill — 对 **git diff / PR** 做 pre-landing 审查
3. 发现写入或更新 `REVIEW.md`（配合 `@taiyi-review`）
4. 可选：`scripts/taiyi-forge.sh harness-check <slug> gstack/review`（auto 模式）
5. 通过后 `/taiyi:review-loop` 或 `/taiyi:continue --approver`（review 人工门）

{{TAIYI_STAGE_PROTOCOL}}

{{GSTACK_INVOKE}}
