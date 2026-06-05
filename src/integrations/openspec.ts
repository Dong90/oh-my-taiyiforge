import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type OpenspecStatus = {
  detected: boolean;
  configPath: string | null;
  changeExists: boolean;
  changePath: string | null;
  suggestedArchiveCommand: string | null;
};

export function getOpenspecStatus(workspaceDir: string, slug: string): OpenspecStatus {
  const root = path.resolve(workspaceDir);
  const configPath = path.join(root, "openspec", "config.yaml");
  const detected = fs.existsSync(configPath);
  const changePath = path.join(root, "openspec", "changes", slug);
  const changeExists = detected && fs.existsSync(changePath);

  return {
    detected,
    configPath: detected ? configPath : null,
    changeExists,
    changePath: changeExists ? changePath : null,
    suggestedArchiveCommand: changeExists
      ? `openspec archive ${slug} -y`
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

  return {
    ok: proc.status === 0,
    exitCode: proc.status ?? undefined,
    stdout: proc.stdout?.trim(),
    stderr: proc.stderr?.trim(),
    reason: proc.status !== 0 ? proc.stderr || proc.stdout || `exit ${proc.status}` : undefined,
  };
}
