> 统一说明见 `prompts/inc/third-party-invoke.md` · `docs/taiyi/invoke-routing.md`

## Superpowers Skill 加载（四端）

1. **先** `/taiyi:status [slug]` — 确认变更与阶段（若与当前工件相关）。
2. **加载 Superpowers Skill**（按端）：
   - **Cursor**：加载 `superpowers/<name>` 或插件内同名 Skill（如 `brainstorming`、`test-driven-development`）
   - **Claude Code**：`Skill` 工具加载 `superpowers/<name>`
   - **Codex**：读 `~/.codex/skills/superpowers/` 或 `$superpowers-<name>`
3. 双线 harness 打卡（auto 模式）：`scripts/taiyi-forge.sh harness-check <slug> superpowers/<name>`
4. 声明阶段完成前须满足 **verification-before-completion**（有运行证据）。

未安装 Superpowers：`npx taiyi-forge-install --all`（或 Cursor Superpowers 插件）。
