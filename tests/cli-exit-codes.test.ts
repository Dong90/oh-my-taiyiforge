import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { taiyiToken } from "../src/plugin/handlers.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveCli(): string[] {
  const built = path.join(REPO, "dist/cli/taiyi.js");
  if (fs.existsSync(built)) return ["node", built];
  return ["node", "--import", "tsx", path.join(REPO, "src/cli/taiyi.ts")];
}

function runTaiyiCli(cwd: string, argv: string[]): { code: number; out: string } {
  const [bin, ...cliArgs] = resolveCli();
  const r = spawnSync(bin, [...cliArgs, ...argv], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: REPO },
  });
  return {
    code: r.status ?? 1,
    out: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
}

describe("CLI exit codes & aliases", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-cli-exit-"));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("help exits 0", () => {
    const r = runTaiyiCli(workspace, ["help"]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/TaiyiForge/);
  });

  it("unknown command exits 2", () => {
    const r = runTaiyiCli(workspace, ["not-a-real-command"]);
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/TaiyiForge|用法/);
  });

  it("deleted explore command exits 2 (unknown)", () => {
    const r = runTaiyiCli(workspace, ["explore"]);
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/TaiyiForge/);
  });

  it("legacy ls alias maps to list", () => {
    fs.mkdirSync(path.join(workspace, ".taiyi/changes"), { recursive: true });
    const r = runTaiyiCli(workspace, ["ls"]);
    expect(r.code).toBe(0);
  });

  it("legacy run alias maps to walkthrough (not unknown)", () => {
    const r = runTaiyiCli(workspace, ["run"]);
    expect(r.code).not.toBe(2);
    expect(r.out).not.toMatch(/unknown command/i);
  });

  it("npx taiyi-forge run alias maps to walkthrough", () => {
    const built = path.join(REPO, "dist/cli/taiyi.js");
    expect(fs.existsSync(built)).toBe(true);
    const r = spawnSync(process.execPath, [path.join(REPO, "scripts/taiyi-forge.mjs"), "run"], {
      cwd: workspace,
      encoding: "utf8",
      env: { ...process.env, TAIYI_FORGE_ROOT: REPO },
    });
    expect(r.status).not.toBe(2);
    expect(`${r.stdout ?? ""}${r.stderr ?? ""}`).not.toMatch(/unknown command/i);
  });

  it("init rejects invalid --profile with exit 1", () => {
    const r = runTaiyiCli(workspace, [
      "init",
      "bad-profile-slug",
      "--profile",
      "notreal",
      "--title",
      "x",
    ]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/无效 profile|notreal/);
    expect(r.out).toMatch(/full, api, ui, lite/);
    expect(fs.existsSync(path.join(workspace, ".taiyi/changes/bad-profile-slug"))).toBe(false);
  });

  it("phases exits 0", () => {
    const r = runTaiyiCli(workspace, ["phases"]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/change|requirement/);
  });

  it("check alias maps to harness (not unknown)", () => {
    fs.mkdirSync(path.join(workspace, ".taiyi/changes"), { recursive: true });
    const r = runTaiyiCli(workspace, ["check", "missing-slug"]);
    expect(r.code).not.toBe(2);
    expect(r.out).not.toMatch(/已移除/);
  });

  it("next is not legacy-redirected", () => {
    fs.mkdirSync(path.join(workspace, ".taiyi/changes"), { recursive: true });
    const r = runTaiyiCli(workspace, ["next", "missing-slug"]);
    expect(r.code).not.toBe(2);
    expect(r.out).not.toMatch(/已移除.*status/);
  });

  it("continue rejects invalid slug with hint", () => {
    fs.mkdirSync(path.join(workspace, ".taiyi/changes"), { recursive: true });
    const r = runTaiyiCli(workspace, ["continue", "Bad_Slug!"]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/slug must match|示例:/);
  });

  it("token compress on archive-only slug exits 1 without crash (CLI)", () => {
    const archiveDir = path.join(workspace, ".taiyi/archive/arch-only");
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(
      path.join(archiveDir, "state.json"),
      JSON.stringify({
        slug: "arch-only",
        currentPhase: "integration",
        completedPhases: ["change", "requirement", "dev", "test", "integration"],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "completed",
        autoHarness: false,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      }),
    );
    fs.writeFileSync(
      path.join(archiveDir, "CHANGE.md"),
      "# CHANGE\n\n## Motivation\nx\n\n## Scope\nin\n\n## Success Criteria\n- [x] ok\n",
    );

    const handler = taiyiToken(workspace, "compress", { slug: "arch-only" });
    expect(handler.ok).toBe(false);

    const r = runTaiyiCli(workspace, ["token", "compress", "arch-only"]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/归档|已完成/);
  });
});
