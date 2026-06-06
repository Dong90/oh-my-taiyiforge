import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import {
  deliveryGateEnabled,
  evaluateDeliveryGate,
} from "../src/core/gates/delivery-gate.js";

describe("delivery-gate", () => {
  it("skips non-git workspace", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-nogit-"));
    const r = evaluateDeliveryGate(dir);
    expect(r.passed).toBe(true);
    expect(r.skipped).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("fails when no commits ahead of base", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-git-"));
    execSync("git init -b main", { cwd: dir });
    execSync("git config user.email t@test.com", { cwd: dir });
    execSync("git config user.name test", { cwd: dir });
    fs.writeFileSync(path.join(dir, "README.md"), "hi\n");
    execSync("git add README.md && git commit -m init", { cwd: dir, shell: "/bin/bash" });
    const r = evaluateDeliveryGate(dir);
    expect(r.passed).toBe(false);
    expect(r.reason).toMatch(/无新 commit/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("can be disabled via env", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-git2-"));
    expect(deliveryGateEnabled(dir, { TAIYI_DELIVERY_GATE: "0" })).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
