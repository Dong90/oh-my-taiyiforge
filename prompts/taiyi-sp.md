---
description: "TaiyiForge /taiyi:sp — load any Superpowers Skill by name"
argument-hint: "<skill> e.g. writing-skills brainstorming test-driven-development"
---
User invoked **$taiyi-sp** (= `/taiyi:sp $ARGUMENTS`). 加载 **Superpowers `$ARGUMENTS`** Skill（第一个词为 skill 名）。

**14 技能：** `using-superpowers` · `brainstorming` · `writing-plans` · `using-git-worktrees` · `test-driven-development` · `subagent-driven-development` · `dispatching-parallel-agents` · `executing-plans` · `verification-before-completion` · `systematic-debugging` · `requesting-code-review` · `receiving-code-review` · `finishing-a-development-branch` · **`writing-skills`**（维护 Skill 元技能）

**步骤：**

1. `/taiyi:status [slug]`（若与当前变更相关）
2. 加载 **Superpowers `<skill>`** Skill
3. 按 Skill 要求产出（spec/plan/测试证据/CR 处理等）
4. auto 模式：`scripts/taiyi-forge.sh harness-check <slug> superpowers/<skill>`

快捷：`/taiyi:explore` → brainstorming · `/taiyi:tdd plan|dev` → TDD · `/taiyi:flow` → 阶段推荐表

{{TAIYI_STAGE_PROTOCOL}}

{{SUPERPOWERS_INVOKE}}
