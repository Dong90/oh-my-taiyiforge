# Changelog

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
