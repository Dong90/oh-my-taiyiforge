# TaiyiForge × 双线 harness 集成

与《AI 驱动研发流程与工具选型指南》对齐：TaiyiForge 管**九阶段工件 + 双门禁**；**双线 harness** = **Superpowers（纪律）+ ECC（深度）**，外加少量 **CLI** 证据轨。

**选型与去重** → [library-selection.md](./library-selection.md) · **什么能进主链** → [library-selection.md](./library-selection.md)（选型真源）

**Superpowers 主轴**（九阶段 × 14 技能）：见 [full-oss-flow.md](./full-oss-flow.md)。
**TDD 专页**（Superpowers + 引擎 `.dev-complete`）：见 [full-oss-flow.md §TDD](./full-oss-flow.md#tdd)。

## 双线 harness 依赖（自动安装）

`postinstall` / `taiyi-forge-install --all` 在默认情况下还会尝试安装：

| 依赖 | 方式 | 说明 |
|------|------|------|
| **Superpowers** | OpenCode 写 plugin；Codex clone+symlink；Cursor 尝试 `npx skills add` | 纪律层 — manifest harness 硬约束 |
| **ECC** | `npx ecc-universal install` 或 `claude plugin install ecc@ecc` | 深度层 — manifest harness 硬约束 |
| **OpenSpec** | `npm i -g @fission-ai/openspec` | 全局 CLI；`spec_archive` / 可选 `spec_sync` |
| **web-quality-skills** | `npx skills add addyosmani/web-quality-skills -g -y` | 可选；主链已由 ECC UI/a11y 覆盖 |

跳过：`npx taiyi-forge-install --all --skip-deps` 或 `TAIYI_FORGE_SKIP_DEPS=1`。CI 环境自动跳过。

`npx taiyi doctor` 会列出 `deps-*` 检查项（含 `deps-ecc`）。

## harness 清单结构

```bash
npx taiyi harness <slug>
```

| § | 名称 | 内容 |
|---|------|------|
| 1 | **双线 harness** | Superpowers + ECC 必选钩子（`--auto` 须 `harness-check`） |
| 2 | **辅助** | `taiyi-*` 辅助 Skill（须 `mark-aux`） |
| 3 | **主 Skill** | 当前阶段 `taiyi-change` … `taiyi-integration` |

## Superpowers（纪律线）

| TaiyiForge 阶段 | Superpowers Skill |
|-----------------|-------------------|
| change | `brainstorming` |
| task / dev | `test-driven-development` |
| test | `verification-before-completion` |
| review | `requesting-code-review` |
| integration | `finishing-a-development-branch` · `verification-before-completion` |

Token 压缩（optional）：`subagent-driven-development` · `dispatching-parallel-agents` — 见 [token-compress-hooks.yaml](./token-compress-hooks.yaml)。

## ECC（深度线）

| 阶段 | 典型 ECC harness |
|------|------------------|
| change | `continuous-learning` |
| design | `architecture-audit` · `backend-patterns` · `coding-standards` |
| ui-design | `web-design-guidelines` · `accessibility-audit` · `frontend-patterns` |
| test | `test-coverage-analysis` · `eval-harness` |
| review | `security-scan` |
| integration | `changelog-generator` · `strategic-compact` · `continuous-learning-v2` |

完整表见 `workflow-manifest.yaml` 与 [library-selection.md](./library-selection.md)。

## OpenSpec（CLI 轨）

| 阶段 | 动作 |
|------|------|
| requirement | 可选 `openspec change show` |
| integration | **`taiyi archive <slug>`** 或 `openspec archive` |

## 推荐串联（单变更）

```text
taiyi_init → taiyi_guide（每步）
  → taiyi-change … taiyi-integration
  → 每阶段：§1 双线 harness-check → §2 mark-aux → §3 写工件 → continue
  → review：/taiyi:review-loop · /taiyi:security
  → /taiyi:commit → /taiyi:ship → /taiyi:land → /taiyi:release（optional）
```

**交付斜杠**：[delivery-slash.md](./delivery-slash.md)

## OpenCode 工具一览

| 工具 | 用途 |
|------|------|
| `taiyi_init` | 建变更 + 铺模板 |
| `taiyi_guide` | 当前该做什么 |
| `taiyi_status` | 状态 + guide + 双线 harness 清单 |
| `taiyi_complete` | 完成阶段（含质量校验） |
| `taiyi_assess` | 复杂度与辅助 skill 建议 |
| `taiyi_sync_openspec` | 工件拷贝到 `openspec/changes/<slug>/` |
| `taiyi_archive` | 九阶段完成后 OpenSpec archive |
| `taiyi_mark_aux` | 标记辅助 Skill 已完成 |

`init` 支持 `--profile api|lite`；`--auto` 启用双线 harness 打卡门禁。

## CapabilityId 完整列表

引擎已知的所有能力注册在 `src/config/providers.ts:14-22`（`CapabilityId` 联合类型）。每个 capability 可在 `.taiyi/providers.yaml` 的 `assignments:` 段显式路由到 provider。

| Capability | 用途 | 默认路由 |
|---|---|---|
| `spec_archive` | 归档变更到外部系统 | `openspec` |
| `spec_sync` | 同步工件到 spec 目录 | `openspec` |
| `browser_qa` | 浏览器交互测试 | playwright |
| `eng_review` | 工程评审 | （manifest 不引用，需 `providers.yaml` 显式恢复） |
| `design_review` | 设计评审 | （同上） |
| `code_review` | 代码审查 | （同上） |
| `doc_release` | 发布文档 | （同上） |
| `version_release` | 版本 bump / changelog | changesets |
| `sast_scan` | 静态安全扫描 | （同上） |
| `vuln_scan` | 依赖/文件漏洞扫描 | （同上） |
| `accessibility` | 无障碍审查 | （同上） |
| `design_guidelines` | Web 界面设计规范审查 | （同上） |
| `e2e_test` | E2E 测试 | playwright |
| `process_skills` | 流程技能集（brainstorming/TDD 等） | superpowers |
| `plugin_platform` | IDE 插件注册（OpenCode/Claude/Codex/Cursor） | engine 内部 — 不路由 provider |
| `archive_hook` | 归档后自定义脚本 hook | engine 内部 — 不路由 provider |

**向后兼容 NOTE**：`eng_review` / `design_review` / `code_review` / `browser_qa` / `doc_release` / `accessibility` / `design_guidelines` / `sast_scan` / `vuln_scan` 9 项 capability **保留**在 `CapabilityId` 类型里（避免历史 `.taiyi/providers.yaml` 引用断链），但默认 **不路由**（`workflow-manifest.yaml` 已不引用）——可通过 `.taiyi/providers.yaml` 的 `assignments:` 显式恢复。详见 [library-selection.md](./library-selection.md)。
