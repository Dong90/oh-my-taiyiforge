# TaiyiForge 分层验证指南

**结论先说**：`node examples/verification-suite/run-all.mjs` 可一键跑完 **L0–L3 + L4 无头契约**（vitest 全量 + 就地落盘）。  
**无法 CI 替代的**只剩：IDE 内 Hook **触发时机**、LLM **工件内容质量**（建议发版前抽样 UAT）。

## 一键全自动

在仓库根目录：

```bash
npm run build
node examples/verification-suite/run-all.mjs
```

等价于 `npm test` + `examples/full-flow-demo` 就地落盘。

---

## 分层矩阵

| 层 | 验证什么 | 自动化 | 命令 |
|----|----------|--------|------|
| **L0 单元/引擎** | 门禁、profile、review、slug 安全 | ✅ | `npm test` |
| **L1 CLI 九阶段** | `taiyi-forge.sh` + 工件落盘 + 29 Agent | ✅ | `run-slash-flow-cli`、`examples-full-flow*`、`profile-cli-flow` |
| **L2 集成缺口** | OpenSpec mock/真 CLI、多 slug、catalog 对账 | ✅ | `verification-gaps`、`openspec-real-cli`（PATH 有则跑） |
| **L3 安装/Hooks/MCP** | 四端写盘、Hook stdin/stdout、MCP stdio | ✅ | `post-install-smoke`、`hook-contract`、`mcp-server-smoke`、`install-prompt-parity` |
| **L4 无头契约** | 原 IDE UAT 清单的 CLI/prompt 替代 | ✅ | `l4-headless-contract` |
| **L4 真机（可选）** | Cursor 聊天内斜杠、Skill 真加载 | ⚠️ 抽样 | 见下「可选真机 UAT」 |

---

## L1：CLI 全流程（含 example 落盘）

```bash
npm test -- tests/run-slash-flow-cli.test.ts tests/examples-full-flow.test.ts
node examples/full-flow-demo/scripts/run-inplace-verify.mjs
```

**Profile 变体**：`tests/profile-cli-flow.test.ts`

---

## L2：缺口专项

```bash
npm test -- tests/verification-gaps.test.ts tests/openspec-real-cli.test.ts
npm test -- tests/slash-commands.test.ts tests/slash-extensions.test.ts tests/commands-catalog-sync.test.ts
npm test -- tests/workflow-manifest-integrity.test.ts
```

---

## L3：安装 + MCP + 对账

```bash
npm test -- tests/post-install-smoke.test.ts tests/install-prompt-parity.test.ts
npm test -- tests/hook-contract.test.ts tests/mcp-server-smoke.test.ts tests/autopilot-step-cli.test.ts
```

**本机已 install 后（只读 ~/.cursor）**：

```bash
TAIYI_VERIFY_REAL_INSTALL=1 npm test -- tests/post-install-smoke.test.ts
```

---

## L4：无头契约（已自动化）

`tests/l4-headless-contract.test.ts` 覆盖原手工清单的 CLI 等价路径：

| 原 L4 项 | 无头替代 |
|----------|----------|
| `/taiyi:new` + status | `init` + `status` |
| `/taiyi:handoff` | `handoff` → `HANDOFF.md` |
| `/taiyi:agent executor` | `agent executor` 协议输出 |
| `/taiyi:team` / `ultrawork` | `team-mode.json` / `ultrawork-mode.json` |
| dev + `/taiyi:ralph` | `.dev-complete` + 真 `npm test` |
| gstack / sp / resume | prompt 渲染契约 |
| health + mark-aux | `taiyi-health.md` 契约 |

九阶段 **Agent 真写工件** 由 `examples-full-flow` **E2E 夹具**覆盖（结构合法，非 LLM 原创）。

---

## 可选真机 UAT（发版前抽样）

在 **examples/full-flow-demo** 开 Cursor 会话，**禁止粘贴 E2E 夹具**，人工写一阶段 `CHANGE.md` 即可验证 Skill 加载与 Hook 触发。

---

## 各缺口能否「全部自动」？

| 缺口 | 状态 | 说明 |
|------|------|------|
| IDE 真实斜杠触发 | ⚠️ 抽样 | `install-prompt-parity` 字节对账；运行时靠真机 |
| Agent 真干活 / 内容质量 | ⚠️ 半自动 | E2E 夹具 + `artifact-validator`；质量抽样 UAT |
| 仅 prompt 斜杠 | ✅ | `slash-extensions` + catalog 对账 |
| 自主闭环 | ✅ | `autopilot-step-cli` + `ralph-runner` |
| OpenSpec 真归档 | ⚠️ 半自动 | mock + PATH 有 `openspec` 时真 archive |
| Profile lite/api | ✅ | `profile-cli-flow` |
| 安装同步 | ✅ | `post-install-smoke` + `install-prompt-parity` |
| Hook 脚本契约 | ✅ | `hook-contract`；IDE **触发**仍抽样 |
| manifest 引用完整性 | ✅ | `workflow-manifest-integrity` |
| 多 slug | ✅ | `verification-gaps` + `active-slug` |

---

## 推荐 CI 命令

```bash
npm run build && npm test
node examples/full-flow-demo/scripts/run-inplace-verify.mjs
```

或：

```bash
node examples/verification-suite/run-all.mjs
```
