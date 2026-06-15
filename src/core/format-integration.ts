import type { SyncResult } from "../integrations/openspec-sync.js";
import type { OpenspecStatus } from "../integrations/openspec.js";

type SyncHandlerResult =
  | (SyncResult & { error?: string })
  | { ok: false; error: string };
type ArchiveHandlerResult = {
  ok: boolean;
  skipped?: boolean;
  alreadyArchived?: boolean;
  reason?: string;
  error?: string;
  openspec?: OpenspecStatus;
  stdout?: string;
  text?: string;
  taiyiArchive?: { ok: boolean; dest?: string; reason?: string };
};

/** 人类可读 sync 输出（聊天 /taiyi:sync → 引擎 `sync` 或 `sync-openspec`） */
export function formatSyncOpenspecPlain(slug: string, r: SyncHandlerResult): string {
  if ("error" in r) return `✗ sync 失败 (${slug}): ${r.error}`;
  if (!r.ok) return `✗ sync 失败 (${slug}): ${r.reason ?? "unknown"}`;
  if (r.skipped) return `○ sync 跳过 (${slug}): ${r.reason ?? "OpenSpec 未初始化"}`;
  const lines = [`✓ 已同步 ${slug} → ${r.changePath ?? `openspec/changes/${slug}/`}`];
  if (r.copied.length > 0) lines.push(`  写入: ${r.copied.join(", ")}`);
  if (r.skippedFiles.length > 0) {
    lines.push(`  已存在未覆盖: ${r.skippedFiles.join(", ")}（加 --force 覆盖）`);
  }
  return lines.join("\n");
}

/** 人类可读 archive 输出 */
export function formatArchivePlain(slug: string, r: ArchiveHandlerResult): string {
  if (r.text?.trim()) return r.text;
  if (r.error) return `✗ archive 失败 (${slug}): ${r.error}`;
  if (!r.ok) {
    const detail = r.reason ?? "openspec archive failed";
    return `✗ archive 失败 (${slug}): ${detail}`;
  }
  if (r.skipped || r.alreadyArchived) {
    if (r.text?.trim()) return r.text;
    if (r.taiyiArchive?.ok) {
      const reason = r.taiyiArchive.reason ?? r.reason ?? "无 OpenSpec";
      if (reason.includes("幂等") || reason.includes("already") || reason.includes("跳过重复")) {
        return [
          `✓ 已归档 (${slug})（幂等 no-op）`,
          `  ${reason}`,
          r.taiyiArchive.dest ? `  路径: ${r.taiyiArchive.dest}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }
      return [
        `✓ Taiyi 归档完成 (${slug})`,
        `  ${reason}`,
        r.taiyiArchive.dest ? `  路径: ${r.taiyiArchive.dest}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    if (r.alreadyArchived) {
      return `✓ 已归档 (${slug})（幂等 no-op）\n  ${r.reason ?? ""}`.trim();
    }
    return `○ archive 跳过 (${slug}): ${r.reason ?? "OpenSpec 未安装"}`;
  }
  const dest = r.openspec?.changePath ?? `openspec/changes/${slug}/`;
  return `✓ 已归档 ${slug}（OpenSpec archive 完成）\n  路径: ${dest}`;
}
