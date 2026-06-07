## gstack Skill 加载（四端）

1. **先** `/taiyi:status [slug]` — 确认变更 slug 与阶段（delivery 命令常发生在 review/integration 前后）。
2. **加载 gstack Skill**（按端）：
   - **Cursor**：`@gstack-<name>` 或 `@ship` / `@land-and-deploy`（若已安装 gstack bundle）
   - **Claude Code**：加载 `gstack` 包内对应 Skill（如 `ship`、`land-and-deploy`、`review`）
   - **Codex**：`$gstack-<name>` 或读 `~/.codex/skills/gstack/` 下 SKILL.md
3. **禁止**跳过 gstack Skill 直接 force-push / merge main；destructive git 须 gstack `careful` 或用户明确确认。
4. integration 交付门仍由 `/taiyi:continue` 校验（commit + trailer + 可选 `npm test`）；ship/land **不替代** TaiyiForge 过关。

未安装 gstack：`npx taiyi-forge-install --all`（或 `--skip-deps` 后手动 clone gstack）。
