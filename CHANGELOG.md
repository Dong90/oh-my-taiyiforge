# Changelog

## [0.42.0] - 2026-06-24

### Added

- **docs(readme)**: README 深度优化，362→169 行（-53%），面向开源项目重构结构与文案
- **chore**: 压缩架构 PNG（18.7MB→5.7MB，节省 13MB），添加 `.prettierrc`
- **chore**: 删除冗余 `taiyiforge-architecture.png`，更新 ARCHITECTURE.md 引用

### Changed

- 移除 npm badges（包已下架），安装方式改为源码安装
- 合并「30秒开始」+「安装」为统一「快速开始」
- 新增「直接跟 AI 对话 vs TaiyiForge」对比表
- 顶部新增 TOC 导航栏

## [0.41.0] - 2026-06-24

- 新增 6 个开发场景到 playbook 系统
- 大规模文档清理：移除过期/未引用文件
- 场景覆盖：refactor (lite), hotfix (nano), prototype (spike), config (micro), docs (nano), dep-upgrade (micro)

## [0.40.0] - 2026-06-23

- 评审门控增强：新增 SSOT 交叉引用验证
- E2E fixtures 扩展至 7 字段（one_liner, review_date, rollback_trigger, is_cli_only, has_config_changes, modules）
- 图谱上下文压缩，防止 token 超限
- 平台冒烟 CI 修复，Playwright/vitest 超时优化

## [0.39.0] - 2026-06-23

- 静默 JSON 解析失败修复：区分 ENOENT vs SyntaxError，LLM JSON 自修复
- 类型守卫替代 `as` 断言，提升类型安全
- remark + remark-gfm 引入，Markdown AST 解析替换正则
- 影子快照 + 熔断器：连续 3 次失败自动回滚
- code slicer：提取 exports/imports 为聚焦的 LLM 上下文

## [0.38.0] - 2026-06-23

- Skill 文档同步 + 示例一致性清理

## [0.37.0] - 2026-06-23

- ChangeGraph 集成到 completePhase 生命周期
- 模板测试更新 + 剩余 fixture 同步

## [0.36.0] - 2026-06-23

- PHASE-CONTEXT.md 图谱驱动生成：`generateGraphPhaseContext()` 替代正则提取
- AgentContext：图谱原生上下文 API（安全审计、回滚计划、SSOT 报告）

## [0.35.0] - 2026-06-23

- ChangeGraph 知识图谱：load/edges/query/render 完整实现
- 4 个测试文件，49 个测试用例

## [0.34.0] - 2026-06-23

- ChangeGraph agent 上下文渲染 + 序列化 + 类组装
- 12 条边规则目录 + SSOT 违规检测 + 跨切面查询

## [0.33.0] - 2026-06-23

- ast-grep 陷阱规则：8 种模式 + scan.sh 编排脚本
- 按模块拆分 PITFALLS.md：6 个模块文件 + GLOBAL.md

## [0.32.0] - 2026-06-23

- E2E JSON fixtures 扩展：one_liner, review_date, rollback_trigger, is_cli_only 等字段

## [0.31.0] - 2026-06-23

- UI-DESIGN 支持 `is_cli_only` 条件章节，CLI-only 变更自动跳过 UI 阶段
- integration schema 增强：日期修复 + config 占位符 + System State Update 章节
- TASK.md 引入 PITFALLS 引用 + 多切片并行模式 + SSOT 交叉引用

## [0.30.0] - 2026-06-23

- 数据驱动 Mermaid 链：设计图 SSOT 三源绑定 + 回滚追溯
- `is_cli_only` 跳过 UI 阶段契约

## [0.29.0] - 2026-06-23

- REVIEW 绑定 review_date + SSOT 交叉引用
- REQUIREMENT 绑定 one_liner + SSOT 交叉引用
- CHANGE 绑定 one-liner 到 motivation 字段
- 质量门控占位符检测增强

