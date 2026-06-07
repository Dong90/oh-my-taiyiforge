import fs from "node:fs";
import path from "node:path";
import type { ChangeState } from "./types.js";
import { displayPhase } from "./change-status.js";

export const HANDOFF_FILENAME = "HANDOFF.md";

export type HandoffInput = {
  changeDir: string;
  state: ChangeState;
  /** Agent 或用户补充的会话上下文 */
  note?: string;
  /** status 单行摘要，可选 */
  statusLine?: string;
  /** 工件过大时提示 token compress */
  compressHint?: string;
};

export function handoffPath(changeDir: string): string {
  return path.join(changeDir, HANDOFF_FILENAME);
}

export function handoffExists(changeDir: string): boolean {
  const p = handoffPath(changeDir);
  return fs.existsSync(p) && fs.statSync(p).size > 0;
}

export function buildHandoffMarkdown(input: HandoffInput): string {
  const { state, note, statusLine } = input;
  const ts = new Date().toISOString();
  const completed =
    state.completedPhases.length > 0
      ? state.completedPhases.map((p) => `- ${p}`).join("\n")
      : "- （尚无）";

  const sections = [
    `# HANDOFF · ${state.slug}`,
    "",
    `> 生成于 ${ts} · 阶段 **${displayPhase(state)}** · profile \`${state.profile}\``,
    "",
    "## 恢复",
    "",
    "1. \`/taiyi:status\` — 以引擎输出为准",
    "2. 继续当前阶段工件或 \`/taiyi:continue --approver 名\`",
    "",
  ];

  if (statusLine) {
    sections.push("## 引擎快照", "", "```", statusLine.trim(), "```", "");
  }

  if (input.compressHint?.trim()) {
    sections.push("## Token / 上下文", "", input.compressHint.trim(), "");
  }

  sections.push(
    "## 已完成阶段",
    "",
    completed,
    "",
    "## 会话备注",
    "",
    note?.trim() ? note.trim() : "（Agent：在此填写阻塞、决策、未提交改动说明）",
    "",
    "## 下一步",
    "",
    `- 当前工件阶段：**${state.currentPhase}**`,
    "- 填完工件 → `/taiyi:status` → 用户确认 → `/taiyi:continue`",
    "",
  );

  return sections.join("\n");
}

export function writeHandoff(input: HandoffInput): { path: string; content: string } {
  const content = buildHandoffMarkdown(input);
  const file = handoffPath(input.changeDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  return { path: file, content };
}
