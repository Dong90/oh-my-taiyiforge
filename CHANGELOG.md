# Changelog

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