## [0.28.0] - 2026-06-21

- 用户对话中去掉 `/taiyi:` 斜杠命令语气，改用自然语言引导

## [0.27.0] - 2026-06-21

### Added

- **feat(core)**: event bus + structured logger + git import tool — 核心基础设施升级，新增 `EventBus`、`Logger` 结构化日志、`ImportTool` 从 git branch import 变更
- **feat(milestone)**: 里程碑总览命令 — 多变更聚合进度/瓶颈/清单
- **feat(new)**: `taiyi new` 支持显式 slug + title 分离 `npx taiyi new "<slug>" "<title>"`
- **feat(skills+schema)**: flow-x 借鉴 + design schema 扩展 — 10 个 SKILL.md 重写

### Changed

- **refactor(cli)**: 62→18 命令，handlers map 替代巨型 switch — CLI 大幅瘦身
- **refactor(skill)**: 合并 explore/tdd/flow → skill umbrella
- **refactor(prompts)**: 删 16 个与 umbrella 重复的独立 prompt
- **refactor(commands)**: 删 21 个 legacy/aux prompt + commands.yaml 清理

### Fixed

- **fix(build)**: 补充缺失的 `init-wizard.ts`，修复 implicit any 类型错误
- **fix(TS)**: TypeScript errors + test fixes + logger integration for production readiness
- **fix(demo)**: v28 demo 脚本 3 个 bug 修复
- **fix(shell+cli)**: profile 列表扩 nano/service/mvp/full/micro/spike (#32)
- **fix(evidence)**: 5 修引擎 evidence/trailer/debounce (#31)

### Tests

- `tests/core/event-bus.test.ts`、`tests/commands/import-tool.test.ts`、`tests/commands/init-wizard.test.ts` 新增
- `tests/l4-headless-contract.test.ts`、`tests/slash-commands.test.ts`、`tests/slash-extensions.test.ts` 等更新
- 完整 vitest passed，build 成功

## [0.26.0] - 2026-06-17

### Added

- **evidence 强校验**：`src/core/artifact-validator.ts` 在 change / requirement / test 三阶段,`success_criteria[].is_checked = true` 必须配 `evidence{command, exitCode:0, capturedAt}`。`ChangeSchema` / `RequirementSchema` / `TestSchema` 新增 `evidence?` 字段(共享 `EvidenceSchema`)。阻止"AC 全勾但实测走样"的假过门(#31)
- **status 命令 5s 防抖**：`src/cli/taiyi.ts` status case 加 `(globalThis as any).__taiyiLastStatusCall` 时间戳,避免连按 N 次重复跑同一查询。`TAIYI_STATUS_DEBOUNCE=0` 可关闭(#31)
- **profile 列表扩 5**：`scripts/taiyi-forge.sh` 白名单 +10 (flow / service / mvp / micro / nano / design-system / devops / ci-scenario / chat / code-review);`src/cli/taiyi.ts` 3 处 usage 文本 profile 列表扩 full / micro / nano / spike(#32)

### Changed

- **commit trailer 强 enable**：`src/core/gates/commit-trailer.ts` `commitTrailersEnabled()` 显式默认 `true`,删 `loadProjectConfig` bypass,只 env `TAIYI_COMMIT_TRAILERS=0` 关闭(#31)
- **delivery-gate hint 加 trailer 模板**：`src/core/gates/delivery-gate.ts` 未提交文件时 hint 加 `git commit -m "..."` 含 `Taiyi-Change: <slug>` trailer 模板 + `/taiyi:commit <slug>` 推荐(#31)

### Breaking Changes

- **evidence 强校验**:未来 9 阶段变更在 change / requirement / test 阶段 `acceptance_criteria` 标 `is_checked=true` 时必填 `evidence` 字段,否则 `qualityReady=false`。`examples/full-flow-demo` 等 e2e fixture 已升级加 evidence 字段
- **commitTrailersEnabled 强 enable**:`project config` 的 `commitTrailers: false` 不再生效(只 env `TAIYI_COMMIT_TRAILERS=0` 关闭)。所有新 commit 必须含 `Taiyi-Change: <slug>` trailer 才能过 integration

### Tests

- `tests/artifact-validator.test.ts` 新增 6 条单测(覆盖 is_checked + evidence / exitCode 必须 0 / capturedAt ISO)
- `tests/commit-trailer.test.ts` 新增 2 条单测(默认 true + env 关闭)
- `src/core/e2e-fixtures.ts` 升级:change / requirement / test 3 个 fixture 加 evidence 字段
- `tests/project-config.test.ts` 期望值同步(S2 行为变化)
- 完整 630/630 vitest passed,build 成功,`/taiyi:audit` PASS

### Migration

```bash
# 已有 9 阶段变更,需补 evidence 字段
# change.json / requirement.json / test.json 顶层加:
"evidence": {
  "command": "<真跑过的命令,如 npm test>",
  "exitCode": 0,
  "capturedAt": "<ISO 8601 时间>"
}
# 且 acceptance_criteria[].is_checked=true 的必须有 evidence

# commit 缺 trailer,需 amend 或新 commit 加
git commit --amend -m "..."
# 末尾加:
# Taiyi-Change: <slug>
# Taiyi-Phase: <phase>
```

## [0.24.0] - 2026-06-16

### Added

- **v28 IDE 菜单裁剪**：`install --<harness>` 默认只同步 v28 28 条顶栏 prompt 到四端菜单（`TAIYI_FORGE_ALL_PROMPTS=1` 恢复全量 86 条）
- **零构建安装**：`npx taiyi-forge-install --all` 一行装到四端，无需 clone 仓库

### Changed

- **README v28 收敛重写**：npm badge 启用 · 快速上手结构重组（一行安装优先）· 路线图更新 · 中英两版同步
- **canonical-commands.md**：Phase 3（真 IDE 菜单裁剪）标记完成
- **CI**：npm exit code 替代 grep 检测 postinstall 失败 · Dependabot 不再拦截 major 升级
- **提示词**：autopilot prompt 改为 phase-driven 分支逻辑 · architecture poster v0.23 generator

### Fixed

- **smoke**：隔离 HOME 下 unset CI 环境变量解锁 skill 安装
- **ci.mjs**：改用 `process.execPath` 替代 PATH `"node"` 避免运行时不一致
- **CoC / 依赖**：CODE_OF_CONDUCT 去重措辞 + 私密报告渠道 · README.en.md 文件名修正

## [0.23.1] - 2026-06-12

### Changed

- **README 重写为 5 段式**(问题 → 方案 → 证据 → 快速上手 → 参考),中英两版同构对齐
- **v28 收敛**:`v28 canonical` badge、Slash Catalog 28 条表、6 umbrella 速查、Legacy 兼容表全量补齐;中文版之前对 v28 是 0% 落地,本次同步到位
- **`/taiyi:mode` umbrella 补齐 11 个子命令**(`agent` / `step` / `stop` / `list` 补上),与 `commands.yaml` / `canonical-commands.md` 完全一致
- **措辞修正**:v28 段从暗示"Cursor/Claude 菜单只剩 28"改为"v28 = 推荐命名 + 顶栏收敛,Cursor/Claude 仍装全 prompt;Phase 2(IDE 菜单裁剪)未做",与 `canonical-commands.md` L11 措辞对齐
- **结构收敛**:`Quick Start` + `Your First Change` 合并为 4 Option;`Core Capabilities` 段删除(8 条 bullet 全部已在 Why / Nine-stage / Architecture 体现);Legacy 表从 9 行压到 6 行
- **CLI 风格统一**:用户入口 = 斜杠(`/taiyi:*`),Agent 跑引擎 = `npx taiyi` / `scripts/taiyi-forge.sh`,不再混 `npx taiyi-forge-install` / `npm run`

## [0.23.0] - 2026-06-09

### Added

- **canonical v28**：聊天推荐顶栏收敛为 28 条（主链 / 会话 / 排查 / 交付 / 路由 / 捷径 / 伞形）；legacy 斜杠与 prompt 保留
- **skill-fusion-principles.md**：主链 / harness / 禁止三层融合原则
- **catalog 校验**：`validateV28CatalogSync` + `generate:docs` 门禁；`legacy_map` / `token engine_map` → prompt 对账测试

### Changed

- **commands.yaml**：`canonical_v28` + `slash_catalog.recommended_v28` + `legacy_slash` 结构化真源
- **canonical-commands.md** / **taiyi-help**：v28 叙事 + Phase 1 说明（文档收敛 ≠ Cursor 菜单裁剪）
- **scenario-shortcuts**：场景剧本改用 v28 伞形推荐路径（`test smoke`、`mode ralph` 等）

## [0.22.2] - 2026-06-09

### Fixed

- **archive**：OpenSpec CLI 失败且 integration 已完成时降级 Taiyi-only 归档（S3/S4）；Taiyi 移动失败不再误报 `ok: true`
- **daemon dry-run**：轮末兜底早停，避免 blocked 变更空转 max-rounds
- **handoff**：dated archive 目录（`2026-06-09-<slug>`）noop exit 0

### Added

- **probe-triage**：S0–S10 冒烟矩阵与 S3/S4 archive 根因说明
- **`/taiyi:help`**：补 `list --archived`、`bug --create`、`smoke-reset` 说明
- **探测脚本**：`scripts/probes/` + `npm run probe:fullflow` / `probe:postfix`（修正 C1 `--force`、slug 推导、smoke-reset 分通道断言）

## [0.22.1] - 2026-06-09

### Fixed

- **archive 幂等**：支持 dated 归档目录名（如 `2026-06-09-<slug>`）；二次 `archive` exit 0 并输出「已归档 / 幂等 no-op」
- **消费方 wrapper**：薄 shim 转发 `list "$@"`、`prune`、`smoke-reset` 等；`sync-wrapper` 强制迁移
- **daemon dry-run**：blocked 变更首轮早停，避免打满 max-rounds 空转
- **step 完成态**：九阶段已完成 / 已归档时 `step` exit 0
- **list `--archived`**：仅列 `.taiyi/archive/`；`--all --archived` 才合并 changes+archive

### Added

- **`validateSlug`**：拒绝 NUL 字节，CLI 可读错误
- **文档**：`docs/taiyi/probe-triage.md`（十轮探测归类）；Skill 补 `list --archived` / `prune --aborted` / `bug --create`

## [0.22.0] - 2026-06-07

### Added

- **交付门**：`complete integration` 前自动 `audit`（git commit + 干净工作区）；`TAIYI_DELIVERY_VERIFY_CMD` 可选验证命令
- **`/taiyi:health`** + `taiyi health` → `health-report.md`（review 前代码健康基线）
- **`/taiyi:flow`**、**`/taiyi:full-flow`**：Superpowers 主轴 + `workflow-manifest.yaml` 真源
- **`dev-complete`**：dev 阶段默认要求 `.dev-complete` 含 `command:` + `exitCode: 0`
- **`resolve-auto-harness`**：`init` 默认关、`new` 默认开；`--no-auto` / `TAIYI_AUTO_HARNESS` 统一
- **消费方 wrapper**：`taiyi-forge-install` 写入项目 `scripts/taiyi-forge.sh`（含 `node_modules` 检测）
- **根 CHANGELOG 同步**：integration complete 后合并变更 `CHANGELOG.md` 到仓库根
- **archive 自动 sync-openspec**：openspec change 目录缺失时先同步再归档
- **compress harness**：auto 模式超阈值推荐/阻塞 `CONTEXT-COMPACT.md`
- **示例**：`examples/full-oss-flow/`、`examples/skill-flow/`；架构图 SVG 真源 + PNG 重生成脚本
- **文档**：`full-oss-flow.md`、`superpowers-flow.md`、`tdd-workflow.md`、`skill-flow.yaml`

### Changed

- **integration 前 audit**：`pretendIntegrationComplete` 不再跳过 open AC checkbox
- **medium 复杂度**：须完成 `taiyi-health` 辅助 Skill
- **dev phase-guide**：code 阶段走 `validateArtifactFile` 质量校验
- **harness-hooks**：精简为读取 `workflow-manifest.yaml`；optional 铁三角见 manifest
- **walkthrough**：人工门阶段传 `--approver`（change / design / review）
- **README / GAP-CLOSURE / ARCHITECTURE**：0.22 三门禁、排查命令、对照表同步

## [0.21.0] - 2026-06-05

### Added

- **铁三角依赖自动安装**：`postinstall` / `taiyi-forge-install --all` 默认安装 OpenSpec CLI、gstack（git clone + setup）、Superpowers（OpenCode plugin / Codex symlink / Cursor `npx skills`）、`addyosmani/web-quality-skills`
- **`--skip-deps`** / `TAIYI_FORGE_SKIP_DEPS=1` 跳过；CI 环境自动跳过
- **`doctor`** 增加 `deps-openspec` / `deps-gstack` / `deps-superpowers` / `deps-web-quality-skills` 检查项

## [0.20.0] - 2026-06-05

### Added

- **Token 预算**：`token status|record|scan|compress` CLI；`.token-usage.json` 累计；阶段上限与 `TAIYI_TOKEN_ENFORCE` 门禁
- **引擎压缩**：`token compress` → `CONTEXT-COMPACT.md`（零 LLM，按 `##` 节截断）
- **第三方压缩钩子**：`docs/taiyi/token-compress-hooks.yaml` — Superpowers（`subagent-driven-development`、`dispatching-parallel-agents`）+ gstack（`checkpoint`）
- **`taiyi-compress` Skill**（第 17 个）与 `docs/taiyi/token-compress.md` 专页
- **`/taiyi:loop`** + **`xN` 后缀**（continue/apply/check/loop 重复执行；跨会话直到完成）
- **`/taiyi:token *`** 聊天斜杠（status / record / scan / compress）；Agent 代跑 `taiyi-forge.sh token …`，禁止用户手打 npx
- **`token-compress-hooks` 集成**：合并进 `harness-hooks`（均为 optional）；超阈值时 status/guide 输出压缩策略

### Changed

- doctor / CI 期望 **17** 个 Skill；`integrations.md`、`token-budget.md`、`ARCHITECTURE.md` 同步
- `taiyi-orchestrator` 铁三角表增加 Token 压缩第三方 Skill 引用

## [0.19.0] - 2026-06-05

### Added

- **铁三角 optional 钩子**：`HarnessHook.optional` + YAML `optional: true`；`--auto` 下 optional 不阻塞 `complete`
- **test 阶段 `gstack/qa`**、**ui-design 阶段 `gstack/plan-design-review`**（均为 optional）
- **意图分析**：`inferComplexitySignals` → `/taiyi:status` / `guide` 输出「意图分析: …」
- **`/taiyi:explore`**：`prompts/taiyi-explore.md` + `commands.yaml`（→ Superpowers brainstorming，无引擎子命令）
- **`templates/CONTEXT.md`** + init 种子；`taiyi-intel-scan` 引用
- **`examples/minimal-project/scripts/run-chat-demo.mjs`** + `npm run chat-demo`（聊天动词演示）
- **`docs/GAP-CLOSURE.md`**：架构审计 7 项 ↔ 实现 ↔ 验证命令对照表

### Changed

- **OpenSpec** requirement/integration 钩子标 optional；`ARCHITECTURE.md` / `workflow.md` 增「可选层」说明
- **harness 清单**：optional 铁三角标注「(可选)」与「不打卡也可 complete」
- **`format-guide`**：铁三角文案改为「必选打卡，可选见标注」
- **文档**：`QUICKSTART.md`、`WALKTHROUGH.md`、`integrations.md`、`README.md` 同步 optional / chat-demo / 意图分析
- **本地开发**：README / QUICKSTART 强调 `npm run build` 后再跑 walkthrough（`dist` 与源码一致）

## [0.18.0] - 2026-06-05

### Added

- **`taiyi-forge` 引擎 Skill**（第 16 个）：Cursor / Claude / Codex 聊天内驱动引擎，对齐 OMX `omc.sh`
- **`scripts/taiyi-forge.sh`** + npm bin **`taiyi-forge`**：统一 shell 入口
- **Codex**：`~/.codex/prompts/taiyi-forge.md`（`$taiyi-forge`）
- **Claude**：`~/.claude/CLAUDE.md` 控制面段落
- **Cursor**：`taiyiforge.mdc` 规则（Agent 代跑脚本，禁止手打 `npx taiyi`）
- `docs/taiyi/control-plane.md`、`docs/taiyi/invoke.yaml`

### Changed

- doctor / CI platform 期望 **16** 个 taiyi-* skills
- `taiyi-orchestrator` 与各阶段 Skill 引擎命令改为 `scripts/taiyi-forge.sh`
- `AGENTS.md` 重写为 OMX 双轨调用说明

## [0.17.0] - 2026-06-05

### Added

- **`taiyi ci verify`**：PR 无 LLM 校验 `.taiyi/changes/` 工件与 auto 门禁
- **`taiyi ci platform`**：四端 skills 隔离安装冒烟（opencode / claude / codex / cursor）
- **`taiyi ci prompt`**：生成 CI Agent 推进 prompt（`.taiyi/ci-prompts/`）
- `examples/ci/github-actions/` 五套工作流模板 + `docs/ci/README.md`
- 本仓库 CI：`ci:verify` + platform matrix

### Changed

- doctor 期望 15 个 taiyi-* skills（含 orchestrator）

## [0.16.0] - 2026-06-05

### Added

- **`--auto` / `TAIYI_AUTO_HARNESS=1`**：全自动编排模式（对齐架构图调度）
- `taiyi harness` / `taiyi_harness`：铁三角 → 辅助 → 主流程 有序清单
- `taiyi harness-check` / `taiyi_harness_check`：铁三角步骤打卡（`.harness-checkpoints.json`）
- 辅助工件自动检测（`CONTEXT.md` 等）与 auto 模式 complete 门禁
- integration 后 auto 尝试 `sync-openspec`（OpenSpec 已安装时）
- **`taiyi-orchestrator`** Skill + Cursor rules 全自动指引

### Changed

- `complete` 在 auto 模式下未打卡/缺辅助工件会拒绝
- OpenCode 工具增至 15 个

## [0.15.0] - 2026-06-05

### Added

- `taiyi walkthrough` / `taiyi_walkthrough`：在**任意项目目录**首次体验（doctor → init → next）
- 主流程 9 个 Skill 补厚至与辅助 Skill 同级（模板、Handoff、质量自检、禁止项）

### Changed

- `npm run walkthrough` 委托给 `taiyi walkthrough`
- OpenCode 工具增至 13 个

## [0.14.0] - 2026-06-05

### Added

- `taiyi doctor` / `taiyi_doctor`：四端 skills、OpenCode plugin、模板一键自检
- `taiyi list` / `taiyi_list`：列出 `.taiyi/changes/` 进度
- `taiyi next` / `taiyi_next`：人类可读下一步（复杂度、辅助 Skill、铁三角）
- `npm run walkthrough`：首次体验引导脚本
- `complete` 成功后提示 `taiyi next`

## [0.13.0] - 2026-06-05

### Added

- `taiyi_guide` 串联复杂度评估与 `recommendedAuxiliary` / `pendingAuxiliary`
- `taiyi mark-aux` / `taiyi_mark_aux`：记录辅助 Skill 完成
- **Profile**：`--profile full|api|ui|lite`（api 跳过 ui-design，lite 五阶段）
- `--strict-dev`：`.dev-complete` 需 `exitCode: 0` 证据
- `TAIYI_HUMAN_GATE_PHASES`：可配置人工门（默认 change/design/review）
- init 自动从 CHANGE 推断复杂度；high 复杂度 review 前强制 `taiyi-health`
- OpenSpec 同步：TEST / REVIEW / CHANGELOG
- Cursor 安装时写入 `~/.cursor/rules/taiyiforge.mdc`
- 主流程 9 个 Skill 补厚

### Changed

- `state.json` 含 `profile`、`skippedPhases`、`complexity`、`auxiliaryCompleted`
- `ui-design` 工件加强校验（N/A 或 States+A11y）

## [0.12.0] - 2026-06-05

### Added

- **Cursor 纳入默认安装**：`postinstall` / `--all` 同步 `~/.cursor/skills/taiyi-*`
- **按需组合安装**：`taiyi-forge-install --claude --cursor` 等；`TAIYI_FORGE_INSTALL=opencode,cursor`

### Changed

- 仅装非 OpenCode 端时不再写入 `opencode.json`

## [0.11.0] - 2026-06-05

### Changed

- 五辅助 Skill 补厚：`taiyi-intel-scan`、`taiyi-architect`、`taiyi-health`、`taiyi-evolve`、`taiyi-restyle`
  - 增加触发条件、输出模板、与主流程/铁三角衔接、质量自检与禁止项

## [0.10.0] - 2026-06-05

### Added

- `taiyi_sync_openspec` / CLI `sync-openspec`：Taiyi 工件 → OpenSpec 目录映射
- GitHub Actions CI：`npm test` + `npm run dogfood`

## [0.9.0] - 2026-06-05

### Added

- `harness.hooks`：`taiyi guide/status` 按阶段推荐 OpenSpec / Superpowers / gstack Skill
- `docs/QUICKSTART.md` 与 `examples/minimal-project/`

## [0.8.0] - 2026-06-05

### Added

- **OpenSpec 集成**：`taiyi_archive` 工具 + CLI `archive`
- `taiyi_status` 返回 `openspec` 检测状态与建议命令

## [0.7.0] - 2026-06-05

### Added

- 九阶段 E2E：`tests/e2e-workflow.test.ts` + `npm run dogfood`
- `src/core/e2e-fixtures.ts`：共享最小合法工件（CI / dogfood 同源）

### Changed

- `prepublishOnly`：发布前自动 build + test

## [0.6.0] - 2026-06-05

### Added

- `taiyi_guide` 工具与 CLI `guide`：当前 Skill、工件路径、质量预检、下一步动作
- `taiyi_status` 内嵌 `guide`
- `docs/taiyi/integrations.md`：OpenSpec / Superpowers / gstack 串联说明

### Changed

- `taiyi-review` / `taiyi-integration` Skill 补充铁三角可选步骤

## [0.5.0] - 2026-06-05

### Added

- `taiyi init` / `taiyi_init`：自动从 `templates/` 拷贝九阶段 Markdown 工件（不覆盖已有文件）
- 工件质量推断：`complete` 时校验章节与占位符，失败时返回 `qualityHints`
- `taiyi_init` 可选参数 `title` 替换模板中的 `{{title}}`

### Changed

- CLI `init` 支持 `--title`

## [0.4.0] - 2026-06-05

### Added

- 工件模板：`REQUIREMENT`、`DESIGN`、`UI-DESIGN`、`TASK`、`TEST`、`REVIEW`、`CHANGELOG`
- 九阶段 + 五辅助 `taiyi-*` Skill 完整执行说明（非 stub）

### Changed

- `taiyi-change` / `taiyi-requirement` 等与引擎工件路径对齐

## [0.3.0] - 2026-06-05

### Added

- 三端安装：`postinstall` + `taiyi-forge-install`（OpenCode / Claude / Codex）
- 自动注册 `opencode.json` plugin 条目

## [0.2.0] - 2026-06-05

### Added

- OpenCode 插件与 `taiyi_*` 工具
- 工作流引擎与 Vitest 契约测试

## [0.1.0] - 2026-06-05

- 初始 TaiyiForge 骨架


<!-- taiyi:engine-evidence-check --> 2026-06-17
# CHANGELOG: engine-evidence-check — 5 修引擎 evidence/trailer/debounce

## Added

- feat(evidence): Artifact validator 强校验 change/requirement/test 三阶段 AC is_checked=true 必配 evidence{command, exitCode:0, capturedAt}
- feat(schema): ChangeSchema/RequirementSchema/TestSchema 加 evidence? 字段(共享 EvidenceSchema)
- feat(debounce): status 命令 5s 防抖,TAIYI_STATUS_DEBOUNCE=0 关闭

## Changed

- refactor(trailer): commitTrailersEnabled() 显式默认 true,删 project config bypass
- docs(delivery): delivery-gate hint 加 trailer 模板 + /taiyi:commit <slug> 推荐

## Fixed

- fix(evidence): 阻止 AC 全勾但实测走样的"假过门"(evidence 缺失 → qualityReady=false)
- fix(trailer): 阻止 project config 的 commitTrailers: false 绕过 trailer 校验

## Tests

- test: 新增 tests/artifact-validator.test.ts 6 条单测
- test: 新增 tests/commit-trailer.test.ts 2 条单测
- test: 升级 src/core/e2e-fixtures.ts 加 evidence 字段(change/requirement/test 3 个 fixture)
- test: 调整 tests/project-config.test.ts 期望值(S2 行为变化)

## Rollback

```bash
git revert 6a8d36a 62a7ac5 a5c9c20 4b0fbc3 0f83be8
# 或
git reset --hard 267734f  # 回到 5 修前
```

回滚影响:5 commit 是顺序依赖,revert 顺序需倒序(最新先 revert)。


<!-- taiyi:fix-shell-whitelist-and-profile-help --> 2026-06-21
# CHANGELOG: fix-shell-whitelist-and-profile-help

## Added

- feat(shell): 10 个 node CLI 支持的命令加到 shell 白名单(flow / service / mvp / micro / nano / design-system / devops / ci-scenario / chat / code-review),用户 `taiyi-forge.sh flow mvp` 不再报 unknown command
- docs(help): 3 处 profile help 从 `api|lite` 改为 7 profile 全列(full/lite|api|micro|nano|spike|ui)

## Changed

- dist/cli/taiyi.js 第 35 行 (init)
- dist/cli/taiyi.js 第 56 行 (walkthrough)
- dist/cli/taiyi.js 第 478 行 (new)
- scripts/taiyi-forge.sh 第 166 行 (case 白名单)

## Fixed

- 修复「白名单 + help 不全」两个 UX 问题,共 4 处小改动

## Docs / Skills

- [x] 不涉及对外协议 / 模板 / Skill 改动
- [x] 不涉及 OpenSpec(项目未 init openspec)

## Rollback

```bash
cd /Users/shixiaocai/Desktop/chuangye/oh-my-taiyiforge
git checkout main -- scripts/taiyi-forge.sh dist/cli/taiyi.js
# 或
/taiyi:cancel fix-shell-whitelist-and-profile-help --remove-dir
```

回滚影响:仅 2 文件 4 行改动,无 schema 变更。
