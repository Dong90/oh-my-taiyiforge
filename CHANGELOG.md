# Changelog

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
