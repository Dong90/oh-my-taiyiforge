import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { auditChange } from "../src/core/workflow-audit.js";
import { syncRootChangelog } from "../src/core/sync-root-changelog.js";
import { taiyiArchive } from "../src/plugin/handlers.js";
import { getOpenspecStatus } from "../src/integrations/openspec.js";
import { installProjectWrapper } from "../src/install/sync-project-wrapper.js";
import { resolvePackageRoot } from "../src/core/package-root.js";
import { DEV_COMPLETE_EVIDENCE } from "../src/core/dev-complete.js";

const GATES = {
  quality: {
    completeness: true,
    consistency: true,
    verifiability: true,
    traceability: true,
    engineering_quality: true,
  },
  human: { approved: true, approver: "test" },
} as const;

function initGitRepo(dir: string): void {
  execSync("git init -b main", { cwd: dir });
  execSync("git config user.email t@test.com", { cwd: dir });
  execSync("git config user.name test", { cwd: dir });
  fs.writeFileSync(path.join(dir, "README.md"), "init\n");
  execSync("git add README.md && git commit -m init", { cwd: dir, shell: "/bin/bash" });
}

function advanceLiteToIntegration(engine: WorkflowEngine, slug: string, taiyiRoot: string): void {
  engine.initChange(slug, { profile: "lite" });
  const dir = path.join(taiyiRoot, "changes", slug);

  fs.writeFileSync(
    path.join(dir, "CHANGE.md"),
    `# CHANGE\n\n## Motivation\nFix bug.\n\n## Scope\n- In: x\n\n## Success Criteria\n- [x] fixed\n`,
  );
  fs.writeFileSync(
    path.join(dir, "change.json"),
    JSON.stringify({
      title: "Fix Bug",
      motivation: "Fix bug.",
      scope: { includes: ["x"] },
      success_criteria: [{ id: "SC-01", description: "fixed", is_checked: true }],
    }),
  );
  expect(engine.completePhase(slug, "change", GATES, { skipArtifactValidation: true }).ok).toBe(true);

  fs.writeFileSync(
    path.join(dir, "REQUIREMENT.md"),
    `# REQ\n\n## User Stories\n| ID | As a… | I want… | So that… |\n| US-1 | user | fix | works |\n\n## Acceptance Criteria (Given / When / Then)\n### US-1\n- **Given** broken path\n- **When** user triggers action\n- **Then** completes without error\n\n## Traceability\n| AC | Links to CHANGE.md |\n| US-1 | Success Criteria |\n`,
  );
  expect(engine.completePhase(slug, "requirement", GATES, { skipArtifactValidation: true }).ok).toBe(true);

  fs.writeFileSync(path.join(dir, ".dev-complete"), DEV_COMPLETE_EVIDENCE);
  expect(engine.completePhase(slug, "dev", GATES, { skipArtifactValidation: true }).ok).toBe(true);

  fs.writeFileSync(
    path.join(dir, "TEST.md"),
    `# TEST\n\n## Test Plan\nRun npm test.\n\n## Execution\n| cmd | code |\n|---|---|\n| npm test | 0 |\n`,
  );
  expect(engine.completePhase(slug, "test", GATES, { skipArtifactValidation: true }).ok).toBe(true);

  fs.writeFileSync(
    path.join(dir, "CHANGELOG.md"),
    `# CHANGELOG: ${slug}\n\n## Added\n- Fixed regression in export path (user-visible deliverable).\n\n## Rollback\nRevert commit abc123 if production impact.\n`,
  );
}

describe("integration gates", () => {
  let workspace: string;
  let taiyiRoot: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-integ-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(taiyiRoot);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("pretendIntegrationComplete flags open Success Criteria checkboxes", () => {
    const slug = "open-ac";
    advanceLiteToIntegration(engine, slug, taiyiRoot);
    const dir = path.join(taiyiRoot, "changes", slug);
    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\nFix bug.\n\n## Scope\n- In: x\n\n## Success Criteria\n- [ ] still open\n`,
    );

    const audit = auditChange(workspace, taiyiRoot, slug, { pretendIntegrationComplete: true });
    expect(audit?.ok).toBe(false);
    expect(audit?.findings.some((f) => f.code === "ac.open-before-integration")).toBe(true);

    const blocked = engine.completePhase(slug, "integration", GATES, { skipArtifactValidation: true });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/ac\.open-before-integration|Success Criteria/);
  });

  it("pretendIntegrationComplete flags delivery before complete", () => {
    initGitRepo(workspace);
    const slug = "ship-it";
    advanceLiteToIntegration(engine, slug, taiyiRoot);

    const audit = auditChange(workspace, taiyiRoot, slug, { pretendIntegrationComplete: true });
    expect(audit?.ok).toBe(false);
    expect(audit?.findings.some((f) => f.code === "delivery.not-closed")).toBe(true);

    const blocked = engine.completePhase(slug, "integration", GATES, { skipArtifactValidation: true });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/Integration audit failed|delivery/i);
  });

  it("syncs change CHANGELOG to project root on integration complete", () => {
    const slug = "changelog-sync";
    advanceLiteToIntegration(engine, slug, taiyiRoot);

    const r = engine.completePhase(slug, "integration", GATES, { skipArtifactValidation: true });
    expect(r.ok, r.error).toBe(true);

    const rootLog = path.join(workspace, "CHANGELOG.md");
    expect(fs.existsSync(rootLog)).toBe(true);
    expect(fs.readFileSync(rootLog, "utf8")).toContain("<!-- taiyi:changelog-sync -->");
    expect(syncRootChangelog(workspace, slug).action).toBe("skipped");
  });

  it("archive auto sync-openspec when change dir missing", { timeout: 15_000 }, () => {
    const slug = "auto-sync";
    fs.mkdirSync(path.join(workspace, "openspec"), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, "openspec", "config.yaml"),
      "change_root: openspec/changes\n",
    );

    advanceLiteToIntegration(engine, slug, taiyiRoot);
    expect(engine.completePhase(slug, "integration", GATES, { skipArtifactValidation: true }).ok).toBe(true);

    expect(getOpenspecStatus(workspace, slug).changeExists).toBe(false);

    const archived = taiyiArchive(workspace, slug);
    expect(archived.ok).toBe(true);
    expect("openspec" in archived && archived.openspec?.changeExists).toBe(true);
  });

  it("installs project wrapper into consumer scripts/", () => {
    const pkgRoot = resolvePackageRoot(
      new URL("../src/install/sync-project-wrapper.ts", import.meta.url).href,
    );
    const consumer = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-consumer-"));
    fs.writeFileSync(path.join(consumer, "package.json"), "{}\n");
    const r = installProjectWrapper(consumer, pkgRoot);
    expect(r.action).toBe("updated");
    expect(fs.existsSync(path.join(consumer, "scripts", "taiyi-forge.sh"))).toBe(true);
    fs.rmSync(consumer, { recursive: true, force: true });
  });
});
