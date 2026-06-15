import type { InstallResult } from "./types.js";
import {
  defaultChatCommandsDir,
  syncTaiyiChatCommands,
} from "./sync-chat-commands.js";

/** Claude Code：与 Cursor 同源 prompts/taiyi-*.md → ~/.claude/commands/ */
export function syncClaudeCommands(promptsSrc: string, destDir: string): InstallResult {
  return syncTaiyiChatCommands(promptsSrc, destDir, "claude");
}

export function defaultClaudeCommandsDir(): string {
  return defaultChatCommandsDir("claude");
}
