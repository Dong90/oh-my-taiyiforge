import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type OpenspecStatus = {
  detected: boolean;
  configPath: string | null;
  changeExists: boolean;
  changePath: string | null;
  archivedExists: boolean;
  archivedPath: string | null;
  suggestedArchiveCommand: string | null;
};

function archiveDirMatchesSlug(dirName: string, slug: string): boolean {
  if (dirName === slug) return true;
  return dirName.endsWith(`-${slug}`);
}

/** 查找 openspec/changes/archive/* 下已归档变更 */
export function findOpenspecArchivedChange(workspaceDir: string, slug: string): string | null {
  const archiveRoot = path.join(path.resolve(workspaceDir), "openspec", "changes", "archive");
  if (!fs.existsSync(archiveRoot)) return null;
  for (const ent of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (archiveDirMatchesSlug(ent.name, slug)) {
      return path.join(archiveRoot, ent.name);
    }
  }
  return null;
}

export function getOpenspecStatus(workspaceDir: string, slug: string): OpenspecStatus {
  const root = path.resolve(workspaceDir);
  const configPath = path.join(root, "openspec", "config.yaml");
  const detected = fs.existsSync(configPath);
  const changePath = path.join(root, "openspec", "changes", slug);
  const changeExists = detected && fs.existsSync(changePath);
  const archivedPath = findOpenspecArchivedChange(workspaceDir, slug);

  return {
    detected,
    configPath: detected ? configPath : null,
    changeExists,
    changePath: changeExists ? changePath : null,
    archivedExists: archivedPath != null,
    archivedPath,
    suggestedArchiveCommand: changeExists
      ? `openspec archive ${slug} -y`
      : archivedPath
        ? null
        : detected
          ? `openspec change create ${slug}  # 或手动建 openspec/changes/${slug}/`
          : null,
  };
}

export type ArchiveOptions = {
  skipSpecs?: boolean;
  yes?: boolean;
  openspecBin?: string;
};

export function runOpenspecArchive(
  workspaceDir: string,
  slug: string,
  options: ArchiveOptions = {},
): {
  ok: boolean;
  skipped?: boolean;
  alreadyArchived?: boolean;
  reason?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
} {
  const status = getOpenspecStatus(workspaceDir, slug);
  if (!status.detected) {
    return { ok: true, skipped: true, reason: "OpenSpec not initialized in this project" };
  }
  if (!status.changeExists) {
    if (status.archivedExists) {
      return {
        ok: true,
        skipped: true,
        alreadyArchived: true,
        reason: `OpenSpec 已归档: ${path.relative(path.resolve(workspaceDir), status.archivedPath!)}`,
      };
    }
    return {
      ok: false,
      skipped: true,
      reason: `No openspec/changes/${slug}/ directory`,
    };
  }

  const bin = options.openspecBin ?? "openspec";
  const args = ["archive", slug];
  if (options.yes !== false) args.push("-y");
  if (options.skipSpecs) args.push("--skip-specs");

  const proc = spawnSync(bin, args, {
    cwd: path.resolve(workspaceDir),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (proc.error) {
    return { ok: false, reason: proc.error.message };
  }

  const combined = `${proc.stderr ?? ""}\n${proc.stdout ?? ""}`;
  if (proc.status !== 0 && /already exists|already archived/i.test(combined)) {
    const archived = findOpenspecArchivedChange(workspaceDir, slug);
    return {
      ok: true,
      skipped: true,
      alreadyArchived: true,
      exitCode: proc.status ?? undefined,
      stdout: proc.stdout?.trim(),
      stderr: proc.stderr?.trim(),
      reason: archived
        ? `OpenSpec 已归档: ${path.relative(path.resolve(workspaceDir), archived)}`
        : "OpenSpec archive already exists",
    };
  }

  return {
    ok: proc.status === 0,
    exitCode: proc.status ?? undefined,
    stdout: proc.stdout?.trim(),
    stderr: proc.stderr?.trim(),
    reason: proc.status !== 0 ? proc.stderr || proc.stdout || `exit ${proc.status}` : undefined,
  };
}
