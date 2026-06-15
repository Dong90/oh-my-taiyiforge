---
description: "TaiyiForge /taiyi:review — Review 域 umbrella · loop / check / health / gstack"
argument-hint: "<loop|check|health|gstack> [args]"
---
User invoked **$taiyi-review** (= `/taiyi:review $ARGUMENTS`). **Review 域 umbrella · 拆给 4 个子命令 prompt**：

| 子命令 | legacy 斜杠 | 真源 prompt | 说明 |
|--------|------------|------------|------|
| `loop` | `/taiyi:review-loop` | `prompts/taiyi-review-loop.md` | review 闭环循环（直到绿或 stopomc） |
| `check` | `/taiyi:review-check` | `prompts/taiyi-review-check.md` | 单次 review 校验 |
| `health` | `/taiyi:health` | `prompts/taiyi-health.md` | 代码健康基线（→ `health-report.md`） |
| `gstack` | `/taiyi:gstack review` | `prompts/taiyi-gstack-review.md` | gstack 跨 AI review |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由到对应子命令 prompt
2. 加载 `@taiyi-review-loop` · `@taiyi-review-check` · `@taiyi-health` · `@taiyi-gstack-review`
3. `loop` 进入 review 闭环模式（跨轮直到绿或 `stopomc`）
4. 高优 finding 必修；中优 warn-only

完整子命令地图：[canonical-commands.md §/taiyi:review 子命令地图](../docs/taiyi/canonical-commands.md)
