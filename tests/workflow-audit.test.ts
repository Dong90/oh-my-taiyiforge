import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { auditWorkspace } from "../src/core/workflow-audit.js";

describe("workflow-audit", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-audit-ws-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    const changeDir = path.join(taiyiRoot, "changes", "demo");
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, "state.json"),
      JSON.stringify(
        {
          slug: "demo",
          currentPhase: "complete",
          complexity: "medium",
          completedPhases: ["change", "requirement", "design", "ui-design", "task", "dev", "test", "review", "integration"],
          profile: "full",
          skippedPhases: [],
          strictDev: false,
          auxiliaryCompleted: [],
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\nx\n\n## Scope\nin\n\n## Success Criteria\n- [ ] not done\n`,
    );
    fs.writeFileSync(
      path.join(changeDir, "CHANGELOG.md"),
      `# CHANGELOG\n\n## Added\n- feat\n\n## Success Criteria Met\n✅ all good\n`,
    );
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("flags legacy state and CHANGE/CHANGELOG drift", () => {
    const r = auditWorkspace(workspace, taiyiRoot, { slug: "demo" });
    expect(r.ok).toBe(false);
    const codes = r.changes[0]?.findings.map((f) => f.code) ?? [];
    expect(codes).toContain("state.legacy-phase");
    expect(codes).toContain("state.legacy-complexity");
    expect(codes).toContain("ac.change-changelog-drift");
  });
});
