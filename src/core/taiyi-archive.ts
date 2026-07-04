import fs from "node:fs";
import path from "node:path";

export type TaiyiArchiveResult = {
  ok: boolean;
  dest?: string;
  reason?: string;
};

function isExistingDir(p: string): boolean {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function hasChangeState(dir: string): boolean {
  return fs.existsSync(path.join(dir, "state.json"));
}

/** 目录有效当且仅当含 state.json（避免空 changes/ 壳目录挡住 archive） */
function isValidChangeDir(dir: string): boolean {
  return isExistingDir(dir) && hasChangeState(dir);
}

function isDirWorkflowCompleted(dir: string): boolean {
  if (!hasChangeState(dir)) return false;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8")) as {
      completedPhases?: string[];
      skippedPhases?: string[];
      workflowStatus?: string;
    };
    const skipped = raw.skippedPhases?.length ?? 0;
    const total = 9 - skipped;
    const cp = raw.completedPhases ?? [];
    if (cp.length >= total && cp.includes("integration")) return true;
    return raw.workflowStatus === "completed" && cp.includes("integration");
  } catch {
    return false;
  }
}

/** 活跃或已归档变更目录 */
export function resolveChangeDir(taiyiRoot: string, slug: string): string | null {
  const active = path.join(taiyiRoot, "changes", slug);
  const archived = findExistingArchiveDir(taiyiRoot, slug);

  const activeOk = isValidChangeDir(active);
  const archivedOk = archived != null && isValidChangeDir(archived);

  if (activeOk && !archivedOk) return active;
  if (archivedOk && !activeOk) return archived;
  if (activeOk && archivedOk) {
    const activeDone = isDirWorkflowCompleted(active);
    const archivedDone = archived != null && isDirWorkflowCompleted(archived);
    if (archivedDone && !activeDone) return archived;
    return active;
  }
  return null;
}

function archiveDirMatchesSlug(dirName: string, slug: string): boolean {
  if (dirName === slug) return true;
  if (dirName.startsWith(`${slug}-`)) return true;
  if (dirName.endsWith(`-${slug}`)) return true;
  return false;
}

function readStateSlug(dir: string): string | null {
  if (!hasChangeState(dir)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8")) as { slug?: string };
    return typeof raw.slug === "string" ? raw.slug : null;
  } catch {
    return null;
  }
}

function findExistingArchiveDir(taiyiRoot: string, slug: string): string | null {
  const archiveRoot = path.join(taiyiRoot, "archive");
  if (!fs.existsSync(archiveRoot)) return null;
  const direct = path.join(archiveRoot, slug);
  if (isValidChangeDir(direct)) return direct;
  for (const ent of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (!archiveDirMatchesSlug(ent.name, slug)) continue;
    const candidate = path.join(archiveRoot, ent.name);
    if (isValidChangeDir(candidate)) return candidate;
  }
  // 目录名不含 slug 时读 state.json（探测/手工归档）
  for (const ent of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const candidate = path.join(archiveRoot, ent.name);
    if (!isValidChangeDir(candidate)) continue;
    if (readStateSlug(candidate) === slug) return candidate;
  }
  return null;
}

/** 查找 .taiyi/archive 下已存在的变更目录（含 dated 后缀如 2026-06-09-slug） */
export function findExistingArchiveDirForSlug(taiyiRoot: string, slug: string): string | null {
  return findExistingArchiveDir(taiyiRoot, slug);
}

/** OpenSpec 已归档时：保留 .taiyi/changes/ 供 verify/status，不重复移动。 */
export function taiyiArchiveWhenOpenspecAlreadyDone(
  taiyiRoot: string,
  slug: string,
): TaiyiArchiveResult {
  const active = path.join(taiyiRoot, "changes", slug);
  const existing = findExistingArchiveDir(taiyiRoot, slug);
  if (existing) {
    return {
      ok: true,
      dest: existing,
      reason: "Taiyi 已在 .taiyi/archive/（幂等，未重复移动）",
    };
  }
  if (fs.existsSync(active)) {
    return {
      ok: true,
      reason:
        "OpenSpec 已归档；Taiyi 变更仍在 .taiyi/changes/（verify/status 可用，无需重复移动）",
    };
  }
  return { ok: false, reason: `变更目录不存在: ${active}` };
}

export function isTaiyiArchived(taiyiRoot: string, slug: string): boolean {
  return findExistingArchiveDir(taiyiRoot, slug) != null;
}

/** 无 OpenSpec 时 Taiyi 侧归档：移入 .taiyi/archive/<slug>/ */
export function archiveTaiyiChange(
  taiyiRoot: string,
  slug: string,
  options?: { openspec?: boolean },
): TaiyiArchiveResult {
  const src = path.join(taiyiRoot, "changes", slug);
  const existing = findExistingArchiveDir(taiyiRoot, slug);
  if (existing) {
    return {
      ok: true,
      dest: existing,
      reason: "already in .taiyi/archive (跳过重复移动)",
    };
  }
  if (!fs.existsSync(src)) {
    return { ok: false, reason: `变更目录不存在: ${src}` };
  }

  // 归档前审计：扫描 DESIGN.md 中未关闭的 Open Questions
  const designPath = path.join(src, "DESIGN.md");
  if (fs.existsSync(designPath)) {
    const designContent = fs.readFileSync(designPath, "utf8");
    const openSection = designContent.match(/##\s*Open[^\n]*\n([\s\S]*?)(?=\n##\s|$)/);
    if (openSection) {
      const openItems = openSection[1].split("\n").map(l => l.trim()).filter(l => /^- \[ \]/.test(l));
      if (openItems.length > 0) {
        console.warn(`[taiyi-archive] ⚠️ ${slug}: ${openItems.length} open question(s) in DESIGN.md — consider resolving before archiving:`);
        for (const item of openItems) {
          console.warn(`[taiyi-archive]   ${item}`);
        }
      }
    }
  }

  const archiveRoot = path.join(taiyiRoot, "archive");
  fs.mkdirSync(archiveRoot, { recursive: true });

  const dest = path.join(archiveRoot, slug);

  // 二次检查（防 race：check-then-act 窗口）—— 已存在则改用 dated 目录
  let finalDest = dest;
  if (fs.existsSync(dest)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    finalDest = path.join(archiveRoot, `${slug}-${stamp}`);
  }
  fs.renameSync(src, finalDest);
  // 存相对路径，避免 .taiyi-archive.json 泄漏绝对路径
  const relPath = path.relative(taiyiRoot, finalDest);
  const manifest = {
    slug,
    archivedAt: new Date().toISOString(),
    path: relPath.startsWith("..") ? finalDest : relPath,
    openspec: options?.openspec ?? false,
  };
  fs.writeFileSync(path.join(finalDest, ".taiyi-archive.json"), JSON.stringify(manifest, null, 2) + "\n");

  return { ok: true, dest: finalDest };
}

export function formatTaiyiArchivePlain(slug: string, result: TaiyiArchiveResult): string {
  if (!result.ok) return `Taiyi 归档失败 (${slug}): ${result.reason ?? "unknown"}`;
  if (result.reason?.match(/幂等|already|跳过重复/i)) {
    return [
      `✓ 已归档 (${slug})（幂等 no-op）`,
      `  ${result.reason}`,
      result.dest ? `  路径: ${result.dest}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `✓ Taiyi 归档完成（无 OpenSpec，已移入 .taiyi/archive/）`,
    `  slug: ${slug}`,
    `  path: ${result.dest}`,
    "  九阶段 workflowStatus=completed；OpenSpec archive 未执行（项目未 init openspec）",
  ].join("\n");
}
