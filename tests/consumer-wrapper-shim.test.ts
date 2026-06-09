import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { installProjectWrapper } from "../src/install/sync-project-wrapper.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function runConsumerWrapper(cwd: string, argv: string[]): { code: number; out: string } {
  const script = path.join(cwd, "scripts", "taiyi-forge.sh");
  const r = spawnSync("bash", [script, ...argv], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: REPO },
  });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

describe("consumer wrapper shim", () => {
  let consumer: string;

  beforeEach(() => {
    consumer = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-consumer-shim-"));
    fs.mkdirSync(path.join(consumer, "node_modules"), { recursive: true });
    fs.symlinkSync(REPO, path.join(consumer, "node_modules", "oh-my-taiyiforge"), "dir");
    fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify({ name: "shim-test" }));
    installProjectWrapper(consumer, REPO);
  });

  afterEach(() => {
    fs.rmSync(consumer, { recursive: true, force: true });
  });

  it("forwards prune to CLI (exit 0)", () => {
    fs.mkdirSync(path.join(consumer, ".taiyi", "changes"), { recursive: true });
    const r = runConsumerWrapper(consumer, ["prune", "--dry-run"]);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/prune|孤儿|runtime|将删除/i);
  });

  it("forwards list --archived with [archived] tag only", () => {
    writeState(path.join(consumer, ".taiyi", "changes", "still-active"), "still-active");
    const arch = path.join(consumer, ".taiyi", "archive", "done-slug");
    fs.mkdirSync(arch, { recursive: true });
    fs.writeFileSync(
      path.join(arch, "state.json"),
      JSON.stringify({
        slug: "done-slug",
        currentPhase: "integration",
        completedPhases: ["change", "requirement", "dev", "test", "integration"],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "completed",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
      }),
    );
    const r = runConsumerWrapper(consumer, ["list", "--archived"]);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("done-slug");
    expect(r.out).toContain("[archived]");
    expect(r.out).not.toContain("still-active");
  });

  function writeState(dir: string, slug: string) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "state.json"),
      JSON.stringify({
        slug,
        currentPhase: "change",
        completedPhases: [],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "active",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
      }),
    );
  }

  it("forwards smoke-reset and trim-ahead (not unknown exit 2)", () => {
    const reset = runConsumerWrapper(consumer, ["smoke-reset"]);
    expect(reset.code, reset.out).toBe(0);
    expect(reset.out).toMatch(/smoke-reset|stop-mode/i);

    const trim = runConsumerWrapper(consumer, ["trim-ahead"]);
    expect(trim.code, trim.out).not.toBe(2);
    expect(trim.out).not.toMatch(/unknown command/i);
  });

  it("migrates legacy full wrapper missing prune", () => {
    const legacy = `#!/usr/bin/env bash
set -euo pipefail
cmd="\${1:-help}"; shift || true
case "$cmd" in
  list) node missing/taiyi.js list ;;
  *) echo unknown; exit 2 ;;
esac
`;
    fs.writeFileSync(path.join(consumer, "scripts", "taiyi-forge.sh"), legacy, "utf8");
    const r = installProjectWrapper(consumer, REPO);
    expect(r.action).toBe("updated");
    expect(r.detail).toMatch(/迁移|shim/i);
    const prune = runConsumerWrapper(consumer, ["prune", "--dry-run"]);
    expect(prune.code, prune.out).toBe(0);
  });
});
