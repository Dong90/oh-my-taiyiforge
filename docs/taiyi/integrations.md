# TaiyiForge × 铁三角集成

与《AI 驱动研发流程与工具选型指南》对齐：TaiyiForge 管**九阶段工件 + 双门禁**，下列工具管各自专长，**可并存**。

**什么能进主链、什么只能 harness、什么禁止** → [skill-fusion-principles.md](./skill-fusion-principles.md)

**Superpowers 主轴流程**（九阶段 × 14 技能 + 可选外挂）：见 [superpowers-flow.md](./superpowers-flow.md)。  
**TDD 专页**（Superpowers + 引擎 `.dev-complete`）：见 [tdd-workflow.md](./tdd-workflow.md)。

## 铁三角依赖（自动安装）

`postinstall` / `taiyi-forge-install --all` 在默认情况下还会尝试安装：

| 依赖 | 方式 | 说明 |
|------|------|------|
| **OpenSpec** | `npm i -g @fission-ai/openspec` | 全局 CLI；项目内仍需 `openspec init` |
| **gstack** | `git clone` + `./setup` | 需要 **bun**（缺失时会尝试 `npm i -g bun`） |
| **Superpowers** | OpenCode 写 plugin；Codex clone+symlink；Cursor 尝试 `npx skills add` | Cursor/Claude 插件市场需手动时见 install 日志 |
| **web-quality-skills** | `npx skills add addyosmani/web-quality-skills -g -y` | accessibility / web-design-guidelines 等 |

跳过：`npx taiyi-forge-install --all --skip-deps` 或 `TAIYI_FORGE_SKIP_DEPS=1`。CI 环境自动跳过。

`npx taiyi doctor` 会列出 `deps-*` 检查项（不影响 Taiyi 核心 PASS/FAIL）。

## OpenSpec（规范层）

| TaiyiForge 阶段 | OpenSpec 动作 |
|-----------------|---------------|
| change / requirement | 可用 `openspec proposal` 起草；工件落在 `.taiyi/changes/<slug>/` |
| integration | 合并后 **`taiyi_archive`** 或 `openspec archive <slug> -y`，规格进主库 |

**约定**：`CHANGE.md` / `REQUIREMENT.md` 为仓库内真源；OpenSpec 为可选上游或归档目标。

## Superpowers（纪律层）

| TaiyiForge 阶段 | Superpowers Skill |
|-----------------|-------------------|
| change | `brainstorming` — 先澄清再写 CHANGE |
| task | `test-driven-development` — 切片测试计划（`/taiyi:tdd plan`） |
| dev | `test-driven-development` — 红绿重构实现（`/taiyi:tdd dev`） |
| test | `verification-before-completion` — 证据先于「完成」声明 |

在 OpenCode：`use skill tool to load superpowers/brainstorming`

### Token 压缩（optional · 见 [token-compress.md](./token-compress.md)）

| 场景 | Superpowers Skill |
|------|-------------------|
| dev / 大实现 | `subagent-driven-development` — 主会话只协调 |
| 多 slice 并行 | `dispatching-parallel-agents` — 各 agent 独立上下文 |

引擎侧：`/taiyi:token compress <slug>` → `CONTEXT-COMPACT.md`（零 LLM，优先于上表）。

## gstack / OMO（闭环层）

| TaiyiForge 阶段 | gstack 命令 |
|-----------------|-------------|
| design | `plan-eng-review` — 架构与边界工程评审 |
| ui-design | `plan-design-review` — UI 设计计划评审（**optional**，有界面时建议） |
| test | `qa` — 站点/流程 QA（**optional**，`harness-check gstack/qa`） |
| review | `review` — PR 合并前结构审查 |
| integration | `document-release` — 文档与 CHANGELOG 同步 |

**OMO**：`taiyi_complete` 的 `approver` 字段记录人工审批者；high 级 REVIEW 未解决不得 Approve。

### Token 压缩（optional）

| 场景 | gstack Skill |
|------|----------------|
| 长会话 / compaction 前 | `checkpoint` — 落盘进度，新会话续作 |

## 推荐串联（单变更）

```text
taiyi_init → taiyi_guide（每步）
  → taiyi-change … taiyi-integration
  → （可选）taiyi_sync_openspec → taiyi_archive
  → test：/taiyi:gstack qa（optional）
  → review：/taiyi:gstack review · /taiyi:review-loop
  → /taiyi:commit → /taiyi:ship → /taiyi:land → /taiyi:release（optional）
```

**交付斜杠专页**：[delivery-slash.md](./delivery-slash.md)

## OpenCode 工具一览

| 工具 | 用途 |
|------|------|
| `taiyi_init` | 建变更 + 铺模板 |
| `taiyi_guide` | 当前该做什么 |
| `taiyi_status` | 状态 + guide |
| `taiyi_complete` | 完成阶段（含质量校验） |
| `taiyi_assess` | 复杂度与辅助 skill 建议 |
| `taiyi_sync_openspec` | 将 `.taiyi/changes/<slug>/` 工件拷贝到 `openspec/changes/<slug>/`（含 TEST/REVIEW/CHANGELOG） |
| `taiyi_archive` | 九阶段完成后调用 OpenSpec archive（需 `openspec/changes/<slug>/`） |
| `taiyi_mark_aux` | 标记辅助 Skill（如 `taiyi-health`）已完成 |

`init` 支持 `--profile api|lite`；`guide` 返回 `recommendedAuxiliary` 与 `complexity`。

`taiyi_status` 的 `openspec` 字段会显示是否检测到 OpenSpec 及建议命令。
