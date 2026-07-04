# System Context — oh-my-taiyiforge

> C4 Level 1 · 更新：2026-06-08

```mermaid
C4Context
  title System Context — TaiyiForge (oh-my-taiyiforge)

  Person(dev, "开发者", "在业务仓库中驱动九阶段变更")
  Person(reviewer, "审批人", "change / design / review 人工门")

  System(taiyiforge, "TaiyiForge", "九阶段工件契约 · 引擎门禁 · 四端 Skill 同步")

  System_Ext(opencode, "OpenCode", "npm 插件宿主")
  System_Ext(claude, "Claude Code", "Skills + hooks")
  System_Ext(codex, "Codex", "Skills + prompts")
  System_Ext(cursor, "Cursor", "Skills + commands + MCP 模板")
  System_Ext(git, "Git 仓库", "业务代码 + .taiyi/changes/")
  System_Ext(oss, "可选开源外挂", "Superpowers · OpenSpec")

  Rel(dev, taiyiforge, "加载 Skill / 斜杠命令", "聊天")
  Rel(dev, git, "提交代码与工件")
  Rel(reviewer, taiyiforge, "审批人工门", "聊天 / CLI --approver")
  Rel(taiyiforge, git, "读写 .taiyi/ · 校验 delivery-gate")
  Rel(opencode, taiyiforge, "taiyi_* 插件工具", "in-process")
  Rel(claude, taiyiforge, "taiyi-forge.sh / Skills", "Bash + 聊天")
  Rel(codex, taiyiforge, "$taiyi-* prompts", "聊天")
  Rel(cursor, taiyiforge, "/taiyi:* + taiyi-mcp", "聊天 + MCP")
  Rel(taiyiforge, oss, "harness 可选钩子", "Skill / CLI")
```

## Notes

- TaiyiForge **不是**用户业务应用；它是安装在开发者工作区中的**工作流引擎 + Skill 包**。
- 四端为 **外部系统**（不同 AI IDE/CLI），通过统一契约 `skills/`、`prompts/`、`scripts/taiyi-forge.sh` 对齐。
