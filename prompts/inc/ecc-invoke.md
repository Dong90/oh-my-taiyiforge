> **默认 manifest**：`tool: ecc` 且未标 `optional: true` 的 harness 项为**双线 harness 硬约束**（`--auto` 须 `harness-check`）。
> 安装：`npx ecc-universal install` 或 `claude plugin install ecc@ecc` · `npx taiyi doctor` 查 `deps-ecc`

## ECC Skill 加载（四端）

> ECC（Everything Claude Code, affaan-m/ECC）是与 TaiyiForge 互补的"agent harness 操作系统"。
> 提供 277 skills + 67 subagents + 12 端 IDE 支持 + Continuous Learning + AgentShield。
> 本 invoke 协议与 `superpowers-invoke.md` 同源。

1. **先** `/taiyi:status [slug]` — 确认变更 slug 与当前阶段。
2. **加载 ECC Skill**（按端）：
   - **Cursor**：`@ecc-<name>` 或加载插件 `ecc-universal`
   - **Claude Code**：`Skill` 工具加载 `ecc/<name>`
   - **Codex**：读 `~/.codex/skills/ecc/<name>/SKILL.md`
   - **OpenCode**：`ecc/<name>` skill 路径
3. 双线 harness / ECC 打卡：`scripts/taiyi-forge.sh harness-check <slug> ecc/<name>`
4. ECC 阶段**硬约束**（去重后 — 完整表见 `docs/taiyi/library-selection.md`）：
   - **change** → `continuous-learning`
   - **requirement** → `iterative-retrieval`
   - **design** → `architecture-audit` · `backend-patterns` · `coding-standards`
   - **ui-design** → `web-design-guidelines` · `accessibility-audit` · `frontend-patterns`
   - **dev** → `coding-standards` · `backend-patterns`（+ Go 可选）
   - **test** → `test-coverage-analysis` · `eval-harness`
   - **review** → `security-scan`（已合并 security-review / semgrep / trivy 主路径）
   - **integration** → `changelog-generator` · `strategic-compact` · `continuous-learning-v2`
5. **不再使用**（与 Superpowers/web-quality 重复；GStack 已退场）：`tdd-workflow` · `verification-loop` · `system-design-review` · `security-review`
6. ECC subagents（dev/review 派发，可选）：
   - 派发：`planner` · `architect` · `tdd-guide` · `code-reviewer` · `security-reviewer`
   - 修复：`build-error-resolver` · `refactor-cleaner` · `e2e-runner`
   - 文档：`docs-lookup` · `doc-updater`
6. 阶段完成前 ECC 推荐约束：
   - **必须** `verification-before-completion`（来自 ECC `verification-loop`）
   - **必须** `evidence{command, exitCode:0, capturedAt}`（与 Taiyi 守门链一致）

### 安装方式

```bash
# 方式 1: 官方 plugin（推荐，4 端自动适配）
claude plugin install ecc@ecc

# 方式 2: 手动
git clone https://github.com/affaan-m/ECC.git ~/.ecc
npx ecc-universal install --target claude --profile minimal

# 验证
ls ~/.claude/skills/ | grep ^ecc-      # 应有 ecc-* skill 目录
```

未安装 ECC 时：Agent 会跳过 ECC skill 调用，继续用 `taiyi-*` + `superpowers/`，不影响流程。

### 与 Taiyi 守门链的关系

- `harness-check <slug> ecc/<name>` 写入 `.harness-checkpoints.json`
- `pendingDualLineHarnessHooks` 会自动算出未打卡的 ECC hook
- `/taiyi:continue` 阶段完成时**会因缺 ECC 必选打卡而失败**（`--auto` 模式）
- 纯 API / 非 Go 项目：对 N/A 项仍须 `harness-check` 并在对话中注明跳过理由

### 安全审计

`review` 阶段主路径为 ECC `security-scan`（已合并 security-review / semgrep / trivy）。