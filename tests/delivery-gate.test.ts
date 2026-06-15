import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import {
  deliveryGateEnabled,
  evaluateDeliveryGate,
  isChangeScopedDirtyPath,
} from "../src/core/gates/delivery-gate.js";

describe("delivery-gate", () => {
  it("skips non-git workspace", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-nogit-"));
    const r = evaluateDeliveryGate(dir);
    expect(r.passed).toBe(true);
    expect(r.skipped).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("passes for single-commit repo with clean tree", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-git-"));
    execSync("git init -b main", { cwd: dir });
    execSync("git config user.email t@test.com", { cwd: dir });
    execSync("git config user.name test", { cwd: dir });
    fs.writeFileSync(path.join(dir, "README.md"), "hi\n");
    execSync("git add README.md && git commit -m init", { cwd: dir, shell: "/bin/bash" });
    const r = evaluateDeliveryGate(dir);
    expect(r.passed).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("fails when no commits on branch", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-git-empty-"));
    execSync("git init -b main", { cwd: dir });
    execSync("git config user.email t@test.com", { cwd: dir });
    execSync("git config user.name test", { cwd: dir });
    const r = evaluateDeliveryGate(dir);
    expect(r.passed).toBe(false);
    expect(r.reason).toMatch(/无新 commit|无法比较/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("can be disabled via env", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-git2-"));
    expect(deliveryGateEnabled(dir, { TAIYI_DELIVERY_GATE: "0" })).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("fails trailer check when slug given but commits lack Taiyi-Change", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-trailer-gate-"));
    execSync("git init -b main", { cwd: dir });
    execSync("git config user.email t@test.com", { cwd: dir });
    execSync("git config user.name test", { cwd: dir });
    fs.writeFileSync(path.join(dir, "README.md"), "init\n");
    execSync("git add README.md && git commit -m init", { cwd: dir, shell: "/bin/bash" });
    fs.writeFileSync(path.join(dir, "feat.txt"), "x\n");
    execSync("git add feat.txt && git commit -m 'feat: plain'", {
      cwd: dir,
      shell: "/bin/bash",
    });
    const r = evaluateDeliveryGate(dir, { slug: "my-slug", phase: "integration" });
    expect(r.passed).toBe(false);
    expect(r.reason).toMatch(/Taiyi-Change/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("passes trailer check when commit has matching slug", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-trailer-gate-ok-"));
    execSync("git init -b main", { cwd: dir });
    execSync("git config user.email t@test.com", { cwd: dir });
    execSync("git config user.name test", { cwd: dir });
    fs.writeFileSync(path.join(dir, "README.md"), "init\n");
    execSync("git add README.md && git commit -m init", { cwd: dir, shell: "/bin/bash" });
    fs.writeFileSync(path.join(dir, "feat.txt"), "x\n");
    execSync("git add feat.txt", { cwd: dir });
    execSync(
      `git commit -m "$(cat <<'EOF'
feat: ok

Taiyi-Change: my-slug
Taiyi-Phase: dev
EOF
)"`,
      { cwd: dir, shell: "/bin/bash" },
    );
    const r = evaluateDeliveryGate(dir, { slug: "my-slug", phase: "integration" });
    expect(r.passed).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("runs delivery verify from package.json taiyi.deliveryVerifyCmd", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-verify-pkg-"));
    execSync("git init -b main", { cwd: dir });
    execSync("git config user.email t@test.com", { cwd: dir });
    execSync("git config user.name test", { cwd: dir });
    fs.writeFileSync(path.join(dir, "README.md"), "init\n");
    execSync("git add README.md && git commit -m init", { cwd: dir, shell: "/bin/bash" });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ taiyi: { deliveryVerifyCmd: "true" } }),
    );
    fs.writeFileSync(path.join(dir, "feat.txt"), "x\n");
    execSync("git add feat.txt package.json && git commit -m 'feat: ok'", {
      cwd: dir,
      shell: "/bin/bash",
    });
    const r = evaluateDeliveryGate(dir);
    expect(r.passed).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("ignores dirty files from other slugs when slug scoped", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-scope-dirty-"));
    execSync("git init -b main", { cwd: dir });
    execSync("git config user.email t@test.com", { cwd: dir });
    execSync("git config user.name test", { cwd: dir });
    fs.writeFileSync(path.join(dir, "README.md"), "init\n");
    execSync("git add README.md && git commit -m init", { cwd: dir, shell: "/bin/bash" });
    fs.mkdirSync(path.join(dir, ".taiyi", "changes", "other"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".taiyi", "changes", "other", "HANDOFF.md"), "handoff\n");
    fs.mkdirSync(path.join(dir, ".taiyi", "ci-prompts"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".taiyi", "ci-prompts", "other-integration.txt"), "x\n");
    expect(isChangeScopedDirtyPath(".taiyi/changes/other/HANDOFF.md", "mine")).toBe(false);
    const r = evaluateDeliveryGate(dir, { slug: "mine" });
    expect(r.passed).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("fails on dirty files scoped to current slug", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-scope-dirty-fail-"));
    execSync("git init -b main", { cwd: dir });
    execSync("git config user.email t@test.com", { cwd: dir });
    execSync("git config user.name test", { cwd: dir });
    fs.writeFileSync(path.join(dir, "README.md"), "init\n");
    execSync("git add README.md && git commit -m init", { cwd: dir, shell: "/bin/bash" });
    fs.mkdirSync(path.join(dir, ".taiyi", "changes", "mine"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".taiyi", "changes", "mine", "HANDOFF.md"), "dirty\n");
    const r = evaluateDeliveryGate(dir, { slug: "mine" });
    expect(r.passed).toBe(false);
    expect(r.reason).toMatch(/mine/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
