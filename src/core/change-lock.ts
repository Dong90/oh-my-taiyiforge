import lockfile from "proper-lockfile";
import path from "node:path";
import fs from "node:fs";

export class ChangeLock {
  public held = false;
  private lockfilePath: string;
  private releaseFn: (() => void) | null = null;

  constructor(private taiyiRoot: string, private slug: string) {
    const dir = path.join(taiyiRoot, "changes", slug);
    fs.mkdirSync(dir, { recursive: true });
    this.lockfilePath = path.join(dir, ".lock");
  }

  acquire(timeoutMs = 5000): void {
    if (this.held) return;
    // Ensure lockfile exists (lockSync requires an existing file)
    if (!fs.existsSync(this.lockfilePath)) {
      fs.writeFileSync(this.lockfilePath, "");
    }
    const deadline = Date.now() + timeoutMs;
    let lastError: Error | null = null;
    while (Date.now() < deadline) {
      try {
        const release = lockfile.lockSync(this.lockfilePath, { realpath: false });
        this.releaseFn = release as unknown as () => void;
        this.held = true;
        return;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        // Spin-wait ~200ms before retry
        const spinUntil = Date.now() + 200;
        while (Date.now() < spinUntil) { /* intentional busy-wait */ }
      }
    }
    throw lastError ?? new Error(`Could not acquire lock within ${timeoutMs}ms`);
  }

  release(): void {
    if (!this.held || !this.releaseFn) return;
    try {
      this.releaseFn();
    } catch {
      /* already released by another path */
    }
    this.held = false;
    this.releaseFn = null;
  }
}
