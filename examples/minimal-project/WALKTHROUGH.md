# minimal-project 步骤清单（与 run-full-flow.mjs 对齐）

## 一键命令

| 命令 | 说明 |
|------|------|
| `npm run walkthrough` | 九阶段 shell 全流程（31 步，含铁三角打卡演示） |
| `npm run chat-demo` | 聊天动词演示：`/taiyi:new` · `status` · `check` · `continue`（不过九阶段） |

前置：在仓库根目录 `npm run build`（链本地 `TAIYI_FORGE_ROOT` 时必需）。

---

## walkthrough 步骤表

| 步骤 | 命令 / 动作 | 结果 | 💬 聊天等价 |
|------|-------------|------|-------------|
| 0 | `taiyi-forge.sh doctor` | PASS（16 skills 四端 + 控制面） | `/taiyi:doctor` |
| 1 | `taiyi init minimal-demo --auto` | 创建变更，`autoHarness: true`；**意图分析**行 | `/taiyi:new …` |
| 2 | `taiyi harness minimal-demo` | change：brainstorming + intel-scan | `/taiyi:check` |
| 3 | 写 `CONTEXT.md` + `mark-aux taiyi-intel-scan` | 辅助完成 | — |
| 4 | `harness-check superpowers/brainstorming` | 铁三角打卡（**必选**） | — |
| 5 | 填 `CHANGE.md` → `complete change` | → requirement | `/taiyi:continue` |
| 6–7 | requirement → complete | OpenSpec 钩子 **(可选)**，无 CLI 不阻塞 | `/taiyi:continue` |
| 8–10 | design：`adr/` + `plan-eng-review` 打卡 → complete | → ui-design | `/taiyi:continue` |
| 11–12 | ui-design：`ui-restyle-tasks.md` + `UI-DESIGN.md` → complete | **`plan-design-review` 可选**，本 demo 不打卡可过关 | `/taiyi:continue` |
| 13–14 | task → complete | → dev | `/taiyi:continue` |
| 15–18 | dev：TDD 打卡 + `npm test` → complete | → test | `/taiyi:apply` |
| 19–22 | test：verification 打卡 + **gstack/qa 演示打卡** → complete | **`gstack/qa` 可选**（演示仍打卡） | `/taiyi:apply` |
| 23–25 | review：`health-report.md` + `gstack/review` → complete | → integration | `/taiyi:continue` |
| 26–28 | integration：`document-release` → `CHANGELOG.md` → complete | 9/9 完成 | `/taiyi:continue` |
| 29–31 | `list` · `ci verify` · `status` | PASS；status 含意图分析 | `/taiyi:status` · `/taiyi:archive` |

---

## optional 铁三角（本 demo 行为）

| 阶段 | 钩子 | walkthrough 是否打卡 | `--auto` 不打卡能否 complete |
|------|------|----------------------|------------------------------|
| requirement | OpenSpec | 否（未装则跳过） | 是 |
| ui-design | gstack/plan-design-review | **否**（演示 optional） | 是 |
| test | gstack/qa | **是**（演示用法） | 是 |
| integration | OpenSpec archive | 否 | 是 |

必选示例：change `superpowers/brainstorming`、design `gstack/plan-eng-review`、review `gstack/review`、integration `gstack/document-release`。

---

## chat-demo 步骤（4 步）

1. **`/taiyi:new Chat Verb Demo`** → `init --auto` 创建 `chat-verb-demo`
2. **`/taiyi:status`** → 进度 + 意图分析 + 待完善提示
3. **`/taiyi:check`** → harness 清单（brainstorming 未打卡 → 阻塞）
4. **`/taiyi:continue`** → 因铁三角未打卡，输出指引而非过关

完整九阶段请运行 `npm run walkthrough`。

---

## 审计对照

架构缺口与验证命令见 [`docs/GAP-CLOSURE.md`](../../docs/GAP-CLOSURE.md)。
