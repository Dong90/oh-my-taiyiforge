import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { evaluateReviewLoopStatus, scoreThresholds } from "../../src/core/review-gate.js";
import { WorkflowEngine } from "../../src/core/workflow-engine.js";
import { writeE2eArtifacts } from "../../src/core/run-e2e-workflow.js";

/**
 * REVIEW.md with code_quality score table and approve verdict.
 * All scores ≥ 9.5 → should pass score gate.
 */
const HIGH_SCORE_REVIEW = `# REVIEW: High Score

## Summary

All dimensions meet threshold.

## Code Quality

### Dimensions

| 维度 | 评分 | 备注 |
| 功能正确性 | 9.5/10 | 所有测试通过 |
| 架构一致性 | 9.5/10 | 架构设计合理 |
| 可维护性 | 9.5/10 | 代码结构清晰 |
| 文档完整性 | 9.5/10 | 文档齐全 |
| 测试覆盖 | 9.5/10 | 覆盖率达标 |

⭐ **9.5/10**

## Verdict

- [x] **Approve** — 可合并
`;

/**
 * REVIEW.md with code_quality score table below threshold.
 * All scores < 9.5 → should fail score gate.
 */
const LOW_SCORE_REVIEW = `# REVIEW: Low Score

## Summary

Multiple dimensions need improvement.

## Code Quality

### Dimensions

| 维度 | 评分 | 备注 |
| 功能正确性 | 6.0/10 | 有未修复缺陷 |
| 架构一致性 | 5.5/10 | 耦合严重 |
| 可维护性 | 6.0/10 | 硬编码多 |
| 文档完整性 | 4.0/10 | 缺少关键文档 |
| 测试覆盖 | 3.5/10 | 覆盖率低 |

⭐ **5.0/10**

## Verdict

- [x] **Approve** — 可合并
`;

