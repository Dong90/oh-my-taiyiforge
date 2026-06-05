import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getOpenspecStatus, runOpenspecArchive } from "../src/integrations/openspec.js";

describe("openspec integration", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-os-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("detects missing OpenSpec", () => {
    const s = getOpenspecStatus(tmp, "my-change");
    expect(s.detected).toBe(false);
    expect(s.changeExists).toBe(false);
    expect(s.suggestedArchiveCommand).toBeNull();
  });

  it("detects change directory and suggests archive command", () => {
    fs.mkdirSync(path.join(tmp, "openspec", "changes", "feat-a"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "openspec", "config.yaml"), "change_root: openspec/changes\n");

    const s = getOpenspecStatus(tmp, "feat-a");
    expect(s.detected).toBe(true);
    expect(s.changeExists).toBe(true);
    expect(s.suggestedArchiveCommand).toBe("openspec archive feat-a -y");
  });

  it("skips archive when OpenSpec not initialized", () => {
    const r = runOpenspecArchive(tmp, "x");
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
  });
});
