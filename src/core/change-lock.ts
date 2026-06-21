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

  async acquire(timeoutMs = 5000): Promise<void> {
    if (this.held) return;
    const release = await lockfile.lock(this.lockfilePath, {
      realpath: false,
      retries: { retries: Math.ceil(timeoutMs / 200), minTimeout: 200 },
    });
    this.releaseFn = release as unknown as () => void;
    this.held = true;
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
