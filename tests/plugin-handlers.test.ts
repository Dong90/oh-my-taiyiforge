import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  taiyiInit,
  taiyiNew,
  taiyiComplete,
  taiyiPhases,
  taiyiStatus,
  taiyiHandoff,
  taiyiCancel,
  taiyiCommitTrailers,
  taiyiDeliveryPlan,
} from "../src/plugin/handlers.js";

describe("plugin-handlers", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-ws-"));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("lists nine phases with taiyi- skill prefix", () => {
    const phases = taiyiPhases();
    expect(phases).toHaveLength(9);
    expect(phases.every((p) => p.skill.startsWith("taiyi-"))).toBe(true);
  });

  it("rejects complete on human phase without approver", () => {
    const init = taiyiInit(workspace, "feat-b", { title: "Feature B" });
    expect(init.ok).toBe(true);
    const changeDir = path.join(workspace, ".taiyi", "changes", "feat-b");
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `# CHANGE: Feature B\n\n## Motivation\nNeed B.\n\n## Scope\n- In: core\n\n## Success Criteria\n- [ ] ok\n`,
    );
    const blocked = taiyiComplete(workspace, "feat-b", "change");
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/approver/);
  });

  it("init seeds templates and complete change phase in project workspace", () => {
    const init = taiyiInit(workspace, "feat-a", "Feature A");
    expect(init.ok).toBe(true);
    expect(init.seeded.length).toBeGreaterThan(0);
    const changeDir = path.join(workspace, ".taiyi", "changes", "feat-a");
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `# CHANGE: Feature A

## Motivation
Need feature A for users.

## Scope
- In: core flow

## Success Criteria
- [ ] Users can use feature A
`,
    );
    fs.writeFileSync(
      path.join(changeDir, "change.json"),
      JSON.stringify({ title: "Feature A", motivation: "test", scope: { includes: ["core flow"] }, success_criteria: [{ id: "SC-01", description: "Users can use feature A" }] }),
    );
    const done = taiyiComplete(workspace, "feat-a", "change", {
      human: { approved: true, approver: "reviewer@example.com" },
    });
    expect(done.ok).toBe(true);
    const status = taiyiStatus(workspace, "feat-a");
    expect(status.ok && status.state?.currentPhase).toBe("requirement");
  });

  it("new creates slug from title like CLI new", () => {
    const r = taiyiNew(workspace, "User Login Feature");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.slug).toBe("user-login-feature");
      expect(fs.existsSync(path.join(workspace, ".taiyi", "changes", "user-login-feature"))).toBe(true);
    }
  });

  it("handoff on completed change is noop exit 0", () => {
    const init = taiyiInit(workspace, "done-h", { title: "Done", profile: "lite" });
    expect(init.ok).toBe(true);
    const changeDir = path.join(workspace, ".taiyi", "changes", "done-h");
    const statePath = path.join(changeDir, "state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
      currentPhase: string;
      completedPhases: string[];
      workflowStatus: string;
    };
    state.currentPhase = "integration";
    state.completedPhases = ["change", "requirement", "dev", "test", "integration"];
    state.workflowStatus = "completed";
    fs.writeFileSync(statePath, JSON.stringify(state));
    const handoff = taiyiHandoff(workspace, "done-h", "should noop");
    expect(handoff.ok).toBe(true);
    if (handoff.ok) {
      expect(handoff.noop).toBe(true);
      expect(handoff.message).toMatch(/无需 handoff/);
    }
  });

  it("cancel on missing slug includes recovery hints", () => {
    const cancel = taiyiCancel(workspace, "misuse-ghost-999", { removeDir: true });
    expect(cancel.ok).toBe(false);
    if (!cancel.ok) {
      expect(cancel.error).toMatch(/init misuse-ghost-999 --force/);
      expect(cancel.error).toMatch(/list --archived/);
    }
  });

  it("writes handoff and cancels active change", () => {
    const init = taiyiInit(workspace, "feat-h", { title: "Handoff test" });
    expect(init.ok).toBe(true);
    const handoff = taiyiHandoff(workspace, "feat-h", "pause for lunch");
    expect(handoff.ok).toBe(true);
    if (handoff.ok) {
      expect(fs.existsSync(handoff.path)).toBe(true);
    }
    const cancel = taiyiCancel(workspace, "feat-h");
    expect(cancel.ok).toBe(true);
    if (cancel.ok) {
      expect(cancel.workflowStatus).toBe("aborted");
    }
  });

  it("suggests commit trailers for active change", () => {
    const init = taiyiInit(workspace, "feat-c", { title: "Commit trailers" });
    expect(init.ok).toBe(true);
    const r = taiyiCommitTrailers(workspace, "feat-c", "feat: my slice");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.suggestion).toContain("Taiyi-Change: feat-c");
      expect(r.suggestion).toContain("Taiyi-Phase:");
    }
  });

  it("delivery-plan returns gh/manual steps for active slug", () => {
    const init = taiyiInit(workspace, "feat-dp", { title: "Delivery plan" });
    expect(init.ok).toBe(true);
    const r = taiyiDeliveryPlan(workspace, "feat-dp");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.slug).toBe("feat-dp");
      expect(r.plan.chain).toContain("ship");
      expect(r.text).toMatch(/Delivery plan — feat-dp/);
      expect(
        r.plan.steps.some((s) => s.id === "ship-push" || s.id === "ship-manual"),
      ).toBe(true);
    }
  });

  it("delivery-plan respects custom delivery.yaml verify step", () => {
    fs.mkdirSync(path.join(workspace, ".taiyi"), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, ".taiyi", "delivery.yaml"),
      "verify:\n  command: npm run verify\n",
    );
    const init = taiyiInit(workspace, "feat-v", { title: "Verify step" });
    expect(init.ok).toBe(true);
    const r = taiyiDeliveryPlan(workspace, "feat-v");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.steps.some((s) => s.id === "verify" && s.command === "npm run verify")).toBe(
        true,
      );
    }
  });
});
