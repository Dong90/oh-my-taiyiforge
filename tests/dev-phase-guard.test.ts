import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  detectEarlyCodeChanges,
  earlyCodeBlockOnContinue,
} from "../src/core/dev-phase-guard.js";

describe("dev-phase-guard", () => {
  let workspace: string;
  const prevGuard = process.env.TAIYI_EARLY_CODE_GUARD;
  const prevBlock = process.env.TAIYI_EARLY_CODE_BLOCK;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-guard-"));
    execSync("git init", { cwd: workspace, stdio: "ignore" });
    execSync('git config user.email "t@test.com"', { cwd: workspace, stdio: "ignore" });
    execSync('git config user.name "t"', { cwd: workspace, stdio: "ignore" });
    delete process.env.TAIYI_EARLY_CODE_GUARD;
    delete process.env.TAIYI_EARLY_CODE_BLOCK;
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
    if (prevGuard === undefined) delete process.env.TAIYI_EARLY_CODE_GUARD;
    else process.env.TAIYI_EARLY_CODE_GUARD = prevGuard;
    if (prevBlock === undefined) delete process.env.TAIYI_EARLY_CODE_BLOCK;
    else process.env.TAIYI_EARLY_CODE_BLOCK = prevBlock;
  });

  it("warns on business code changes before dev", () => {
    fs.mkdirSync(path.join(workspace, "src"), { recursive: true });
    fs.writeFileSync(path.join(workspace, "src", "app.ts"), "export {}");
    execSync("git add . && git commit -m init", { cwd: workspace, stdio: "ignore" });
    fs.writeFileSync(path.join(workspace, "src", "app.ts"), "export const x = 1");
    const w = detectEarlyCodeChanges(workspace, "design");
    expect(w?.code).toBe("code.before-dev-phase");
    expect(w?.files).toContain("src/app.ts");
  });

  it("ignores .taiyi paths", () => {
    fs.mkdirSync(path.join(workspace, ".taiyi", "changes", "x"), { recursive: true });
    fs.writeFileSync(path.join(workspace, ".taiyi", "changes", "x", "CHANGE.md"), "# x");
    const w = detectEarlyCodeChanges(workspace, "change");
    expect(w).toBeNull();
  });

  it("no warning at dev phase", () => {
    fs.mkdirSync(path.join(workspace, "src"), { recursive: true });
    fs.writeFileSync(path.join(workspace, "src", "app.ts"), "x");
    expect(detectEarlyCodeChanges(workspace, "dev")).toBeNull();
  });

  it("earlyCodeBlockOnContinue defaults on unless disabled", () => {
    expect(earlyCodeBlockOnContinue({})).toBe(true);
    expect(earlyCodeBlockOnContinue({ TAIYI_EARLY_CODE_BLOCK: "0" })).toBe(false);
    expect(earlyCodeBlockOnContinue({ TAIYI_EARLY_CODE_BLOCK: "false" })).toBe(false);
  });
});
