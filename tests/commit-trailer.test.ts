import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import {
  commitTrailersEnabled,
  evaluateCommitTrailers,
  suggestCommitMessage,
} from "../src/core/gates/commit-trailer.js";

function initGitRepo(dir: string): void {
  execSync("git init -b main", { cwd: dir });
  execSync("git config user.email t@test.com", { cwd: dir });
  execSync("git config user.name test", { cwd: dir });
  fs.writeFileSync(path.join(dir, "README.md"), "init\n");
  execSync("git add README.md && git commit -m init", { cwd: dir, shell: "/bin/bash" });
}

describe("commit-trailer", () => {
  it("suggestCommitMessage includes trailers", () => {
    const msg = suggestCommitMessage("my-slug", "dev", "feat: slice");
    expect(msg).toContain("Taiyi-Change: my-slug");
    expect(msg).toContain("Taiyi-Phase: dev");
  });

  it("skips when disabled or non-git", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-trailer-"));
    expect(evaluateCommitTrailers(dir, "x").skipped).toBe(true);
    expect(commitTrailersEnabled({ TAIYI_COMMIT_TRAILERS: "0" })).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("passes when a commit has matching Taiyi-Change trailer", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-trailer-ok-"));
    initGitRepo(dir);
    fs.writeFileSync(path.join(dir, "feat.txt"), "x\n");
    execSync("git add feat.txt", { cwd: dir });
    execSync(
      `git commit -m "$(cat <<'EOF'
feat: deliver slice

Taiyi-Change: ship-it
Taiyi-Phase: dev
EOF
)"`,
      { cwd: dir, shell: "/bin/bash" },
    );
    const r = evaluateCommitTrailers(dir, "ship-it");
    expect(r.passed).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("fails when commits ahead lack matching trailer", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-trailer-bad-"));
    initGitRepo(dir);
    fs.writeFileSync(path.join(dir, "feat.txt"), "x\n");
    execSync("git add feat.txt && git commit -m 'feat: no trailer'", {
      cwd: dir,
      shell: "/bin/bash",
    });
    const r = evaluateCommitTrailers(dir, "ship-it");
    expect(r.passed).toBe(false);
    expect(r.reason).toMatch(/Taiyi-Change/);
    expect(r.suggestion).toContain("Taiyi-Change: ship-it");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
