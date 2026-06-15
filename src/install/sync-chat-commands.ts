import fs from "node:fs";
import path from "node:path";
import { homeDir } from "./paths.js";
import { renderTaiyiPrompt } from "./prompt-stage-protocol.js";
import type { InstallResult } from "./types.js";

/** 四端同源标记 — Cursor / Claude / Codex / OpenCode 斜杠 prompt 字节级一致 */
export const CHAT_COMMAND_MARKER = "TAIYI-FORGE:CHAT-COMMAND";

/** @deprecated 旧 Cursor 标记；新安装统一用 CHAT_COMMAND_MARKER */
export const CURSOR_COMMAND_MARKER = "TAIYI-FORGE:CURSOR-COMMAND";

export type ChatCommandPlatform = "cursor" | "claude" | "codex" | "opencode";

const PLATFORM_TARGETS: Record<ChatCommandPlatform, InstallResult["target"]> = {
  cursor: "cursor-commands",
  claude: "claude-commands",
  codex: "codex-prompts",
  opencode: "opencode-commands",
};

const PLATFORM_HINTS: Record<ChatCommandPlatform, string> = {
  cursor: "slash commands (type /taiyi-status ≈ /taiyi:status)",
  claude: "slash commands (/taiyi-status ≈ /taiyi:status)",
  codex: "prompts ($taiyi-status ≈ /taiyi:status)",
  opencode: "slash commands (/taiyi-status ≈ /taiyi:status)",
};

export function defaultChatCommandsDir(platform: ChatCommandPlatform): string {
  const home = homeDir();
  switch (platform) {
    case "cursor":
      return process.env.CURSOR_COMMANDS_DIR || path.join(home, ".cursor", "commands");
    case "claude":
      return process.env.CLAUDE_COMMANDS_DIR || path.join(home, ".claude", "commands");
    case "codex":
      return process.env.CODEX_PROMPTS_DIR || path.join(home, ".codex", "prompts");
    case "opencode":
      return process.env.OPENCODE_COMMANDS_DIR || path.join(home, ".config", "opencode", "commands");
  }
}

export function wrapChatCommandBody(filename: string, renderedBody: string): string {
  return `<!-- ${CHAT_COMMAND_MARKER}:${filename} -->\n${renderedBody}`;
}

export function expectedChatCommandBody(
  filename: string,
  rawBody: string,
  promptsDir: string,
): string {
  return wrapChatCommandBody(filename, renderTaiyiPrompt(filename, rawBody, promptsDir));
}

/** 将 prompts/taiyi-*.md 同步到四端 commands/prompts 目录（与 Cursor 完全同源） */
export function syncTaiyiChatCommands(
  promptsSrc: string,
  destDir: string,
  platform: ChatCommandPlatform,
): InstallResult {
  const target = PLATFORM_TARGETS[platform];

  if (!fs.existsSync(promptsSrc)) {
    return {
      target,
      path: destDir,
      action: "skipped",
      detail: `no prompts dir: ${promptsSrc}`,
    };
  }

  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const ent of fs.readdirSync(promptsSrc, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.startsWith("taiyi-") || !ent.name.endsWith(".md")) continue;
    const src = path.join(promptsSrc, ent.name);
    const body = renderTaiyiPrompt(ent.name, fs.readFileSync(src, "utf8"), promptsSrc);
    fs.writeFileSync(path.join(destDir, ent.name), wrapChatCommandBody(ent.name, body), "utf8");
    count++;
  }

  return {
    target,
    path: destDir,
    action: count > 0 ? "updated" : "skipped",
    detail: `${count} ${PLATFORM_HINTS[platform]}`,
  };
}
