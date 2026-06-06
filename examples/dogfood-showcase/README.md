# Dogfood Showcase — 引擎修复 + storyflow Remediation

本目录记录 **oh-my-taiyiforge 引擎修复** 与 **storyflow-studio-modular** 现场问题的对照演示。

## 引擎修复（本仓库 `src/`）

| 能力 | 文件 |
|------|------|
| legacy state 兼容 | `src/core/normalize-state.ts` |
| integration 交付门 | `src/core/gates/delivery-gate.ts` |
| 占位符校验收紧 | `src/core/artifact-validator.ts` |
| `recommendedSkills` 防御 | `src/core/routing/auxiliary-hints.ts` |

### 验证命令

```bash
cd oh-my-taiyiforge
npm run build && npm test

# storyflow 上 status 不再崩溃
TAIYI_FORGE_ROOT=$PWD/scripts/taiyi-forge.sh \
  /path/to/oh-my-taiyiforge/scripts/taiyi-forge.sh status novel-derive-graphics-commentary
```

## storyflow：state.json 修复

**Before（非法）：**

```json
"currentPhase": "complete",
"complexity": "medium"
```

**After（引擎可读）：**

```json
"currentPhase": "integration",
"workflowStatus": "completed",
"complexity": { "level": "medium", "score": 8, "recommendedSkills": [] }
```

## storyflow：scope 脚本

`scripts/check-novel-derive-scope.sh` 须检查：

- `git diff $BASE...HEAD`（已提交）
- `git diff` / `git diff --cached`（工作区）
- `git ls-files --others --exclude-standard`（未跟踪）

未 commit 时不再误报 `OK (0 files)`。

## storyflow：Commit 方案（按 TASK PR-1～4）

| 顺序 | Commit / PR | 内容 |
|------|-------------|------|
| 1 | PR-1 | T0 门禁 + T1 compileSlotPrompt + T2 模板/NOTICE |
| 2 | PR-2 | T3 BFF bundle + T4 解说 derive API |
| 3 | PR-3 | T5 衍生解说 UI + T6 图文 derive API |
| 4 | PR-4 | T7 配套图文 UI + T8 e2e |
| 5 | chore | `.taiyi/changes/novel-derive-graphics-commentary/` + `openspec/changes/archive/...` |
| 6 | post-merge | 根 `CHANGELOG.md` + 回写 `CHANGE.md` checkbox → 再跑 integration/archive |

### 示例命令（PR-1）

```bash
cd storyflow-studio-modular
git checkout -b feat/novel-derive-p0

git add docs/third-party/garden-skills-NOTICE.md
git add apps/web/src/app/modules/graphics/data/compileSlotPrompt*
git add apps/web/src/app/modules/graphics/data/prompt_templates.json
git add apps/web/src/app/modules/graphics/data/graphicsImageUtils.ts
git add scripts/check-novel-derive-scope.sh

git commit -m "feat(graphics): P0 compileSlotPrompt + scope gate + garden NOTICE"
```

PR 前重跑：

```bash
./scripts/check-novel-derive-scope.sh
go test ./internal/modules/gateway-bff/... -count=1
cd apps/web && npm test -- compileSlotPrompt
```

## taiyitest 演示（ty-55so5oi3）

补全 `REQUIREMENT.md` / `DESIGN.md` 后，旧版引擎会误标「质量就绪」；新版校验会要求实质内容再过关。

```bash
cd taiyitest
TAIYI_FORGE_ROOT=../oh-my-taiyiforge/scripts/taiyi-forge.sh \
  ../oh-my-taiyiforge/scripts/taiyi-forge.sh status ty-55so5oi3
```
