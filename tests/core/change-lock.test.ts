import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ChangeLock } from "../../src/core/change-lock.js";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

describe("ChangeLock", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chlock-"));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("acquire and release works", () => {
    const lock = new ChangeLock(tmpDir, "test-slug");
    lock.acquire();
    expect(lock.held).toBe(true);
    lock.release();
    expect(lock.held).toBe(false);
  });

  it("second acquire on same slug blocks", () => {
    const lock1 = new ChangeLock(tmpDir, "test-slug");
    const lock2 = new ChangeLock(tmpDir, "test-slug");
    lock1.acquire();
    expect(() => lock2.acquire(200)).toThrow();
    lock1.release();
  });

  it("different slugs don't block each other", () => {
    const lock1 = new ChangeLock(tmpDir, "slug-a");
    const lock2 = new ChangeLock(tmpDir, "slug-b");
    lock1.acquire();
    lock2.acquire(200); // should not throw
    lock1.release();
    lock2.release();
  }, 10000);

  it("release is idempotent", () => {
    const lock = new ChangeLock(tmpDir, "test-slug");
    lock.release(); // should not throw
    expect(lock.held).toBe(false);
  });
});
