import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { runSemanticVerify, semanticGateEnabled } from "../src/core/gates/semantic-gate.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initGitRepo(dir: string): void {
  execSync("git init -b main", { cwd: dir, stdio: "pipe" });
  execSync("git config user.email t@test.com", { cwd: dir, stdio: "pipe" });
  execSync("git config user.name test", { cwd: dir, stdio: "pipe" });
  fs.writeFileSync(path.join(dir, ".gitkeep"), "");
  execSync("git add .gitkeep && git commit -m init", { cwd: dir, stdio: "pipe" });
}

function makeChangeDir(taiyiRoot: string, slug: string): string {
  const d = path.join(taiyiRoot, "changes", slug);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeState(dir: string, overrides: Record<string, unknown> = {}): void {
  fs.writeFileSync(
    path.join(dir, "state.json"),
    JSON.stringify({
      currentPhase: "integration",
      completedPhases: [],
      skippedPhases: [],
      ...overrides,
    }),
  );
}

// ---------------------------------------------------------------------------
// semanticGateEnabled
// ---------------------------------------------------------------------------

describe("semanticGateEnabled()", () => {
  it("returns true by default (no env)", () => {
    expect(semanticGateEnabled({})).toBe(true);
  });

  it("returns true when env is '1'", () => {
    expect(semanticGateEnabled({ TAIYI_SEMANTIC_GATE: "1" })).toBe(true);
  });

  it("returns true when env is 'true'", () => {
    expect(semanticGateEnabled({ TAIYI_SEMANTIC_GATE: "true" })).toBe(true);
  });

  it("returns false when env is '0'", () => {
    expect(semanticGateEnabled({ TAIYI_SEMANTIC_GATE: "0" })).toBe(false);
  });

  it("returns false when env is 'false'", () => {
    expect(semanticGateEnabled({ TAIYI_SEMANTIC_GATE: "false" })).toBe(false);
  });

  it("returns true for unrecognised values", () => {
    expect(semanticGateEnabled({ TAIYI_SEMANTIC_GATE: "maybe" })).toBe(true);
  });

  it("defaults to true when called with no argument (reads process.env)", () => {
    expect(semanticGateEnabled()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runSemanticVerify — individual check scenarios
// ---------------------------------------------------------------------------

describe("runSemanticVerify() — schema-integrity", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sem-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("passes and skips when no change.json exists", () => {
    const slug = "no-json";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "schema-integrity")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/No change\.json/);
  });

  it("passes with valid change.json", () => {
    const slug = "valid-json";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(path.join(dir, "change.json"), JSON.stringify({ title: "Test change", id: "test-1" }));
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "schema-integrity")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/change\.json is valid/);
  });

  it("fails when change.json has no title or id", () => {
    const slug = "missing-fields";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(path.join(dir, "change.json"), JSON.stringify({ description: "no title or id" }));
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "schema-integrity")!;
    expect(check.passed).toBe(false);
    expect(check.detail).toMatch(/lacks required fields/);
  });

  it("fails when change.json is invalid JSON", () => {
    const slug = "bad-json";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(path.join(dir, "change.json"), "{broken");
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "schema-integrity")!;
    expect(check.passed).toBe(false);
    expect(check.detail).toMatch(/parse error/i);
  });

  it("fails when fileBoundary is not an object", () => {
    const slug = "bad-boundary";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(
      path.join(dir, "change.json"),
      JSON.stringify({ title: "Test", fileBoundary: "not-an-object" }),
    );
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "schema-integrity")!;
    expect(check.passed).toBe(false);
    expect(check.detail).toMatch(/fileBoundary must be an object/);
  });
});

describe("runSemanticVerify() — gate-integrity", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sem-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("fails when no state.json exists", () => {
    const slug = "no-state";
    makeChangeDir(taiyiRoot, slug);
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "gate-integrity")!;
    expect(check.passed).toBe(false);
    expect(check.detail).toMatch(/No state\.json/);
  });

  it("passes (deferred) when not at integration phase", () => {
    const slug = "not-integration";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir, { currentPhase: "dev", completedPhases: ["change", "requirement", "design"] });
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "gate-integrity")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/Not at integration phase/);
  });

  it("passes with valid gate chain at integration phase", () => {
    const slug = "good-chain";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir, {
      currentPhase: "integration",
      completedPhases: ["change", "requirement", "design", "ui-design", "task", "dev", "test", "review"],
    });
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "gate-integrity")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/Gate chain valid/);
  });

  it("fails when phases are completed in reverse order", () => {
    const slug = "reverse-order";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir, {
      currentPhase: "integration",
      completedPhases: ["change", "design", "requirement"],
    });
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "gate-integrity")!;
    expect(check.passed).toBe(false);
    expect(check.detail).toMatch(/before earlier phases/);
  });
});

