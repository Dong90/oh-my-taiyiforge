import type { InstallResult } from "./types.js";
import {
  defaultChatCommandsDir,
  syncTaiyiChatCommands,
} from "./sync-chat-commands.js";

/** OpenCode：与 Cursor 同源 prompts/taiyi-*.md → ~/.config/opencode/commands/ */
export function syncOpenCodeCommands(promptsSrc: string, destDir: string): InstallResult {
  return syncTaiyiChatCommands(promptsSrc, destDir, "opencode");
}

export function defaultOpenCodeCommandsDir(): string {
  return defaultChatCommandsDir("opencode");
}
