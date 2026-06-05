# minimal-project 全流程演示（Cursor + --auto）

变更 slug：`minimal-demo` · profile：`full` · 模式：`init --auto`

## 一键复现

```bash
cd examples/minimal-project
npm install
npm test
node scripts/run-full-flow.mjs
```

## 步骤清单

| 步骤 | 命令 / 动作 | 结果 |
|------|-------------|------|
| 0 | `taiyi-forge.sh doctor` | PASS（16 skills 四端 + 控制面） |
| 1 | `taiyi init minimal-demo --auto` | 创建 `.taiyi/changes/minimal-demo/`，`autoHarness: true` |
| 2 | `taiyi harness minimal-demo` | change：铁三角 brainstorming + 辅助 intel-scan |
| 3 | 写 `CONTEXT.md` + `mark-aux taiyi-intel-scan` | 辅助完成 |
| 4 | `harness-check superpowers/brainstorming` | 铁三角打卡 |
| 5 | 填 `CHANGE.md` → `complete change` | → requirement |
| 6–7 | requirement 填 `REQUIREMENT.md` → complete | → design |
| 8–10 | design：`adr/` + harness-check gstack/plan-eng-review → complete | → ui-design |
| 11–12 | ui-design：`ui-restyle-tasks.md` + `UI-DESIGN.md` → complete | → task |
| 13–14 | task → complete | → dev |
| 15–18 | dev：TDD 打卡 + `npm test` → `.dev-complete` → complete | → test |
| 19–21 | test：`architecture-sync.md` + verification 打卡 → complete | → review |
| 22–24 | review：`health-report.md` + gstack/review 打卡 → complete | → integration |
| 25–27 | integration：document-release 打卡 → `CHANGELOG.md` → complete | 9/9 完成，`workflowStatus: completed` |
| 29 | `taiyi ci verify --slug minimal-demo` | PASS |

## 产出物

```
examples/minimal-project/
├── src/counter.js
├── test/counter.test.js
└── .taiyi/changes/minimal-demo/
    ├── state.json
    ├── .harness-checkpoints.json
    ├── CONTEXT.md
    ├── adr/001-counter-module.md
    ├── CHANGE.md … CHANGELOG.md
    ├── ui-restyle-tasks.md
    ├── architecture-sync.md
    ├── health-report.md
    └── .dev-complete
```

## 演示中发现的 Bug / 改进点

### 已修复（v0.17.x 本地）

| 问题 | 原因 | 修复 |
|------|------|------|
| **change 阶段误要求 `taiyi-architect`** | `assessComplexity` 的 `recommendedSkills` 被合并进**当前阶段**辅助列表 | `auxiliary-hints.ts`：推荐 Skill 仅在其所属阶段生效 |
| 测试 | `tests/harness.test.ts` 新增用例 | medium 复杂度 change 阶段不再出现 architect |

### 已修复（v0.18 体验）

| 问题 | 修复 |
|------|------|
| review `taiyi-health` 重复 | 从铁三角移除，仅保留 §2 辅助 + `health-report.md` |
| 完成后 `currentPhase` 显示 integration | 新增 `workflowStatus: completed`；`list`/`next`/`ci` 显示 `completed` |
| integration 易漏 harness-check | harness §4 增加过关清单 + `→ 下一命令` 提示 |
| `init` 默认 JSON | 默认输出与 `taiyi next` 同风格的纯文本 guide |
