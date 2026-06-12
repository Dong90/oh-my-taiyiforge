# v28-all-slashes-demo — 28 v28 顶栏斜杠全跑通

跑全 **28 条 v28 顶栏斜杠** · **真实 cmd 调用** + **真实引擎输出** · 1013 行落 `output/demo.log`。

## 用法

```bash
# 在仓库根
bash examples/v28-all-slashes-demo/scripts/run-v28-all-slashes.sh

# 完整输出
cat examples/v28-all-slashes-demo/output/demo.log
```

## 28 顶栏分组 · 真实调用对照表

| v28 # | 斜杠 | 分组 | 真实调用（demo 里跑过） | 真源 |
|-------|------|------|------------------------|------|
| 1 | `/taiyi:new` | Main chain | `bash scripts/taiyi-forge.sh new "demo: 跑全 28 v28 顶栏斜杠" --profile lite` | `prompts/taiyi-new.md` |
| 2 | `/taiyi:status` | Main chain | `bash scripts/taiyi-forge.sh status demo-28-v28 --json --compact` | `prompts/taiyi-status.md` |
| 3 | `/taiyi:write` | Main chain | `cat prompts/taiyi-write.md`（chat-only · 九阶段统一写工件入口） | `prompts/taiyi-write.md` |
| 4 | `/taiyi:continue` | Main chain | `bash scripts/taiyi-forge.sh complete demo-28-v28 change --approver "demo"` + 多次 `continue` | `prompts/taiyi-continue.md` |
| 5 | `/taiyi:apply` | Main chain | `cat prompts/taiyi-apply.md`（dev/test harness 清单） | `prompts/taiyi-apply.md` |
| 6 | `/taiyi:archive` | Main chain | `bash scripts/taiyi-forge.sh archive demo-28-v28`（九阶段完成后） | `prompts/taiyi-archive.md` |
| 7 | `/taiyi:handoff` | Session | `cat prompts/taiyi-handoff.md` | `prompts/taiyi-handoff.md` |
| 8 | `/taiyi:resume` | Session | `cat prompts/taiyi-resume.md` | `prompts/taiyi-resume.md` |
| 9 | `/taiyi:cancel` | Session | `cat prompts/taiyi-cancel.md` | `prompts/taiyi-cancel.md` |
| 10 | `/taiyi:list` | Session | `bash scripts/taiyi-forge.sh list --all` | `prompts/taiyi-list.md` |
| 11 | `/taiyi:doctor` | Diagnose | `bash scripts/taiyi-forge.sh doctor --json --compact` | `prompts/taiyi-doctor.md` |
| 12 | `/taiyi:audit` | Diagnose | `bash scripts/taiyi-forge.sh audit --json --compact` | `prompts/taiyi-audit.md` |
| 13 | `/taiyi:verify` | Diagnose | `bash scripts/taiyi-forge.sh verify`（PR 工件门禁） | `prompts/taiyi-verify.md` |
| 14 | `/taiyi:commit` | Delivery | `cat prompts/taiyi-commit.md`（带 Taiyi-Change trailer） | `prompts/taiyi-commit.md` |
| 15 | `/taiyi:ship` | Delivery | `cat prompts/taiyi-ship.md`（= gstack/ship） | `prompts/taiyi-ship.md` |
| 16 | `/taiyi:land` | Delivery | `cat prompts/taiyi-land.md`（= gstack/land-and-deploy） | `prompts/taiyi-land.md` |
| 17 | `/taiyi:release` | Delivery | `cat prompts/taiyi-release.md`（= gstack/document-release） | `prompts/taiyi-release.md` |
| 18 | `/taiyi:gstack` | Routing | `cat prompts/taiyi-gstack.md`（如 `gstack/review` · `gstack/qa`） | `prompts/taiyi-gstack.md` |
| 19 | `/taiyi:sp` | Routing | `cat prompts/taiyi-sp.md`（如 `superpowers/brainstorming`） | `prompts/taiyi-sp.md` |
| 20 | `/taiyi:explore` | Stage shortcut | `cat prompts/taiyi-explore.md`（→ Superpowers brainstorming） | `prompts/taiyi-explore.md` |
| 21 | `/taiyi:tdd` | Stage shortcut | `cat prompts/taiyi-tdd.md`（→ TDD 红绿 plan\|dev） | `prompts/taiyi-tdd.md` |
| 22 | `/taiyi:flow` | Stage shortcut | `cat prompts/taiyi-flow.md`（feature \| bug \| full-flow \| help） | `prompts/taiyi-flow.md` |
| 23 | `/taiyi:token` | Umbrella | `bash scripts/taiyi-forge.sh token status` + `token record` + `cat prompts/taiyi-token-compress.md` | 顶层缺 · 子命令 `token-status` `token-record` `token-compress` `token-scan` |
| 24 | `/taiyi:test` | Umbrella | `ls prompts/ \| grep -E '^taiyi-(browser-smoke\|e2e\|ui-test\|security\|smoke)'` | 顶层缺 · legacy 子命令真源 |
| 25 | `/taiyi:review` | Umbrella | `ls prompts/ \| grep -E '^taiyi-(review-loop\|review-check\|health\|gstack-review)'` | 顶层缺 · legacy 子命令真源 |
| 26 | `/taiyi:diagram` | Umbrella | `ls prompts/ \| grep -E '^taiyi-diagram-(pipeline\|c4\|arch\|render\|flow)'` | 顶层缺 · legacy 子命令真源 |
| 27 | `/taiyi:mode` | Umbrella | `ls prompts/ \| grep -E '^taiyi-(ralph\|autopilot\|daemon\|team\|ultrawork\|agent\|step\|stop-mode\|modes\|keyword\|preflight)'` | 顶层缺 · legacy 子命令真源 |
| 28 | `/taiyi:workflow` | Umbrella | `ls prompts/ \| grep -E '^taiyi-(plan\|ralplan\|loop\|check\|run\|sync\|ccg\|sciomc\|deepinit\|remember\|ultraqa\|external-context\|deep-interview\|visual-verdict\|ai-slop-cleaner\|ecomode)'` | 顶层缺 · legacy 子命令真源 |

