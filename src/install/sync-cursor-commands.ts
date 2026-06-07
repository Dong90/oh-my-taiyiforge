import fs from "node:fs";
import path from "node:path";
import { renderTaiyiPrompt } from "./prompt-stage-protocol.js";
import type { InstallResult } from "./types.js";

const COMMAND_MARKER = "TAIYI-FORGE:CURSOR-COMMAND";

/** 将 prompts/taiyi-*.md 同步到 ~/.cursor/commands/，在 Cursor `/` 菜单中显示 */
export function syncCursorCommands(promptsSrc: string, destDir: string): InstallResult {
  if (!fs.existsSync(promptsSrc)) {
    return {
      target: "cursor-commands",
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
    const wrapped = `<!-- ${COMMAND_MARKER}:${ent.name} -->\n${body}`;
    fs.writeFileSync(path.join(destDir, ent.name), wrapped, "utf8");
    count++;
  }

  return {
    target: "cursor-commands",
    path: destDir,
    action: count > 0 ? "updated" : "skipped",
    detail: `${count} slash commands (type /taiyi-status ≈ /taiyi:status)`,
  };
}

export function defaultCursorCommandsDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return process.env.CURSOR_COMMANDS_DIR || path.join(home, ".cursor", "commands");
}
