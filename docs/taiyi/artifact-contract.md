# 工件契约（Zod + hbs + md）

> **何时读**：写/改 `.taiyi/changes/<slug>/` 下阶段工件前。引擎实现见 `src/core/artifact-seed.ts` · `artifact-sync.ts` · `artifact-render.ts`。

## 三层分工

| 层 | 位置 | 职责 |
|----|------|------|
| **`{phase}.json`** | 变更目录 | **语义真源** — Zod schema（`src/schemas/`）校验、过关门禁 |
| **`src/templates/{phase}.hbs`** | 引擎包 | **版式真源** — Handlebars 把 json 渲染成 md |
| **`{PHASE}.md`** | 变更目录 | **生成视图** — 人读、PR review；由 json 渲染，勿手改标题结构 |
| **`skills/taiyi-*`** | 仓库 | **流程真源** — 门禁、纪律、下游衔接（不重复贴 md 大纲） |

**dev 阶段例外**：无 json 视图，过关证据为 `.dev-complete`（命令 + `exitCode: 0`）。

## 默认工作流

```text
new / write seed
    → {phase}.json（Zod 骨架）+ {PHASE}.md（hbs 渲染，带 seed 标记）
Agent 编辑 json
    → taiyi render [slug] [phase]   # 显式刷新 md（Zod 校验 + 去 seed）
    → taiyi status --json --compact
    → taiyi continue
```

### 自动同步（无需每次 render）

- **`syncMarkdownFromJsonIfStale`**（`continue` 过关前）：json 变了且 md 仍是 seed/上次快照 → 重渲染 md。
- **保护手改 md**：md hash 与快照不一致 → **不覆盖**（避免冲掉人工编辑）。
- **`autoSyncLocalEdits`**：人只改 md 时，可把内容拉回 json（reverse-sync）。

### 显式 render 何时用

- 改完 json 想立刻看 md（过关前预览）。
- `status` 报 json/md 不一致且自动 sync 未触发。
- CI/脚本强制刷新视图。

```bash
scripts/taiyi-forge.sh render <slug> <phase>
# 省略 phase → 当前阶段；dev 无此命令
```

## 阶段 → json / md / schema

| 阶段 | json | md | Zod schema |
|------|------|-----|------------|
| change | `change.json` | `CHANGE.md` | `src/schemas/change.ts` |
| requirement | `requirement.json` | `REQUIREMENT.md` | `src/schemas/requirement.ts` |
| design | `design.json` | `DESIGN.md` | `src/schemas/design.ts` |
| ui-design | `ui-design.json` | `UI-DESIGN.md` | `src/schemas/ui-design.ts` |
| task | `task.json` | `TASK.md` | `src/schemas/task.ts` |
| test | `test.json` | `TEST.md` | `src/schemas/test.ts` |
| review | `review.json` | `REVIEW.md` | `src/schemas/review.ts` |
| integration | `integration.json` | `CHANGELOG.md`（变更目录内） | `src/schemas/integration.ts` |
| dev | — | `.dev-complete` | `artifact-validator` 专用规则 |

变更目录内 `CHANGELOG.md`（integration）与**项目根** `CHANGELOG.md` 分开：过关校验前者；`archive` 可合并到根。

## 模板目录说明

| 目录 | 格式 | 角色 |
|------|------|------|
| **`src/templates/`** | `.hbs` + `prompts/` | 开发与 npm 包内 canonical hbs |
| **`templates/`**（仓库根） | `.md` 仅 | legacy seed 兜底；`prepublishOnly` 会同步 `.hbs` 到此处 |

日常路径：**json + hbs 渲染**，不再手维护根 `templates/*.md` 空壳。

## Agent 纪律

1. **优先改 json**，再 `render`；不要跳过 Zod 直接手改 md 结构过关。
2. 写作细则在 **`skills/taiyi-<phase>`**，不在本文件重复。
3. `status --json --compact` → `engineTruth` 是过关真源。
4. 长会话读 `PHASE-CONTEXT.md` / `CONTEXT-COMPACT.md`，勿全量读上游 md。