## 引擎 vs 聊天分层

- **engine-backed（真 shell 命令）**：`new` · `status` · `continue` · `complete` · `list` · `doctor` · `audit` · `verify` · `token status/record/compress/scan` · `archive`
- **chat-only slash（IDE 菜单 + 真源 prompt）**：`write` · `apply` · `handoff` · `resume` · `cancel` · `commit` · `ship` · `land` · `release` · `gstack` · `sp` · `explore` · `tdd` · `flow` · umbrella（test/review/diagram/mode/workflow）· `token compress` · `gstack/release`

umbrella v28 Phase 1：顶层**无独立 prompt**，Agent 按 [canonical-commands.md §伞形命令·子命令地图](../../docs/taiyi/canonical-commands.md) 加载 legacy 子命令 prompt（见 §7 输出）。

## 输出样本

```text
$ bash scripts/taiyi-forge.sh doctor --json --compact
{
  "ok": true,
  "version": "0.23.1",
  "installOk": true,
  "workspaceOk": false,
  "failed": [
    { "id": "workflow-active-count", "detail": "多个 active ... 须 /taiyi:list 并指定 slug" },
    { "id": "project-wrapper", "detail": "wrapper 为旧版完整脚本，建议升级为 shim" },
    { "id": "consumer-cli-resolvable", "detail": "无法解析 taiyi CLI" },
    { "id": "workflow-infer-slug", "detail": "有 4 个进行中的变更 ..." }
  ]
}

$ bash scripts/taiyi-forge.sh status demo-28-v28 --json --compact
{
  "engineTruth": {
    "slug": "demo-28-v28",
    "workflowStatus": "active",
    "displayPhase": "change",
    "currentPhase": "change",
    "completedPhases": [],
    "profile": "lite",
    "autoHarness": false,
    "qualityReady": false,
    "requiresHumanGate": true,
    "nextAction": "dev 前勿改业务代码；撤销或暂存改动后再推进。",
    "earlyCodeWarning": "examples/v28-all-slashes-demo/scripts/run-v28-all-slashes.sh"
  }
}
```

## 关联

- 上游真源：[docs/taiyi/canonical-commands.md](../../docs/taiyi/canonical-commands.md) → `canonical_v28`
- 引擎 CLI：`scripts/taiyi-forge.sh`（agent 代跑，本脚本也直接调）
- 聊天 prompt 真源：`prompts/taiyi-*.md`（安装时同步到 Claude / Codex / Cursor / OpenCode 四端）
- 同步示例：`examples/full-flow-demo/`（九阶段 + 29 agent 角色）· `examples/commands-smoke/`
