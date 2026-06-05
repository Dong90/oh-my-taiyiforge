# minimal-project 步骤清单（与 run-full-flow.mjs 对齐）

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
| 25–27 | integration：document-release 打卡 → `CHANGELOG.md` → complete | 9/9 完成 |
| 28 | `taiyi ci verify --slug minimal-demo` | PASS |

一键复现：`npm run walkthrough`
