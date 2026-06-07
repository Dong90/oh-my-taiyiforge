# 架构审计缺口 · 补齐对照表

> 一页速查：审计项 → 实现位置 → 如何验证。对应版本 **0.22.0**。

真源目录：`.taiyi/changes/<slug>/`。铁三角在**聊天**加载 Skill，在 **`--auto`** 模式用 `harness-check` 打卡；optional 钩子**不阻塞** `complete`。

---

## 总体验证

```bash
cd oh-my-taiyiforge
npm run build && npm test

cd examples/minimal-project
npm run walkthrough    # 九阶段 shell E2E + 铁三角
npm run chat-demo      # /taiyi:new · status · check · continue 演示
```

消费方项目统一入口（`taiyi-forge-install` 后自动写入）：

```bash
scripts/taiyi-forge.sh status [slug]
scripts/taiyi-forge.sh audit [slug]
```

---

## 对照表

| # | 审计项 | 严重度 | 实现 / 文档 | 验证 |
|---|--------|--------|-------------|------|
| 1 | test 阶段 **gstack/qa** 未挂 harness | 中 | `docs/taiyi/workflow-manifest.yaml`（test · `optional: true`）<br>`docs/taiyi/integrations.md`<br>`skills/taiyi-test/SKILL.md`<br>walkthrough 步骤 21 演示打卡 | `npm test` → `tests/harness-hooks.test.ts`<br>walkthrough test 阶段可见 `gstack/qa (可选)`<br>不打卡也可 `complete test` |
| 2 | ui-design **plan-design-review** 仅 Skill 可选 | 低 | `workflow-manifest.yaml` ui-design · optional<br>`skills/taiyi-ui-design/SKILL.md`<br>`skills/taiyi-orchestrator/SKILL.md` | walkthrough 步骤 11–12：清单标 `(可选)`，无打卡可过关 |
| 3 | **OpenSpec** 全程可选 | 低（设计） | requirement/integration `optional: true`<br>`docs/ARCHITECTURE.md` · `workflow.md` §可选层<br>`src/integrations/harness-hooks.ts` notes | 未装 `openspec` CLI 时 requirement harness 无阻塞项 |
| 4 | **`/taiyi:explore`** 仅文档 | 低 | `prompts/taiyi-explore.md`<br>`docs/taiyi/commands.yaml`<br>根 `README.md` 辅助命令 | Cursor：`/taiyi:explore 主题` → 加载 brainstorming + taiyi-change |
| 5 | **聊天路径** E2E | 低 | `examples/minimal-project/scripts/run-chat-demo.mjs`<br>`run-full-flow.mjs` 每步 💬 聊天等价 | `npm run chat-demo` |
| 6 | **`templates/CONTEXT.md`** 无独立模板 | 极低 | `templates/CONTEXT.md`<br>`src/core/template-seed.ts`<br>`skills/taiyi-intel-scan/SKILL.md` | `npx taiyi init x --title t` → 变更目录含 CONTEXT 种子（若 seed 启用） |
| 7 | 图 footer **「知识沉淀」** | —（愿景） | `docs/ARCHITECTURE.md` §知识沉淀：adr / CONTEXT / CHANGELOG / sync-openspec | 文档说明即可，无独立自动化模块 |
| + | **意图分析**（架构图引擎） | — | `src/core/routing/infer-complexity.ts`<br>`src/core/format-guide.ts`「意图分析: …」<br>`docs/ARCHITECTURE.md` 核心引擎表 | `npx taiyi status <slug>` 或 walkthrough 步骤 1 输出含「意图分析」 |
| **0.22** | **流程句号 ≠ 交付句号** | **P0** | `complete integration` 前自动 `auditChange({ pretendIntegrationComplete })`<br>`src/core/workflow-engine.ts`<br>`src/core/gates/delivery-gate.ts` | `tests/integration-gates.test.ts` · git 无新 commit 时 `complete integration` 被拦 |
| **0.22** | **archive 首次失败** | **P0** | `taiyiArchive` 前自动 `sync-openspec`（`handlers.ts`） | `tests/integration-gates.test.ts` · openspec 无 change 目录时先同步 |
| **0.22** | **消费方 wrapper** | **P1** | `src/install/sync-project-wrapper.ts` · `taiyi-forge-install` 写入 `scripts/taiyi-forge.sh` | 项目根 `package.json` 或 `.taiyi/` 存在时安装 |
| **0.22** | **`/taiyi:health`** | **P1** | `prompts/taiyi-health.md` · `taiyi health` · `src/core/health-invoke.ts` | 对齐 `taiyi-health` Skill → `health-report.md` |
| **0.22** | **根 CHANGELOG 同步** | **P2** | `src/core/sync-root-changelog.ts` · integration complete 后合并 | `tests/integration-gates.test.ts` |
| **0.22** | **排查命令体系** | — | `/taiyi:audit` · `/taiyi:verify`（= `ci verify`）<br>`src/core/workflow-audit.ts` · `src/core/ci-verify.ts` | `taiyi audit` / `taiyi verify` · 见 `prompts/taiyi-audit.md` |
| **0.22+** | **integration 前勾选 AC** | **P1** | `workflow-audit.ts` · `pretendIntegrationComplete` 不再跳过 open checkbox | `tests/integration-gates.test.ts` · `ac.open-before-integration` |
| **0.22+** | **dev 测试证据** | **P1** | `src/core/dev-complete.ts` · `artifact-validator.ts` 默认要求 `command:` + `exitCode: 0` | `tests/dev-complete.test.ts` |
| **0.22+** | **init/new autoHarness 一致** | **P1** | `resolve-auto-harness.ts` · `init` 默认关、`new` 默认开 · `--no-auto` / `TAIYI_AUTO_HARNESS` | `tests/resolve-auto-harness.test.ts` |
| **0.22+** | **medium 须 taiyi-health** | **P2** | `workflow-engine.ts` · `complexity.ts` · `phase-guide.ts` | `tests/profile-workflow.test.ts` |
| **0.22+** | **dev phase-guide 质量校验** | **P2** | `phase-guide.ts` code 阶段走 `validateArtifactFile` | `npx taiyi guide <slug>` dev 阶段 qualityHints |
| **0.22+** | **交付验证命令** | **P2** | `TAIYI_DELIVERY_VERIFY_CMD` · `delivery-gate.ts` | 设 `npm test` 后 `complete integration` |
| **0.22+** | **wrapper 检测 node_modules** | **P2** | `sync-project-wrapper.ts` 识别 `node_modules/oh-my-taiyiforge` | `taiyi-forge-install` 仅装依赖的项目 |
| **0.22+** | **compress 进 harness** | **P2** | `auxiliary-artifacts.ts` · `harness-runner.ts` 超 `compressThreshold` 推荐/阻塞 | auto 模式大工件须 `CONTEXT-COMPACT.md` |
| **0.22+** | **Superpowers 主轴流程** | — | `workflow-manifest.yaml` · `workflow-manifest.ts` · `/taiyi:flow` | `npx taiyi status` 含 Superpowers 行 · `tests/skill-flow.test.ts` |
| **0.22+** | **可选外部 Skill harness** | — | `workflow-manifest.yaml` · gstack · OpenSpec · web-quality | 各阶段 optional 钩子 |

