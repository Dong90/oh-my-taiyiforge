import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { rejectAutomatedHumanApproval } from "../src/core/gates/human-gate-config.js";
import { writeE2eArtifacts } from "../src/core/run-e2e-workflow.js";

describe("automated human gate", () => {
  it("rejects loop auto approver on change phase", () => {
    const result = rejectAutomatedHumanApproval("change", {
      approved: true,
      approver: "loop-auto",
    });
    expect(result.ok).toBe(false);
  });

  it("allows explicit human approver", () => {
    const result = rejectAutomatedHumanApproval("change", {
      approved: true,
      approver: "lead@example.com",
    });
    expect(result.ok).toBe(true);
  });

  it("engine blocks cli-operator on review without allowAutoHuman", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-hg-"));
    const engine = new WorkflowEngine(root);
    engine.initChange("demo");
    const changeDir = path.join(root, "changes", "demo");
    writeE2eArtifacts(changeDir);

    const gates = {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "cli-operator" },
    };

    for (const phase of ["change", "requirement", "design", "ui-design", "task", "dev", "test"] as const) {
      const r = engine.completePhase("demo", phase, gates, { allowAutoHuman: true, skipStepOrderCheck: true });
      expect(r.ok, `${phase}: ${r.error}`).toBe(true);
    }

    fs.writeFileSync(
      path.join(changeDir, "health-report.md"),
      "# Health\n\nok for human gate test\n",
      "utf8",
    );
    engine.markAuxiliary("demo", "taiyi-health");

    const blocked = engine.completePhase("demo", "review", gates, { skipStepOrderCheck: true });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/Human gate required/);

    fs.rmSync(root, { recursive: true, force: true });
  });
});
