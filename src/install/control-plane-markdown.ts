/** 四端共用的 TaiyiForge 控制面正文（Cursor rules / Claude CLAUDE.md 块） */

export function taiyiControlPlaneBody(platform: "cursor" | "claude"): string {
  const hookLine =
    platform === "cursor"
      ? `7. **Cursor hook**（消费方项目）：\`.cursor/hooks/taiyi-phase-guard.mjs\` — dev 前改业务代码默认 **deny**；设 \`TAIYI_EARLY_CODE_BLOCK=0\` 或 \`TAIYI_PHASE_GUARD=ask\` 恢复询问。`
      : `7. **dev 前硬拦**：Claude Code \`.claude/settings.json\` PreToolUse hook（与 Cursor 同逻辑）；设 \`TAIYI_EARLY_CODE_BLOCK=0\` 或 \`TAIYI_PHASE_GUARD=ask\` 恢复询问。`;

  const chatIntro =
    platform === "cursor"
      ? "在 Cursor 输入 / 可选 taiyi-status 等（等同 /taiyi:status）；或直接打字 /taiyi:continue。"
      : "Claude Code：加载 `taiyi-forge` Skill；用户说 **/taiyi:handoff**、**/taiyi:cancel** 时用 Bash 代跑引擎。";

  const skillBlock =
    platform === "cursor"
      ? `- 引擎：\`~/.cursor/skills/taiyi-forge/SKILL.md\`
- 编排：\`taiyi-orchestrator\`（\`--auto\`）
- 阶段：\`taiyi-change\` … \`taiyi-integration\``
      : `- 引擎：\`~/.claude/skills/taiyi-forge/SKILL.md\`
- 编排：\`taiyi-orchestrator\`（\`--auto\`）
- 阶段：\`taiyi-change\` … \`taiyi-integration\`
- 铁三角：Superpowers / gstack 在对话内加载。`;

  return `## 原则（对齐 oh-my-codex / omc.sh）

1. **聊天里**：加载 \`taiyi-*\` 阶段 Skill、Superpowers、gstack 写工件与评审。
2. **引擎过关**：用户说 **/taiyi:new**、**/taiyi:continue**、**/taiyi:apply**、**/taiyi:archive**、**/taiyi:cancel**、**/taiyi:handoff**（Codex：**$taiyi-new** 等），你用 **终端工具** 代跑 \`scripts/taiyi-forge.sh\`。
3. **禁止**让用户手打长 shell 路径；**禁止**未执行过关就声称阶段已完成。
4. **一步一 continue**：只写当前阶段工件；**禁止**跳步创建后续阶段 md 或改业务代码（dev 前）。
5. **以 /taiyi:status 为准**：文件写了但 status 未就绪 → 跑 /taiyi:status 看「已自动对齐 / 顺序冲突」提示，勿重复劳动。
6. **跨会话**：暂停前 /taiyi:handoff；恢复先 /taiyi:status。
7. **100% 斜杠**：用户只说 /taiyi:*；你代跑 \`scripts/taiyi-forge.sh\`。完整列表见 \`docs/taiyi/commands.yaml\` → \`slash_catalog\`。
${hookLine}

## 状态同步（v0.22+）

- /taiyi:status / /taiyi:continue 会自动：从磁盘同步 mark-aux（如已有 CONTEXT.md）、去掉已填好内容的 seed 标记。
- 若出现「顺序冲突 / 超前工件」：删除未来阶段 md，或先 complete 当前阶段，**不可跳步**。

## 聊天命令（用户只说斜杠，见 docs/taiyi/commands.yaml）

${chatIntro}

**主流程：** /taiyi:new · /taiyi:status · /taiyi:continue · /taiyi:apply · /taiyi:archive

**常用辅助：** /taiyi:doctor · /taiyi:audit · /taiyi:verify · /taiyi:list · /taiyi:check · /taiyi:sync · /taiyi:handoff · /taiyi:cancel · /taiyi:loop · /taiyi:review-loop · /taiyi:review-check · /taiyi:token * · /taiyi:commit-trailers

**引擎斜杠（原 engine-only）：** /taiyi:init · /taiyi:complete · … · /taiyi:ci platform · /taiyi:ci prompt

**交付链（gstack）：** /taiyi:commit · /taiyi:ship · /taiyi:land · /taiyi:gstack review · /taiyi:gstack qa · /taiyi:release

九阶段写工件仍用 \`taiyi-change\` … \`taiyi-integration\` Skill，见 docs/taiyi/workflow.md

Codex：$taiyi-* prompts（与 /taiyi:* 一一对应）

## Agent 代跑（禁止用户手打）

\`\`\`bash
./node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh <cmd> ...
\`\`\`

映射：用户说 \`/taiyi:continue\` → 你跑 \`taiyi-forge.sh continue\`。开发仓库内 \`scripts/taiyi-forge.sh\`；全局 \`taiyi-forge\`。

## Skill 加载

${skillBlock}

## 变更目录

\`.taiyi/changes/<slug>/\` · 详见 \`docs/taiyi/control-plane.md\``;
}
