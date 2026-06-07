---
name: taiyi-orchestrator
description: TaiyiForge 全自动编排 — 按 harness 清单串联铁三角、辅助 Skill 与主流程（配合 init --auto）。
---

# taiyi-orchestrator

## 目的

在 **`init --auto`** 或 `TAIYI_AUTO_HARNESS=1` 下，由 Agent **按顺序自动执行**当前阶段全部步骤，对齐架构图「核心引擎统一调度」，无需用户手动挑库。

## 何时使用

- `state.json` 含 `"autoHarness": true`
- `scripts/taiyi-forge.sh next` 显示 `模式: 全自动`
- 用户要求「按图全自动跑 TaiyiForge」

## 输入

- `scripts/taiyi-forge.sh harness <slug>` 输出的清单
- 项目内 `.taiyi/changes/<slug>/`

## 执行步骤（每阶段循环）

### 0. 拉清单

```bash
scripts/taiyi-forge.sh harness <slug>
```

严格按 **§1 铁三角 → §2 辅助 → §3 主流程 → §4 complete** 顺序，**不得跳过**。

### 1. 铁三角（Agent 自动加载并执行）

| 工具 | 加载方式 | 示例 |
|------|----------|------|
| superpowers | Cursor 插件 Skill | `brainstorming`；**task+dev** `test-driven-development`（`/taiyi:tdd`）；`verification-before-completion`；Token 压缩见 **`subagent-driven-development`** / **`dispatching-parallel-agents`** |
| gstack | gstack Skill / 命令 | `plan-eng-review`、`plan-design-review`（ui 可选）、`qa`（test 可选）、`review`、`document-release`；Token 压缩见 **`checkpoint`** |
| taiyi | 辅助 Skill | **`taiyi-compress`** + `/taiyi:token compress` |
| openspec | shell（引擎可自动） | `openspec change show <slug>` |

每完成一项铁三角步骤，**必须打卡**：

```bash
scripts/taiyi-forge.sh harness-check <slug> superpowers/brainstorming
scripts/taiyi-forge.sh harness-check <slug> gstack/review
```

`complete` 在 auto 模式下会校验 `.harness-checkpoints.json`。

### 2. 辅助 Skill（taiyi-*）

对清单中 `[pending]` 的辅助 Skill：

1. 读取 `~/.cursor/skills/<skill>/SKILL.md`（或项目 skills 目录）
2. 产出对应工件（如 `CONTEXT.md`、`health-report.md`）
3. 工件存在后引擎会自动 `mark-aux`；也可手动：

```bash
scripts/taiyi-forge.sh mark-aux <slug> taiyi-intel-scan
```

### 3. 主流程 Skill

执行当前阶段主 Skill（如 `taiyi-change`），填满工件至 `quality就绪: 是`。

### 4. 过关

```bash
scripts/taiyi-forge.sh complete <slug> <phase>
scripts/taiyi-forge.sh harness <slug>   # 下一阶段重复 0–4
```

integration 完成后，引擎在 auto 模式下自动尝试 `sync-openspec`（若检测到 OpenSpec）。

## 完整开源流程（推荐）

按 **`docs/taiyi/full-oss-flow.md`** 每阶段加载全部 Skill：

| 阶段 | 除主 Skill 外还应执行 |
|------|----------------------|
| change | brainstorming · taiyi-intel-scan |
| requirement | writing-plans · openspec（可选） |
| design | gstack plan-eng-review · taiyi-architect |
| ui-design | gstack plan-design-review · web-quality * |
| task | writing-plans + TDD plan |
| dev | TDD dev · npm test |
| test | verification · gstack qa · playwright · web-quality |
| review | taiyi-health · requesting-code-review · gstack review · semgrep · trivy |
| integration | finishing-a-development-branch · verification · document-release · audit |

聊天入口：`/taiyi:full-flow`。optional 钩子建议全部打卡，未装 CLI 可跳过。

## 与 Cursor / Superpowers

- change → **必须**先 `brainstorming` 再写 CHANGE
- dev → 配合 `test-driven-development`
- test → 配合 `verification-before-completion` + 全部 test 阶段外挂

加载方式：在对话中 invoke 对应 Skill，完成后 `harness-check` 打卡。

## 禁止

- auto 模式下跳过铁三角直接 `complete`（引擎会拒绝）
- 不打卡就声称已完成铁三角步骤
- 辅助工件缺失时强行 complete

## 质量自检

- [ ] `harness` 清单 §1 全部打卡
- [ ] §2 辅助无 pending（或工件已生成）
- [ ] §3 主工件 quality 就绪
- [ ] `complete` 成功后再进入下一阶段
