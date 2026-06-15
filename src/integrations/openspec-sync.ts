import fs from "node:fs";
import path from "node:path";
import { getOpenspecStatus } from "./openspec.js";

/** TaiyiForge 工件 → OpenSpec 变更目录文件名 */
export const TAIYI_TO_OPENSPEC: Record<string, string> = {
  "CHANGE.md": "proposal.md",
  "REQUIREMENT.md": "specs/spec.md",
  "DESIGN.md": "design.md",
  "UI-DESIGN.md": "clarify.md",
  "TASK.md": "tasks.md",
  "TEST.md": "specs/test.md",
  "REVIEW.md": "review.md",
  "CHANGELOG.md": "changelog.md",
};

export type SyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  copied: string[];
  skippedFiles: string[];
  changePath: string | null;
};

export function syncTaiyiToOpenspec(
  workspaceDir: string,
  slug: string,
  taiyiChangeDir: string,
  options?: { force?: boolean; createChangeDir?: boolean },
): SyncResult {
  const status = getOpenspecStatus(workspaceDir, slug);
  if (!status.detected) {
    return {
      ok: true,
      skipped: true,
      reason: "OpenSpec not initialized",
      copied: [],
      skippedFiles: [],
      changePath: null,
    };
  }

  if (status.archivedExists && !options?.force) {
    const rel = status.archivedPath
      ? path.relative(path.resolve(workspaceDir), status.archivedPath)
      : "openspec/changes/archive/";
    const hint = status.changeExists
      ? `误建了 openspec/changes/${slug}/ — 删除后勿再 sync，或 --force 覆盖`
      : "已 archive 后不应再写 active 目录";
    return {
      ok: false,
      skipped: true,
      reason: `OpenSpec 已归档于 ${rel}；${hint}`,
      copied: [],
      skippedFiles: [],
      changePath: status.changePath,
    };
  }

  let changePath = status.changePath;
  if (!changePath && options?.createChangeDir) {
    changePath = path.join(workspaceDir, "openspec", "changes", slug);
    fs.mkdirSync(changePath, { recursive: true });
    fs.mkdirSync(path.join(changePath, "specs"), { recursive: true });
  }

  if (!changePath) {
    return {
      ok: false,
      skipped: true,
      reason: `Missing openspec/changes/${slug}/ (use createChangeDir or mkdir first)`,
      copied: [],
      skippedFiles: [],
      changePath: null,
    };
  }

  const copied: string[] = [];
  const skippedFiles: string[] = [];
  const banner = (name: string) =>
    `<!-- synced from TaiyiForge .taiyi/changes/${slug}/${name} -->\n\n`;

  for (const [srcName, destRel] of Object.entries(TAIYI_TO_OPENSPEC)) {
    const src = path.join(taiyiChangeDir, srcName);
    if (!fs.existsSync(src)) continue;

    const dest = path.join(changePath, destRel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (fs.existsSync(dest) && !options?.force) {
      skippedFiles.push(destRel);
      continue;
    }

    const body = fs.readFileSync(src, "utf8");
    fs.writeFileSync(dest, banner(srcName) + body, "utf8");
    copied.push(`${srcName} → ${destRel}`);
  }

  return { ok: true, copied, skippedFiles, changePath };
}
