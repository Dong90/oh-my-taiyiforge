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

export const SLASH_ONLY = new Set([
  "explore", "tdd",
  "release", "sp", "gstack",
  "diagram-pipeline", "diagram-c4", "diagram-arch", "diagram-flow", "diagram-render",
  "commit", "ship", "land",
  "change", "requirement", "design", "ui-design", "task", "dev", "test", "review", "integration",
]);

export const LEGACY_REDIRECT: Record<string, string> = {
  done: "continue",
  next: "status",
  guide: "status",
  phases: "status",
  complete: "continue --approver",
};
