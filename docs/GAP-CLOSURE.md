# 架构审计缺口 · 补齐对照表

> 一页速查：审计项 → 实现位置 → 如何验证。对应版本 **0.19.0**。

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

---

## 对照表

| # | 审计项 | 严重度 | 实现 / 文档 | 验证 |
|---|--------|--------|-------------|------|
| 1 | test 阶段 **gstack/qa** 未挂 harness | 中 | `docs/taiyi/harness-hooks.yaml`（test · `optional: true`）<br>`docs/taiyi/integrations.md`<br>`skills/taiyi-test/SKILL.md`<br>walkthrough 步骤 21 演示打卡 | `npm test` → `tests/harness-hooks.test.ts`<br>walkthrough test 阶段可见 `gstack/qa (可选)`<br>不打卡也可 `complete test` |
| 2 | ui-design **plan-design-review** 仅 Skill 可选 | 低 | `harness-hooks.yaml` ui-design · optional<br>`skills/taiyi-ui-design/SKILL.md`<br>`skills/taiyi-orchestrator/SKILL.md` | walkthrough 步骤 11–12：清单标 `(可选)`，无打卡可过关 |
| 3 | **OpenSpec** 全程可选 | 低（设计） | requirement/integration `optional: true`<br>`docs/ARCHITECTURE.md` · `workflow.md` §可选层<br>`src/integrations/harness-hooks.ts` notes | 未装 `openspec` CLI 时 requirement harness 无阻塞项 |
| 4 | **`/taiyi:explore`** 仅文档 | 低 | `prompts/taiyi-explore.md`<br>`docs/taiyi/commands.yaml`<br>根 `README.md` 辅助命令 | Cursor：`/taiyi:explore 主题` → 加载 brainstorming + taiyi-change |
| 5 | **聊天路径** E2E | 低 | `examples/minimal-project/scripts/run-chat-demo.mjs`<br>`run-full-flow.mjs` 每步 💬 聊天等价 | `npm run chat-demo` |
| 6 | **`templates/CONTEXT.md`** 无独立模板 | 极低 | `templates/CONTEXT.md`<br>`src/core/template-seed.ts`<br>`skills/taiyi-intel-scan/SKILL.md` | `npx taiyi init x --title t` → 变更目录含 CONTEXT 种子（若 seed 启用） |
| 7 | 图 footer **「知识沉淀」** | —（愿景） | `docs/ARCHITECTURE.md` §知识沉淀：adr / CONTEXT / CHANGELOG / sync-openspec | 文档说明即可，无独立自动化模块 |
| + | **意图分析**（架构图引擎） | — | `src/core/routing/infer-complexity.ts`<br>`src/core/format-guide.ts`「意图分析: …」<br>`docs/ARCHITECTURE.md` 核心引擎表 | `npx taiyi status <slug>` 或 walkthrough 步骤 1 输出含「意图分析」 |

---

## optional 铁三角一览

| 阶段 | 钩子 | 何时建议打卡 |
|------|------|----------------|
| requirement | OpenSpec `change show` | 项目已 init OpenSpec |
| ui-design | gstack `plan-design-review` | 有 UI/UX 面 |
| test | gstack `qa` | 有 web/站点可测 |
| integration | OpenSpec `archive` | 规格进主库 |

必选铁三角示例：change `superpowers/brainstorming`、design `gstack/plan-eng-review`、review `gstack/review` 等见 [`harness-hooks.yaml`](./taiyi/harness-hooks.yaml)。

---

## 相关阅读

- [QUICKSTART](./QUICKSTART.md) — 5 分钟上手 + optional / chat-demo
- [ARCHITECTURE](./ARCHITECTURE.md) — 引擎能力与知识沉淀
- [workflow](./taiyi/workflow.md) — 九阶段与可选层
- [integrations](./taiyi/integrations.md) — 铁三角分阶段对照
- [minimal-project WALKTHROUGH](../examples/minimal-project/WALKTHROUGH.md) — 逐步命令表
