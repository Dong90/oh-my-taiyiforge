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
    expect(commitTrailersEnabled(undefined, { TAIYI_COMMIT_TRAILERS: "0" })).toBe(false);
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

  it("commitTrailersEnabled 显式默认 true(防 config bypass)", () => {
    // 不传 env,默认应 true(不再被 loadProjectConfig bypass)
    expect(commitTrailersEnabled()).toBe(true);
    expect(commitTrailersEnabled("/some/workspace")).toBe(true);
  });

  it("commitTrailersEnabled:TAIYI_COMMIT_TRAILERS=0 → false(保留 env 关闭通道)", () => {
    expect(commitTrailersEnabled(undefined, { TAIYI_COMMIT_TRAILERS: "0" })).toBe(false);
    expect(commitTrailersEnabled(undefined, { TAIYI_COMMIT_TRAILERS: "false" })).toBe(false);
  });

  it("passes when a commit has multiple Taiyi-Change trailers and one matches slug", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-multi-ok-"));
    initGitRepo(dir);
    fs.writeFileSync(path.join(dir, "feat.txt"), "x\n");
    execSync("git add feat.txt", { cwd: dir });
    execSync(
      `git commit -m "$(cat <<'EOF'
feat: multi-slug commit

Taiyi-Change: api-layer
Taiyi-Change: frontend-ui
Taiyi-Phase: dev
EOF
)"`,
      { cwd: dir, shell: "/bin/bash" },
    );
    // 两个 slug 都应该匹配
    expect(evaluateCommitTrailers(dir, "api-layer").passed).toBe(true);
    expect(evaluateCommitTrailers(dir, "frontend-ui").passed).toBe(true);
    // 不在列表的 slug 不应匹配
    expect(evaluateCommitTrailers(dir, "backend-foundation").passed).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("fails when a commit has other Taiyi-Change trailers but not the target slug", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-multi-bad-"));
    initGitRepo(dir);
    fs.writeFileSync(path.join(dir, "feat.txt"), "x\n");
    execSync("git add feat.txt", { cwd: dir });
    execSync(
      `git commit -m "$(cat <<'EOF'
feat: unrelated change

Taiyi-Change: unrelated-feature
EOF
)"`,
      { cwd: dir, shell: "/bin/bash" },
    );
    const r = evaluateCommitTrailers(dir, "ship-it");
    expect(r.passed).toBe(false);
    expect(r.reason).toMatch(/无 Taiyi-Change/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("uses custom slug trailer from delivery.yaml", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-custom-trailer-"));
    fs.mkdirSync(path.join(dir, ".taiyi"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".taiyi", "delivery.yaml"),
      `commit:
  requiredTrailers:
    - key: Jira-Id
      value: "{slug}"
`,
    );
    initGitRepo(dir);
    fs.writeFileSync(path.join(dir, "feat.txt"), "x\n");
    execSync("git add feat.txt", { cwd: dir });
    execSync(
      `git commit -m "$(cat <<'EOF'
feat: ok

Jira-Id: ship-it
EOF
)"`,
      { cwd: dir, shell: "/bin/bash" },
    );
    expect(evaluateCommitTrailers(dir, "ship-it").passed).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("suggestCommitMessage uses delivery.yaml subject template", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-subject-tpl-"));
    fs.mkdirSync(path.join(dir, ".taiyi"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".taiyi", "delivery.yaml"),
      "commit:\n  subjectTemplate: \"[{slug}] {summary}\"\n",
    );
    const msg = suggestCommitMessage("abc", "dev", "feat: hello", dir);
    expect(msg).toContain("[abc] hello");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
