import fs from "node:fs";
import path from "node:path";
import { renderTaiyiPrompt } from "./prompt-stage-protocol.js";
import type { InstallResult } from "./types.js";

export function syncCodexPrompts(promptsSrc: string, destDir: string): InstallResult {
  if (!fs.existsSync(promptsSrc)) {
    return {
      target: "codex-prompts",
      path: destDir,
      action: "skipped",
      detail: `no prompts dir: ${promptsSrc}`,
    };
  }

  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const ent of fs.readdirSync(promptsSrc, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith(".md")) continue;
    const body = renderTaiyiPrompt(ent.name, fs.readFileSync(path.join(promptsSrc, ent.name), "utf8"), promptsSrc);
    fs.writeFileSync(path.join(destDir, ent.name), body, "utf8");
    count++;
  }

  return {
    target: "codex-prompts",
    path: destDir,
    action: count > 0 ? "updated" : "skipped",
    detail: `${count} prompts`,
  };
}
