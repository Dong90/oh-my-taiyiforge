import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/** 默认 git worktree 隔离；`TAIYI_PROBE_IN_PLACE=1` 或 `TAIYI_PROBE_WORKTREE=0` 回退主工作区。 */
export function useProbeWorktree() {
  if (process.env.TAIYI_PROBE_IN_PLACE === "1") return false;
  if (process.env.TAIYI_PROBE_WORKTREE === "0") return false;
  return true;
}

export function resolveProbeCwd(repoRoot) {
  if (!useProbeWorktree()) return repoRoot;

  const wtPath = path.join(repoRoot, ".taiyi", "probe-worktree");
  if (fs.existsSync(wtPath)) {
    spawnSync("git", ["worktree", "remove", "--force", wtPath], {
      cwd: repoRoot,
      stdio: "ignore",
    });
  }
  fs.mkdirSync(path.dirname(wtPath), { recursive: true });
  const add = spawnSync("git", ["worktree", "add", "--detach", wtPath, "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (add.status !== 0) {
    console.warn("[probe] worktree add failed, falling back to in-place:", add.stderr?.trim());
    return repoRoot;
  }
  return wtPath;
}

export function cleanupProbeWorktree(repoRoot) {
  if (!useProbeWorktree()) return;
  const wtPath = path.join(repoRoot, ".taiyi", "probe-worktree");
  if (fs.existsSync(wtPath)) {
    spawnSync("git", ["worktree", "remove", "--force", wtPath], {
      cwd: repoRoot,
      stdio: "ignore",
    });
  }
}
