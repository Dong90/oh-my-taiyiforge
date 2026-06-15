import fs from "node:fs";
import path from "node:path";

import { TAIYI_SEED_MARKER, isSeedTemplate } from "./seed-marker.js";

export type RootChangelogSyncResult = {
  ok: boolean;
  action: "created" | "appended" | "skipped";
  path?: string;
  reason?: string;
};

/** integration 完成后将变更 CHANGELOG 合并到项目根 CHANGELOG.md */
export function syncRootChangelog(workspaceDir: string, slug: string): RootChangelogSyncResult {
  const changeDir = path.join(workspaceDir, ".taiyi", "changes", slug);
  const src = path.join(changeDir, "CHANGELOG.md");
  if (!fs.existsSync(src)) {
    return { ok: true, action: "skipped", reason: "no change CHANGELOG.md" };
  }

  const dest = path.join(workspaceDir, "CHANGELOG.md");
  const marker = `<!-- taiyi:${slug} -->`;
  const raw = fs.readFileSync(src, "utf8").trim();
  const body = raw.replace(TAIYI_SEED_MARKER, "").trim();
  if (!body || isSeedTemplate(raw) || body.length < 12) {
    return { ok: true, action: "skipped", reason: "change CHANGELOG 无实质内容" };
  }
  const date = new Date().toISOString().slice(0, 10);
  const entry = `\n\n${marker} ${date}\n${raw}\n`;

  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, `# Changelog\n${entry}`, "utf8");
    return { ok: true, action: "created", path: dest };
  }

  const existing = fs.readFileSync(dest, "utf8");
  if (existing.includes(marker)) {
    return { ok: true, action: "skipped", path: dest, reason: "already synced" };
  }

  fs.appendFileSync(dest, entry, "utf8");
  return { ok: true, action: "appended", path: dest };
}
