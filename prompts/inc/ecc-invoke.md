## ECC Skill 加载（四端）

> ECC（Everything Claude Code, affaan-m/ECC）是与 TaiyiForge 互补的"agent harness 操作系统"。
> 提供 277 skills + 67 subagents + 12 端 IDE 支持 + Continuous Learning + AgentShield。
> 本 invoke 协议与 `superpowers-invoke.md` / `gstack-invoke.md` 完全同源。

1. **先** `/taiyi:status [slug]` — 确认变更 slug 与当前阶段。
2. **加载 ECC Skill**（按端）：
   - **Cursor**：`@ecc-<name>` 或加载插件 `ecc-universal`
   - **Claude Code**：`Skill` 工具加载 `ecc/<name>`
   - **Codex**：读 `~/.codex/skills/ecc/<name>/SKILL.md`
   - **OpenCode**：`ecc/<name>` skill 路径
3. 铁三角 / ECC 打卡：`scripts/taiyi-forge.sh harness-check <slug> ecc/<name>`
4. ECC 阶段推荐（真源：`docs/taiyi/workflow-manifest.yaml#phases.<phase>.external_optional`）：
   - **change** → `ecc/continuous-learning` · `ecc/market-research`
   - **requirement** → `ecc/iterative-retrieval` · `ecc/article-writing`
   - **design** → `ecc/coding-standards` · `ecc/backend-patterns` · `ecc/frontend-patterns`
   - **ui-design** → `ecc/frontend-patterns`
   - **task** → `ecc/tdd-workflow` · `ecc/coding-standards`
   - **dev** → `ecc/tdd-workflow` · `ecc/coding-standards` · `ecc/backend-patterns` · `ecc/golang-patterns` · `ecc/golang-testing`
   - **test** → `ecc/eval-harness` · `ecc/verification-loop`
   - **review** → `ecc/security-review` · `ecc/eval-harness`
   - **integration** → `ecc/strategic-compact` · `ecc/continuous-learning-v2`
5. ECC 67 subagents 推荐：
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

未安装 ECC 时：Agent 会跳过 ECC skill 调用，继续用 `taiyi-*` + `superpowers/` + `gstack/`，不影响流程。

### 与 Taiyi 守门链的关系

- `harness-check <slug> ecc/<name>` 写入 `.harness-checkpoints.json`
- `pendingIronTriangleHooks` 会自动算出未打卡的 ECC hook
- `/taiyi:continue` 阶段完成时不会因缺 ECC 打卡而失败（`optional: true`），但会提示
- 若想强制 ECC 必选，把 `optional: true` 改成 `optional: false` 在 `workflow-manifest.yaml`

### 安全审计

ECC `security-review` skill 可作为 `review` 阶段的补充（与 `gstack/review` / `semgrep` / `trivy` 并列）。