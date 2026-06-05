import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

export function syncTaiyiSkills(skillsSrc: string, destDir: string): InstallResult {
  if (!fs.existsSync(skillsSrc)) {
    return {
      target: "opencode",
      path: destDir,
      action: "failed",
      detail: `skills source missing: ${skillsSrc}`,
    };
  }

  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const ent of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
    if (!ent.isDirectory() || !ent.name.startsWith("taiyi-")) continue;
    const from = path.join(skillsSrc, ent.name);
    const to = path.join(destDir, ent.name);
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
    count++;
  }

  return {
    target: "opencode",
    path: destDir,
    action: count > 0 ? "updated" : "skipped",
    detail: `${count} taiyi-* skills`,
  };
}
