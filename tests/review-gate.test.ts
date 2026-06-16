import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  evaluateMachineReview,
  evaluateReviewLoopStatus,
  findOpenHighFindings,
  parseReviewVerdict,
} from "../src/core/review-gate.js";
import { validateArtifactContent } from "../src/core/artifact-validator.js";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { runReviewMachineCheck } from "../src/core/review-loop-runner.js";
import { writeE2eArtifacts } from "../src/core/run-e2e-workflow.js";

const APPROVE_REVIEW = `# REVIEW: Demo

## Summary
Smoke review.

## Findings
| Severity | File | Issue | Suggestion |
| high | src/x.ts | fixed | done ✅ |

## Verdict
- [x] **Approve** — 可合并
`;

const REQUEST_REVIEW = `# REVIEW: Demo

## Summary
Needs work.

## Findings
| Severity | File | Issue | Suggestion |
| high | src/x.ts | no timeout | add deadline |

## Verdict
- [x] **Request changes** — 阻塞项：F1
`;

describe("review-gate", () => {
  it("parses approve verdict", () => {
    expect(parseReviewVerdict(APPROVE_REVIEW)).toBe("approve");
    expect(parseReviewVerdict(REQUEST_REVIEW)).toBe("request_changes");
  });

  it("detects open high findings", () => {
    expect(findOpenHighFindings(APPROVE_REVIEW)).toHaveLength(0);
    expect(findOpenHighFindings(REQUEST_REVIEW)).toHaveLength(1);
  });

  it("evaluateMachineReview passes only on approve without open high", () => {
    expect(evaluateMachineReview(APPROVE_REVIEW).passed).toBe(true);
    expect(evaluateMachineReview(REQUEST_REVIEW).passed).toBe(false);
  });

  it("review-loop stops on no blocking items (not checkbox machine gate)", () => {
    expect(evaluateReviewLoopStatus(REQUEST_REVIEW).canStop).toBe(false);
    expect(evaluateReviewLoopStatus(APPROVE_REVIEW).canStop).toBe(true);
    const noHighApprove = `# REVIEW
## Findings
| high | a.ts | fixed | ok ✅ |
## Verdict
- [ ] **Approve**
`;
    expect(evaluateReviewLoopStatus(noHighApprove).canStop).toBe(true);
  });

  it("blocks complete review when machine gate fails", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rg-"));
    const engine = new WorkflowEngine(root);
    engine.initChange("rg1");
    const changeDir = path.join(root, "changes", "rg1");
    writeE2eArtifacts(changeDir);
    fs.writeFileSync(path.join(changeDir, "REVIEW.md"), REQUEST_REVIEW, "utf8");

    const gates = {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "reviewer@test.com" },
    };

    for (const phase of [
      "change",
      "requirement",
      "design",
      "ui-design",
      "task",
      "dev",
      "test",
    ] as const) {
      expect(engine.completePhase("rg1", phase, gates, { allowAutoHuman: true, skipStepOrderCheck: true, skipArtifactValidation: true }).ok).toBe(true);
    }

    const blocked = engine.completePhase("rg1", "review", gates, { skipStepOrderCheck: true });
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/Quality gate failed|Verdict|high/i);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("review-loop bumps round on failure", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rl-"));
    const engine = new WorkflowEngine(root);
    engine.initChange("rl1");
    const changeDir = path.join(root, "changes", "rl1");
    writeE2eArtifacts(changeDir);
    fs.writeFileSync(path.join(changeDir, "REVIEW.md"), REQUEST_REVIEW, "utf8");

    const gates = {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "reviewer@test.com" },
    };
    for (const phase of [
      "change",
      "requirement",
      "design",
      "ui-design",
      "task",
      "dev",
      "test",
    ] as const) {
      engine.completePhase("rl1", phase, gates, { allowAutoHuman: true });
    }

    const r1 = runReviewMachineCheck(engine, "rl1", { bumpRound: false });
    expect(r1.ok).toBe(false);

    const r2 = runReviewMachineCheck(engine, "rl1", { bumpRound: false });
    expect(r2.ok).toBe(false);

    fs.writeFileSync(path.join(changeDir, "REVIEW.md"), APPROVE_REVIEW, "utf8");
    const r3 = runReviewMachineCheck(engine, "rl1", { bumpRound: false });
    expect(r3.ok).toBe(true);

    const validator = validateArtifactContent("review", APPROVE_REVIEW);
    expect(validator.scores.verifiability).toBe(true);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("rejects unchecked Verdict template (no false approve)", () => {
    const template = `# REVIEW: Demo

## Verdict
- [ ] **Approve** — 可合并
- [ ] **Request changes**
`;
    expect(evaluateMachineReview(template).passed).toBe(false);
    expect(parseReviewVerdict(template)).toBe("ambiguous");
  });

  it("review-loop works before review phase (change)", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rl-early-"));
    const engine = new WorkflowEngine(root);
    engine.initChange("early1");
    const changeDir = path.join(root, "changes", "early1");
    fs.writeFileSync(path.join(changeDir, "REVIEW.md"), REQUEST_REVIEW, "utf8");

    expect(engine.getState("early1")?.currentPhase).toBe("change");

    const r = runReviewMachineCheck(engine, "early1", { bumpRound: false });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/工作流阶段: change/);
    expect(r.text).not.toMatch(/仅在 review 阶段使用/);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("review-loop requires fresh review before loop check", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rl-fresh-"));
    const engine = new WorkflowEngine(root);
    engine.initChange("fresh1");
    const changeDir = path.join(root, "changes", "fresh1");
    fs.writeFileSync(path.join(changeDir, "REVIEW.md"), APPROVE_REVIEW, "utf8");

    const r = runReviewMachineCheck(engine, "fresh1", { bumpRound: true, workspaceDir: root });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/新一轮 code review|不可直接复用旧审查/);
    expect(r.text).toMatch(/review-check/);

    fs.rmSync(root, { recursive: true, force: true });
  });
});
