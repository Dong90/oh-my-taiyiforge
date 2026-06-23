import fs from "node:fs";
import path from "node:path";

/** Register SIGINT/SIGTERM handlers that clean up runtime state before exit. */
export function registerSignalHandlers(taiyiRoot?: string): void {
  const handler = (signal: NodeJS.Signals) => {
    if (taiyiRoot) {
      cleanupRuntimeModes(taiyiRoot);
      cleanupStaleLocks(taiyiRoot);
    }
    const sigCode = signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1;
    process.exit(sigCode);
  };

  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
}

/** Set active:false on all runtime mode files so stale modes are not resumed. */
export function cleanupRuntimeModes(taiyiRoot: string): void {
  const runtimeDir = path.join(taiyiRoot, "runtime");
  if (!fs.existsSync(runtimeDir)) return;
  try {
    for (const file of fs.readdirSync(runtimeDir)) {
      if (!file.endsWith("-mode.json")) continue;
      const fp = path.join(runtimeDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(fp, "utf8"));
        if (data.active === true) {
          fs.writeFileSync(
            fp,
            JSON.stringify(
              { ...data, active: false, shutdownAt: new Date().toISOString() },
              null,
              2,
            ) + "\n",
            "utf8",
          );
        }
      } catch {
        fs.unlinkSync(fp);
      }
    }
  } catch {
    // Best-effort cleanup
  }
}

/** Remove stale lock files for all changes. */
export function cleanupStaleLocks(taiyiRoot: string): void {
  const changesDir = path.join(taiyiRoot, "changes");
  if (!fs.existsSync(changesDir)) return;
  try {
    for (const slug of fs.readdirSync(changesDir)) {
      const lockFile = path.join(changesDir, slug, ".lock");
      try {
        if (fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile);
        }
      } catch {
        // Best-effort
      }
    }
  } catch {
    // Best-effort
  }
}
