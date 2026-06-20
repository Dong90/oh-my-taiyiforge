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
  "explore", "full-flow", "tdd", "security", "e2e", "ui-test",
  "release", "preflight", "sp", "gstack",
  "diagram-pipeline", "diagram-c4", "diagram-arch", "diagram-flow", "diagram-render",
  "commit", "ship", "land",
  "ralph", "autopilot", "team", "ultrawork", "agent", "daemon",
  "feature", "bug", "flow", "mvp", "micro", "nano", "service", "design-system", "ci-scenario",
  "assess", "mark-aux", "harness", "harness-check",
  "review-check", "review-loop",
  "sync", "sync-openspec", "sync-wrapper", "commit-trailers",
  "browser-smoke", "walkthrough",
  "change", "requirement", "design", "ui-design", "task", "dev", "test", "review", "integration",
  "modes", "step", "stop-mode", "trim-ahead", "prune", "remember", "keyword",
]);

export const LEGACY_REDIRECT: Record<string, string> = {
  init: "new --profile <profile>",
  done: "continue",
  next: "status",
  guide: "status",
  phases: "status",
  complete: "continue --approver",
  pause: "handoff",
};
