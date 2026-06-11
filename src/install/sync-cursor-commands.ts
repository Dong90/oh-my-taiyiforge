import type { InstallResult } from "./types.js";
import {
  defaultChatCommandsDir,
  syncTaiyiChatCommands,
} from "./sync-chat-commands.js";

/** 将 prompts/taiyi-*.md 同步到 ~/.cursor/commands/，在 Cursor `/` 菜单中显示 */
export function syncCursorCommands(promptsSrc: string, destDir: string): InstallResult {
  return syncTaiyiChatCommands(promptsSrc, destDir, "cursor");
}

export function defaultCursorCommandsDir(): string {
  return defaultChatCommandsDir("cursor");
}