---

## 排查命令分工（0.22+）

| 命令 | 用途 |
|------|------|
| `/taiyi:doctor` | 四端 skills + 控制面安装自检 |
| `/taiyi:verify` | PR/CI 工件门禁（当前阶段质量、harness 阻塞） |
| `/taiyi:audit` | 流程/交付排查（legacy state、CHANGE 漂移、git 未交付、OpenSpec 缺失） |
| `/taiyi:health` | review 前代码健康（taiyi-health → health-report.md） |

`complete integration` 与 `archive` 已**自动串联** audit / sync-openspec，无需手打排查命令过关。

---

## optional 铁三角一览

| 阶段 | 钩子 | 何时建议打卡 |
|------|------|----------------|
| requirement | OpenSpec `change show` | 项目已 init OpenSpec |
| ui-design | gstack `plan-design-review` | 有 UI/UX 面 |
| test | gstack `qa` | 有 web/站点可测 |
| integration | OpenSpec `archive` | 规格进主库 |

必选铁三角示例：change `superpowers/brainstorming`、design `gstack/plan-eng-review`、review `gstack/review` 等见 [`workflow-manifest.yaml`](./taiyi/workflow-manifest.yaml)。

---

## 相关阅读

- [QUICKSTART](./QUICKSTART.md) — 5 分钟上手 + optional / chat-demo
- [ARCHITECTURE](./ARCHITECTURE.md) — 引擎能力与知识沉淀
- [workflow](./taiyi/workflow.md) — 九阶段与可选层
- [integrations](./taiyi/integrations.md) — 铁三角分阶段对照
- [delivery-gate](./taiyi/delivery-gate.md) — integration 交付门
- [minimal-project WALKTHROUGH](../examples/minimal-project/WALKTHROUGH.md) — 逐步命令表
