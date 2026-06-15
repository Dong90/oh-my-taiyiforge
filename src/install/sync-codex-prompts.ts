import type { InstallResult } from "./types.js";
import {
  defaultChatCommandsDir,
  syncTaiyiChatCommands,
} from "./sync-chat-commands.js";

/** Codex：与 Cursor 同源 prompts/taiyi-*.md → ~/.codex/prompts/ */
export function syncCodexPrompts(promptsSrc: string, destDir: string): InstallResult {
  return syncTaiyiChatCommands(promptsSrc, destDir, "codex");
}

export function defaultCodexPromptsDir(): string {
  return defaultChatCommandsDir("codex");
}
