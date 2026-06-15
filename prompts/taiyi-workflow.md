---
description: "TaiyiForge /taiyi:workflow — 工作流扩展 umbrella · plan / ralplan / loop / sync 等"
argument-hint: "<plan|ralplan|loop|check|run|sync|ccg|sciomc|deepinit|remember|ultraqa|external-context|deep-interview|visual-verdict|ai-slop-cleaner|ecomode> [args]"
---
User invoked **$taiyi-workflow** (= `/taiyi:workflow $ARGUMENTS`). **工作流扩展 umbrella · 拆给 N 个子命令 prompt**：

| 子命令 | legacy 斜杠 | 真源 prompt | 说明 |
|--------|------------|------------|------|
| `plan` | `/taiyi:plan` | `prompts/taiyi-plan.md` | 写实施计划（bite-sized tasks） |
| `ralplan` | `/taiyi:ralplan` | `prompts/taiyi-ralplan.md` | plan + WIP 模式 |
| `loop` | `/taiyi:loop` | `prompts/taiyi-loop.md` | `xN` 后缀循环（continue/apply/check） |
| `check` | `/taiyi:check` | `prompts/taiyi-check.md` | harness-check 单次 |
| `run` | `/taiyi:run` | `prompts/taiyi-run.md` | run harness Skill |
| `sync` | `/taiyi:sync` | `prompts/taiyi-sync.md` | sync wrapper / roles yaml |
| `ccg` | `/taiyi:ccg` | `prompts/taiyi-ccg.md` | code-change guard |
| `sciomc` | `/taiyi:sciomc` | `prompts/taiyi-sciomc.md` | sci-omc bridge |
| `deepinit` | `/taiyi:deepinit` | `prompts/taiyi-deepinit.md` | 深度 init（多轮项目扫描） |
| `remember` | `/taiyi:remember` | `prompts/taiyi-remember.md` | 写入 `.taiyi/memory/` |
| `ultraqa` | `/taiyi:ultraqa` | `prompts/taiyi-ultraqa.md` | ultra-QA（多维质量门禁） |
| `external-context` | `/taiyi:external-context` | `prompts/taiyi-external-context.md` | 外部上下文（PR/issue） |
| `deep-interview` | `/taiyi:deep-interview` | `prompts/taiyi-deep-interview.md` | 深度访谈（需求澄清） |
| `visual-verdict` | `/taiyi:visual-verdict` | `prompts/taiyi-visual-verdict.md` | 视觉评审 |
| `ai-slop-cleaner` | `/taiyi:ai-slop-cleaner` | `prompts/taiyi-ai-slop-cleaner.md` | AI 代码 slop 清理 |
| `ecomode` | `/taiyi:ecomode` | `prompts/taiyi-ecomode.md` | 经济模式（省 token） |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由到对应子命令 prompt
2. 加载对应 `@taiyi-{workflow 子命令}` Skill
3. 多数为 harness / 协议层辅助；与主链九阶段独立

完整子命令地图：[canonical-commands.md §/taiyi:workflow 子命令地图](../docs/taiyi/canonical-commands.md)