describe("review-gate-scores", () => {
  describe("scoreThresholds()", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      process.env = OLD_ENV;
    });

    it("returns default thresholds of 9.5 for all dimensions", () => {
      const t = scoreThresholds();
      expect(t.minCodeScore).toBe(9.5);
      expect(t.minDocScore).toBe(9.5);
      expect(t.minTestScore).toBe(9.5);
      expect(t.minOverallScore).toBe(9.5);
      expect(t.enforce).toBe(true);
    });

    it("respects env var overrides for thresholds", () => {
      process.env.TAIYI_REVIEW_MIN_CODE_SCORE = "7.0";
      process.env.TAIYI_REVIEW_MIN_DOC_SCORE = "6.5";
      process.env.TAIYI_REVIEW_MIN_TEST_SCORE = "8.0";
      process.env.TAIYI_REVIEW_MIN_OVERALL_SCORE = "7.5";

      const t = scoreThresholds();
      expect(t.minCodeScore).toBe(7.0);
      expect(t.minDocScore).toBe(6.5);
      expect(t.minTestScore).toBe(8.0);
      expect(t.minOverallScore).toBe(7.5);
    });

    it("disables score enforcement when TAIYI_REVIEW_ENFORCE_SCORES=0", () => {
      process.env.TAIYI_REVIEW_ENFORCE_SCORES = "0";
      expect(scoreThresholds().enforce).toBe(false);
    });
  });

  describe("evaluateReviewLoopStatus score gate", () => {
    it("allows stop when all scores ≥ 9.5", () => {
      const status = evaluateReviewLoopStatus(HIGH_SCORE_REVIEW);
      expect(status.canStop).toBe(true);
      expect(status.codeScore).toBeGreaterThanOrEqual(9.5);
      expect(status.docScore).toBeGreaterThanOrEqual(9.5);
      expect(status.testScore).toBeGreaterThanOrEqual(9.5);
      expect(status.overallScore).toBe(9.5);
    });

    it("blocks stop when scores < 9.5", () => {
      const status = evaluateReviewLoopStatus(LOW_SCORE_REVIEW);
      expect(status.canStop).toBe(false);
      expect(status.fixTasks).toBeDefined();
      expect(status.fixTasks!.length).toBeGreaterThan(0);
    });

    it("returns correct individual scores for low-score review", () => {
      const status = evaluateReviewLoopStatus(LOW_SCORE_REVIEW);
      expect(status.codeScore).toBeGreaterThan(0);
      expect(status.codeScore).toBeLessThan(9.5);
      expect(status.docScore).toBeGreaterThan(0);
      expect(status.docScore).toBeLessThan(9.5);
      expect(status.testScore).toBeGreaterThan(0);
      expect(status.testScore).toBeLessThan(9.5);
      expect(status.overallScore).toBe(5.0);
    });
  });

  describe("completePhase score gate (integration)", () => {
    let root: string;
    let engine: WorkflowEngine;

    beforeEach(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sc-"));
      engine = new WorkflowEngine(root);
    });

    afterEach(() => {
      fs.rmSync(root, { recursive: true, force: true });
    });

    it("blocks review phase when scores below threshold", () => {
      const slug = "sc-blocked";
      engine.initChange(slug);
      const changeDir = path.join(root, "changes", slug);
      writeE2eArtifacts(changeDir);

      const gates = {
        quality: {
          completeness: true,
          consistency: true,
          verifiability: true,
          traceability: true,
          engineering_quality: true,
        },
        human: { approved: true, approver: "test@test.com" },
      };

      // Complete all phases up to test
      for (const phase of ["change", "requirement", "design", "ui-design", "task", "dev", "test"] as const) {
        const r = engine.completePhase(slug, phase, gates, {
          allowAutoHuman: true,
          skipStepOrderCheck: true,
          skipArtifactValidation: true,
        });
        expect(r.ok).toBe(true);
      }

      // Write low-score REVIEW.md
      fs.writeFileSync(path.join(changeDir, "REVIEW.md"), LOW_SCORE_REVIEW, "utf8");

      fs.writeFileSync(path.join(changeDir, "health-report.md"), "# Health Report\n\nE2E smoke — no blocking findings.\n", "utf8");
      engine.markAuxiliary(slug, "taiyi-health");

      // Create review-loop-state to trigger score gate (otherwise skipped)
      fs.writeFileSync(
        path.join(changeDir, ".review-loop-state.json"),
        JSON.stringify({ slug, round: 1, updatedAt: new Date().toISOString() }),
        "utf8",
      );

      // Review phase should be blocked by score gate
      const blocked = engine.completePhase(slug, "review", gates, {
        skipStepOrderCheck: true,
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.error).toMatch(/Score Gate|分数/);
    });

    it("passes review phase when scores meet threshold", () => {
      const slug = "sc-pass";
      engine.initChange(slug);
      const changeDir = path.join(root, "changes", slug);
      writeE2eArtifacts(changeDir);

      const gates = {
        quality: {
          completeness: true,
          consistency: true,
          verifiability: true,
          traceability: true,
          engineering_quality: true,
        },
        human: { approved: true, approver: "test@test.com" },
      };

      for (const phase of ["change", "requirement", "design", "ui-design", "task", "dev", "test"] as const) {
        const r = engine.completePhase(slug, phase, gates, {
          allowAutoHuman: true,
          skipStepOrderCheck: true,
          skipArtifactValidation: true,
        });
        expect(r.ok).toBe(true);
      }

      // Write high-score REVIEW.md
      fs.writeFileSync(path.join(changeDir, "REVIEW.md"), HIGH_SCORE_REVIEW, "utf8");

      fs.writeFileSync(path.join(changeDir, "health-report.md"), "# Health Report\n\nE2E smoke — no blocking findings.\n", "utf8");
      engine.markAuxiliary(slug, "taiyi-health");

      // Review phase should pass
      const passed = engine.completePhase(slug, "review", gates, {
        skipStepOrderCheck: true,
      });
      expect(passed.ok).toBe(true);
    });
  });
});
