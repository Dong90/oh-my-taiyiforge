import type { WorkflowEngine } from "./workflow-engine.js";

export interface HandlerResult {
  ok: boolean;
  text?: string;
  exitCode?: number;
}

export type CommandHandler = (
  workspaceDir: string,
  args: string[],
  opts: { jsonMode: boolean; compactMode: boolean },
  ctx: { engine: WorkflowEngine; taiyiRoot: string; templatesDir?: string },
) => HandlerResult | Promise<HandlerResult>;

export interface CommandEntry {
  name: string;
  aliases?: string[];
  handler: CommandHandler;
  group: "daily" | "debug";
  desc: string;
  /** for legacy commands: show redirect to new command */
  redirect?: string;
  /** slash-only: only available in chat, not CLI */
  slashOnly?: boolean;
}

/** 仅聊天斜杠 — CLI 提示用 /taiyi:*；九阶段动词走引擎 CLI（taiyiPhaseWrite） */
export const SLASH_ONLY = new Set([
  "tdd",
  "diagram-pipeline", "diagram-c4", "diagram-arch", "diagram-flow", "diagram-render",
  "commit", "ship", "land",
]);

export const LEGACY_REDIRECT: Record<string, string> = {
  done: "continue",
  mvp: "flow mvp",
  micro: "flow micro",
  nano: "flow nano",
  service: "flow service",
  "design-system": "flow design-system",
  devops: "flow ci",
  "ci-scenario": "flow ci",
};

/** 已从顶栏移除的引擎子命令 — 无替代 CLI，仅聊天伞形或 Skill */
export const REMOVED_CLI = new Set(["chat", "code-review"]);
