import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { importFromGitBranch } from "../../src/commands/import-tool.js";

let tmpDir: string;
let repoDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "import-tool-"));
  repoDir = path.join(tmpDir, "repo");
  fs.mkdirSync(repoDir, { recursive: true });

  // Initialize a minimal git repo with some commits
  execSync("git init", { cwd: repoDir });
  execSync('git config user.email "test@test.com"', { cwd: repoDir });
  execSync('git config user.name "Test"', { cwd: repoDir });
  execSync("git config init.defaultBranch main", { cwd: repoDir });
  execSync("git commit --allow-empty -m 'initial commit'", { cwd: repoDir });

  // Create a feature branch with commits
  execSync("git checkout -b feature/my-feature", { cwd: repoDir });
  execSync("git commit --allow-empty -m 'feat: add login page'", { cwd: repoDir });
  execSync("git commit --allow-empty -m 'fix: handle empty state'", { cwd: repoDir });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("importFromGitBranch", () => {
  it("creates a change with slug from branch name", async () => {
    const slug = await importFromGitBranch("feature/my-feature", repoDir);
    expect(slug).toBe("feature-my-feature");

    const changeDir = path.join(repoDir, ".taiyi", "changes", slug);
    expect(fs.existsSync(changeDir)).toBe(true);
    expect(fs.existsSync(path.join(changeDir, "CHANGE.md"))).toBe(true);
  });

  it("writes git commits into CHANGE.md scope section", async () => {
    const slug = await importFromGitBranch("feature/my-feature", repoDir);
    const changeMd = path.join(repoDir, ".taiyi", "changes", slug, "CHANGE.md");
    const content = fs.readFileSync(changeMd, "utf8");
    expect(content).toContain("feat: add login page");
    expect(content).toContain("fix: handle empty state");
  });

  it("sanitizes invalid branch names for slug", async () => {
    const slug = await importFromGitBranch("UPPERCASE/BRANCH_NAME!", repoDir);
    expect(slug).toBe("uppercase-branch-name");
  });

  it("accepts custom profile and title override", async () => {
    const slug = await importFromGitBranch("feature/my-feature", repoDir, {
      profile: "api",
      title: "Custom title",
    });
    const changeDir = path.join(repoDir, ".taiyi", "changes", slug);
    expect(fs.existsSync(changeDir)).toBe(true);
  });

  it("returns existing slug on re-import and preserves existing CHANGE.md", async () => {
    const slug1 = await importFromGitBranch("feature/my-feature", repoDir);
    const changeMd = path.join(repoDir, ".taiyi", "changes", slug1, "CHANGE.md");
    const existingContent = fs.readFileSync(changeMd, "utf8");

    // Modify the CHANGE.md to simulate user edits
    fs.writeFileSync(changeMd, existingContent + "\n## User-added section\n");

    const slug2 = await importFromGitBranch("feature/my-feature", repoDir);
    expect(slug2).toBe(slug1);

    // Content after re-import should still contain the user-added section
    const afterContent = fs.readFileSync(changeMd, "utf8");
    expect(afterContent).toContain("User-added section");
  });
});
