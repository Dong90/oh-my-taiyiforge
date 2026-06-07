---
description: "TaiyiForge /taiyi:ship — gstack ship: test, review diff, push, open PR"
argument-hint: "[optional PR title hint]"
---
User invoked **$taiyi-ship** (= `/taiyi:ship`). **创建 PR 工作流** — 加载 **gstack `ship`** Skill，无 TaiyiForge 引擎子命令。

## 前置

```bash
scripts/taiyi-forge.sh status
scripts/taiyi-forge.sh verify
```

实现代码应已 commit；review 阶段建议已 `/taiyi:review-loop` 通过。

## 执行

1. 加载 **gstack `ship`**（见下方 gstack 加载协议）。
2. 按 ship Skill 完整流程：合并 base · 跑测试 · review diff · 必要时 bump VERSION/CHANGELOG · **push · 创建 PR**。
3. 不要跳过 ship Skill 直接 `gh pr create`（除非 ship 不可用且用户明确要求）。

PR 创建后：用户或 Agent 可用 `/taiyi:land` 合并与部署。

{{TAIYI_STAGE_PROTOCOL}}

{{GSTACK_INVOKE}}
