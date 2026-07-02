import fs from "node:fs";
import path from "node:path";

import { safeWriteFileSync } from "./file-writer.js";
import { TAIYI_SEED_MARKER, isSeedTemplate } from "./seed-marker.js";

export type RootChangelogSyncResult = {
  ok: boolean;
  action: "created" | "appended" | "skipped" | "archived";
  path?: string;
  reason?: string;
};

const TAIYI_MARKER_RE = /<!--\s*taiyi:(\S+)\s*-->/;

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
    safeWriteFileSync(dest, `# Changelog\n${entry}`, { skipRedact: true, atomic: true });
    return { ok: true, action: "created", path: dest };
  }

  const existing = fs.readFileSync(dest, "utf8");
  if (existing.includes(marker)) {
    return { ok: true, action: "skipped", path: dest, reason: "already synced" };
  }

  safeWriteFileSync(dest, existing + entry, { skipRedact: true, atomic: true });

  // ── 滚动归档：超过 200 行时保留最近 5 条 → 其余移入 CHANGELOG-ARCHIVE.md ──
  const afterAppend = fs.readFileSync(dest, "utf8");
  const lineCount = afterAppend.split("\n").length;
  if (lineCount > 200) {
    const archivePath = path.join(workspaceDir, "CHANGELOG-ARCHIVE.md");
    const allEntries = splitByMarkers(afterAppend);
    if (allEntries.length > 5) {
      const keep = allEntries.slice(-5);
      const archive = allEntries.slice(0, -5);

      const archiveBody = archive
        .map((e) => `${e.header}\n${e.body}`)
        .join("\n\n");
      const existingArchive = fs.existsSync(archivePath)
        ? fs.readFileSync(archivePath, "utf8")
        : "";
      const archiveHeader = `# Changelog Archive\n\n> 自动归档：CHANGELOG.md 超出 200 行时较早的条目移至此处。`;
      let newArchive: string;
      if (existingArchive.includes("Changelog Archive")) {
        newArchive = `${existingArchive.replace(/# Changelog Archive[^]*?(?=\n##)/, "").trimEnd()}\n\n## Archived at ${date}\n\n${archiveBody}\n`;
      } else {
        newArchive = `${archiveHeader}\n\n## Archived at ${date}\n\n${archiveBody}\n`;
      }

      // 重建 CHANGELOG.md 只保留最近 5 条
      const keepBody = keep
        .map((e) => `${e.header}\n${e.body}`)
        .join("\n\n");
      const headerNote = `> 📦 较早的变更已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。`;
      safeWriteFileSync(dest, `# Changelog\n\n${headerNote}\n\n${keepBody}\n`, { skipRedact: true, skipFormat: true, atomic: true });
      safeWriteFileSync(archivePath, newArchive, { skipRedact: true, skipFormat: true, atomic: true });
      return { ok: true, action: "archived", path: dest, reason: `>200 lines → kept last 5 entries, archived rest to CHANGELOG-ARCHIVE.md (${allEntries.length - 5} entries)` };
    }
  }

  return { ok: true, action: "appended", path: dest };
}

/** 将 CHANGELOG.md 按 <!-- taiyi:slug --> 标记分割为条目 */
function splitByMarkers(content: string): Array<{ header: string; body: string }> {
  const lines = content.split("\n");
  const entries: Array<{ header: string; body: string }> = [];
  let currentHeader = "";
  let currentBodyLines: string[] = [];
  let inEntry = false;

  for (const line of lines) {
    const match = line.match(TAIYI_MARKER_RE);
    if (match) {
      if (inEntry) {
        entries.push({ header: currentHeader, body: currentBodyLines.join("\n").trim() });
      }
      currentHeader = line;
      currentBodyLines = [];
      inEntry = true;
    } else if (inEntry) {
      currentBodyLines.push(line);
    }
  }
  if (inEntry) {
    entries.push({ header: currentHeader, body: currentBodyLines.join("\n").trim() });
  }

  return entries;
}