describe("runSemanticVerify() — export-verify", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sem-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("skips when no change.json", () => {
    const slug = "no-json";
    makeChangeDir(taiyiRoot, slug);
    writeState(makeChangeDir(taiyiRoot, slug));
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "export-verify")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/skipped/);
  });

  it("passes when no exportedSymbols declared", () => {
    const slug = "no-symbols";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(path.join(dir, "change.json"), JSON.stringify({ title: "Test change" }));
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "export-verify")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/No declared exported symbols/);
  });

  it("passes when no git diff to check against", () => {
    const slug = "no-diff";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(
      path.join(dir, "change.json"),
      JSON.stringify({ title: "Test", exportedSymbols: ["runSemanticVerify"] }),
    );
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "export-verify")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/no git diff/);
  });

  it("finds matching exports in changed (unstaged) files in a git repo", () => {
    initGitRepo(workspace);
    const slug = "export-match";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(
      path.join(dir, "change.json"),
      JSON.stringify({ title: "Test", exportedSymbols: ["myExportedFunc"] }),
    );
    // Leave the file uncommitted so `git diff --name-only HEAD` picks it up
    const srcFile = path.join(workspace, "src", "demo.ts");
    fs.mkdirSync(path.dirname(srcFile), { recursive: true });
    fs.writeFileSync(srcFile, "export function myExportedFunc() { return 42; }\n");

    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "export-verify")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/verified in changed files/);
  });
});

describe("runSemanticVerify() — ac-claims", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sem-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("skips when no CHANGE.md exists", () => {
    const slug = "no-changemd";
    makeChangeDir(taiyiRoot, slug);
    writeState(makeChangeDir(taiyiRoot, slug));
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "ac-claims")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/No CHANGE\.md/);
  });

  it("defers for seed templates", () => {
    const slug = "seed";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      "# CHANGE\n\n<!-- taiyi:seed-template -->\n\n- [ ] not checked\n",
    );
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "ac-claims")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/Seed template/);
  });

  it("fails when unchecked boxes remain", () => {
    const slug = "open-acs";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      "# CHANGE\n\n## Success Criteria\n- [x] done\n- [ ] still open\n",
    );
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "ac-claims")!;
    expect(check.passed).toBe(false);
    expect(check.detail).toMatch(/unchecked Success Criteria/);
  });

  it("passes when all boxes checked", () => {
    const slug = "all-done";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      "# CHANGE\n\n## Success Criteria\n- [x] done\n- [x] also done\n",
    );
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "ac-claims")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/All Success Criteria checked/);
  });
});

describe("runSemanticVerify() — dep-topology", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sem-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("passes when change dir has no dependency declarations", () => {
    const slug = "no-deps";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(path.join(dir, "change.json"), JSON.stringify({ title: "Standalone" }));
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "dep-topology")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/no dependency cycles/);
  });

  it("detects circular dependencies", () => {
    const slug = "circ-a";
    const dirA = makeChangeDir(taiyiRoot, "circ-a");
    writeState(dirA);
    fs.writeFileSync(
      path.join(dirA, "change.json"),
      JSON.stringify({ title: "Circ A", dependencies: ["circ-b"] }),
    );
    const dirB = makeChangeDir(taiyiRoot, "circ-b");
    writeState(dirB);
    fs.writeFileSync(
      path.join(dirB, "change.json"),
      JSON.stringify({ title: "Circ B", depends_on: ["circ-a"] }),
    );

    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "dep-topology")!;
    expect(check.passed).toBe(false);
    expect(check.detail).toMatch(/Circular dependency/);
  });

  it("passes with no dependency cycles", () => {
    const slug = "acyclic";
    const dirA = makeChangeDir(taiyiRoot, "acyclic");
    writeState(dirA);
    fs.writeFileSync(
      path.join(dirA, "change.json"),
      JSON.stringify({ title: "Acyclic", dependencies: ["base-lib"] }),
    );
    const dirB = makeChangeDir(taiyiRoot, "base-lib");
    writeState(dirB);
    fs.writeFileSync(path.join(dirB, "change.json"), JSON.stringify({ title: "Base lib" }));

    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "dep-topology")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/no dependency cycles/);
  });

  it("detects circular dependencies in longer chains (3+ nodes)", () => {
    const dirA = makeChangeDir(taiyiRoot, "chain-a");
    const dirB = makeChangeDir(taiyiRoot, "chain-b");
    const dirC = makeChangeDir(taiyiRoot, "chain-c");
    writeState(dirA);
    writeState(dirB);
    writeState(dirC);
    fs.writeFileSync(
      path.join(dirA, "change.json"),
      JSON.stringify({ title: "Chain A", dependencies: ["chain-b"] }),
    );
    fs.writeFileSync(
      path.join(dirB, "change.json"),
      JSON.stringify({ title: "Chain B", dependencies: ["chain-c"] }),
    );
    fs.writeFileSync(
      path.join(dirC, "change.json"),
      JSON.stringify({ title: "Chain C", depends_on: ["chain-a"] }),
    );

    // Any slug triggers the full scan
    const r = runSemanticVerify(workspace, "chain-a");
    const check = r.checks.find((c) => c.code === "dep-topology")!;
    expect(check.passed).toBe(false);
    expect(check.detail).toMatch(/Circular dependency/);
    // Ensure the full path is captured (not just a 2-node fragment)
    expect(check.detail).toMatch(/chain-a.*chain-b.*chain-c/);
  });
});

