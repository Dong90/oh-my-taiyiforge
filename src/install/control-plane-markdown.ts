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

**常用辅助：** /taiyi:doctor · /taiyi:audit · /taiyi:verify · /taiyi:list · /taiyi:check · /taiyi:sync · /taiyi:handoff · /taiyi:cancel · /taiyi:loop · /taiyi:write · /taiyi:change … /taiyi:integration · /taiyi:feature · /taiyi:bug · /taiyi:ralph · /taiyi:autopilot · /taiyi:team · /taiyi:ultrawork · /taiyi:agent · /taiyi:review-loop · /taiyi:review-check · /taiyi:token * · /taiyi:commit-trailers

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

/** Codex developer_instructions — 每轮 $taiyi-preflight 纪律（写入 ~/.codex/config.toml） */
export function codexDeveloperInstructions(): string {
  return `TaiyiForge Codex session loop (= $taiyi-preflight; prompt at ~/.codex/prompts/taiyi-preflight.md):

BEFORE processing each user message:
- Run: node node_modules/oh-my-taiyiforge/scripts/codex-keyword-preflight.mjs "<user text>"
  (or scripts/taiyi-forge.sh keyword "<user text>")
- Follow injected $taiyi-* prompts / activate modes from output.

BEFORE ending each turn:
- Run: node node_modules/oh-my-taiyiforge/scripts/codex-mode-reminder.mjs
  (or scripts/taiyi-forge.sh modes)
- If any ralph/autopilot/ultrawork/team mode is active: do NOT stop — run scripts/taiyi-forge.sh step [slug] until green or user says stopomc (/taiyi:stop-mode).

Ultrawork: when TAIYI_ULW_AUTO_TASK=1 or user invoked /taiyi:ultrawork, load ~/.codex/skills/taiyi-ultrawork/SKILL.md and dispatch parallel Task/subagent workers; main session merges only.

Engine: scripts/taiyi-forge.sh · Skills: ~/.codex/skills/taiyi-* · MCP: taiyi_keyword / taiyi_mode_step (optional).`;
}

/** Codex 无 hook 时的 OMC 循环替代（写入 ~/.codex/AGENTS.md） */
export function codexOmcLoopBlock(): string {
  return `## 每轮必做（$taiyi-preflight）

\`npx taiyi-forge-install --codex\` 已在 **~/.codex/config.toml** 写入 \`developer_instructions\`（Codex 默认 system 层，优先于 AGENTS.md 正文）。纪律 = **$taiyi-preflight**：

1. **读用户消息前**：\`codex-keyword-preflight.mjs "<用户原文>"\` 或 \`scripts/taiyi-forge.sh keyword\` → 加载对应 \`$taiyi-*\` prompt。
2. **回合结束前**：\`codex-mode-reminder.mjs\` 或 \`scripts/taiyi-forge.sh modes\` → 有活跃模式则 **禁止结束**，代跑 \`scripts/taiyi-forge.sh step [slug]\` 直到绿或 stopomc。

## OMC 式模式循环（Codex 无 Stop hook）

Cursor/Claude 有 keyword + stop hook；**Codex 靠 developer_instructions + 上节纪律**：

3. **Ultrawork 并行**：\`TAIYI_ULW_AUTO_TASK=1\` 或 harness 清单 \`taiyi/taiyi-ultrawork\` → 加载 \`taiyi-ultrawork\` Skill，必须 Task 派发 worker，主会话只合并。

4. **MCP 等价**：\`taiyi_keyword\` · \`taiyi_remember\` · \`taiyi_workflow\` · \`taiyi_mode_step\`（与 OpenCode 对齐）。`;
}
