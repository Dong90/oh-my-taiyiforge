# full-flow-demo — 九阶段 + Agent 斜杠 E2E

在 **examples** 内的可运行示例工程，用于验证：

1. **九阶段主流程**（`/taiyi:new` → 写工件 → `/taiyi:continue` × 9 → `/taiyi:archive`）
2. **29 专 Agent**（`/taiyi:agent <role>` 协议可加载）
3. **阶段默认 Agent**（`PHASE_AGENT_ROLES` 与当前阶段对齐）

斜杠与引擎等价关系见 `slash-flow.json`；测试用 `scripts/taiyi-forge.sh` / `taiyi` CLI 代跑（与 Codex `$taiyi-*`、Cursor `/taiyi:*` 同一契约）。

## 结构

```
full-flow-demo/
  src/counter.js          # 示例业务代码
  test/counter.test.js    # npm test（供 dev / ralph 验证）
  slash-flow.json         # 斜杠验证清单
  scripts/run-slash-e2e.mjs
```

## 运行

在**仓库根目录**：

```bash
npm run build
# 全量：vitest + 在 examples 内落盘 .taiyi
node examples/full-flow-demo/scripts/run-slash-e2e.mjs
```

仅测试（临时目录，跑完删除）：

```bash
npm test -- tests/examples-full-flow.test.ts tests/run-slash-flow-cli.test.ts
```

**在 example 目录内生成真实工件**（跑完后可本地查看）：

```bash
node examples/full-flow-demo/scripts/run-inplace-verify.mjs
# → .taiyi/changes/full-flow-demo/CHANGE.md … CHANGELOG.md
# → verify-report.json
```

` .taiyi/` 与 `verify-report.json` 在 `.gitignore` 中，仅本地验证产物。

## 流程摘要

| 步骤 | 斜杠 | 说明 |
|------|------|------|
| 立项 | `/taiyi:new Full flow demo` | slug → `full-flow-demo` |
| 每阶段 | `/taiyi:write` · `/taiyi:<phase>` · `/taiyi:harness` · `/taiyi:agent …` | 写工件指引 + 专 Agent |
| 人工门 | `/taiyi:continue --approver …` | change / design / review |
| dev/test | `/taiyi:ralph` · `/taiyi:apply` | 验证命令 `npm test` |
| review | `/taiyi:health` · `mark-aux` · `review-loop` | 质量门禁 |
| 收尾 | `/taiyi:archive` · `/taiyi:verify` | 归档与交付校验 |

工件正文复用 `src/core/e2e-fixtures.ts` 中的 `E2E_ARTIFACTS`（与 `tests/e2e-workflow.test.ts` 同源），保证门禁可过。