describe("runSemanticVerify() — commit-semantics", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sem-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("skips when not a git workspace", () => {
    const slug = "no-git";
    makeChangeDir(taiyiRoot, slug);
    writeState(makeChangeDir(taiyiRoot, slug));
    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "commit-semantics")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/Not a git workspace/);
  });

  it("passes when no commits reference the slug", () => {
    initGitRepo(workspace);
    const slug = "unreferenced";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(path.join(workspace, "other.txt"), "hello");
    execSync("git add other.txt && git commit -m unrelated", { cwd: workspace, stdio: "pipe" });

    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "commit-semantics")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/No commits referencing/);
  });

  it("passes when commits have Taiyi-Change trailer", () => {
    initGitRepo(workspace);
    const slug = "with-trailer";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(path.join(workspace, "feat.ts"), "export const x = 1;\n");
    execSync(`git add feat.ts && git commit -m 'feat: add x\n\nTaiyi-Change: ${slug}'`, {
      cwd: workspace,
      stdio: "pipe",
    });

    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "commit-semantics")!;
    expect(check.passed).toBe(true);
    expect(check.detail).toMatch(/commits have Taiyi-Change trailer/);
  });

  it("fails when commits reference slug but lack Taiyi-Change trailer", () => {
    initGitRepo(workspace);
    const slug = "missing-trailer";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(path.join(workspace, "feat.ts"), "export const y = 2;\n");
    execSync(`git add feat.ts && git commit -m 'feat(${slug}): add y'`, {
      cwd: workspace,
      stdio: "pipe",
    });

    const r = runSemanticVerify(workspace, slug);
    const check = r.checks.find((c) => c.code === "commit-semantics")!;
    expect(check.passed).toBe(false);
    expect(check.detail).toMatch(/missing Taiyi-Change trailer/);
  });
});

// ---------------------------------------------------------------------------
// Aggregate behavior
// ---------------------------------------------------------------------------

describe("runSemanticVerify() — aggregate", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sem-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("returns all 6 checks in aggregate result", () => {
    const slug = "all-checks";
    makeChangeDir(taiyiRoot, slug);
    writeState(makeChangeDir(taiyiRoot, slug));
    const r = runSemanticVerify(workspace, slug);
    expect(r.checks).toHaveLength(6);
    expect(r.checks.map((c) => c.code).sort()).toEqual([
      "ac-claims",
      "commit-semantics",
      "dep-topology",
      "export-verify",
      "gate-integrity",
      "schema-integrity",
    ]);
  });

  it("overall passed=false when any check fails", () => {
    const slug = "bad-json";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir);
    fs.writeFileSync(path.join(dir, "change.json"), "not json");
    fs.writeFileSync(path.join(dir, "CHANGE.md"), "- [ ] open\n");
    const r = runSemanticVerify(workspace, slug);
    expect(r.passed).toBe(false);
    expect(r.checks.filter((c) => !c.passed).length).toBeGreaterThan(0);
  });

  it("overall passed=true when all checks pass (valid artifacts, no violations)", () => {
    initGitRepo(workspace);
    const slug = "clean";
    const dir = makeChangeDir(taiyiRoot, slug);
    writeState(dir, { currentPhase: "change", completedPhases: [] });
    fs.writeFileSync(path.join(dir, "change.json"), JSON.stringify({ title: "Clean", id: "clean-1" }));
    fs.writeFileSync(path.join(dir, "CHANGE.md"), "- [x] done\n");
    const r = runSemanticVerify(workspace, slug);
    expect(r.passed).toBe(true);
    expect(r.summary).toMatch(/All 6 semantic checks passed/);
  });
});
