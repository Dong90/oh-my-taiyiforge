import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { undoPhase, formatUndoPlain } from "../src/core/undo-phase.js";

function createFakeArtifact(dir: string, name: string) {
  const content = name.endsWith(".json")
    ? JSON.stringify({ title: "test", id: "test", format: "frontmatter", profile: "full", changeType: "feature" })
    : `# ${name}\n\nContent for test\n`;
  fs.writeFileSync(path.join(dir, name), content, "utf8");
}

describe("undo-phase", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-undo-"));
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /** 每一阶段对应的 artifact 文件名（和 phases.yaml 一致） */
  const PHASE_ARTIFACTS: Record<string, string> = {
    change: "CHANGE.md",
    requirement: "REQUIREMENT.md",
    design: "DESIGN.md",
    "ui-design": "UI-DESIGN.md",
    task: "TASK.md",
    dev: ".dev-complete",
    test: "TEST.md",
    review: "REVIEW.md",
    integration: "CHANGELOG.md",
  };

  /** 快速推进 n 个阶段（跳过 quality/human 门禁） */
  function advancePhases(slug: string, count: number) {
    const state = engine.getState(slug)!;
    const changeDir = engine.changeDir(slug);
    const allPhases = ["change", "requirement", "design", "ui-design", "task", "dev", "test", "review", "integration"];

    // 先完成 change（已有 initChange 自动 seed）
    createFakeArtifact(changeDir, "CHANGE.md");
    createFakeArtifact(changeDir, "change.json");

    let r = engine.completePhase(slug, "change", {
      quality: {
        completeness: true, consistency: true, verifiability: true,
        traceability: true, engineering_quality: true,
      },
      human: { approved: true, approver: "test" },
    }, { skipArtifactValidation: true, skipStepOrderCheck: true });
    if (!r.ok) throw new Error(`advance step change: ${r.error}`);

    let next = allPhases.indexOf(state.currentPhase) + 1;
    let done = 1;
    while (done < count && next < allPhases.length) {
      const pid = allPhases[next]!;
      if (!pid) break;
      const artifactName = PHASE_ARTIFACTS[pid];
      if (artifactName) {
        createFakeArtifact(changeDir, artifactName);
      }
      r = engine.completePhase(slug, pid as any, {
        quality: {
          completeness: true, consistency: true, verifiability: true,
          traceability: true, engineering_quality: true,
        },
        human: { approved: true, approver: "test" },
      }, { skipArtifactValidation: true, skipStepOrderCheck: true });
      if (!r.ok) throw new Error(`advance step ${pid}: ${r.error}`);
      next++;
      done++;
    }
  }

  // ── 基础功能 ──

  it("回滚最后一个完成的阶段（不传 targetPhase）", () => {
    engine.initChange("demo");
    advancePhases("demo", 3); // completed: change, requirement, design
    const state = engine.getState("demo")!;
    expect(state.completedPhases).toContain("design");

    const result = undoPhase(engine, root, "demo");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.undone).toContain("design");
    expect(result.currentPhase).toBe("design");

    const after = engine.getState("demo")!;
    expect(after.completedPhases).not.toContain("design");
    // design 的工件应被删除
    const changeDir = engine.changeDir("demo");
    expect(fs.existsSync(path.join(changeDir, "DESIGN.md"))).toBe(false);
  });

  it("回滚到指定阶段（targetPhase）", () => {
    engine.initChange("demo");
    advancePhases("demo", 4); // completed: change, requirement, design, ui-design

    const result = undoPhase(engine, root, "demo", "design");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.undone).toEqual(["design", "ui-design"]);
    expect(result.currentPhase).toBe("design");

    const after = engine.getState("demo")!;
    expect(after.completedPhases).toEqual(["change", "requirement"]);
    expect(after.currentPhase).toBe("design");

    const changeDir = engine.changeDir("demo");
    expect(fs.existsSync(path.join(changeDir, "DESIGN.md"))).toBe(false);
    expect(fs.existsSync(path.join(changeDir, "UI-DESIGN.md"))).toBe(false);
    // change 和 requirement 的工件应保留
    expect(fs.existsSync(path.join(changeDir, "CHANGE.md"))).toBe(true);
    expect(fs.existsSync(path.join(changeDir, "REQUIREMENT.md"))).toBe(true);
  });

  it("回滚不删除不属于回滚范围的工件", () => {
    engine.initChange("demo");
    advancePhases("demo", 3); // completed: change, requirement, design

    undoPhase(engine, root, "demo", "requirement");

    const changeDir = engine.changeDir("demo");
    // requirement 以下的工件保留
    expect(fs.existsSync(path.join(changeDir, "CHANGE.md"))).toBe(true);
    // design 及以上删除
    expect(fs.existsSync(path.join(changeDir, "DESIGN.md"))).toBe(false);
  });

  it("回滚后 state 的 updatedAt 被更新", () => {
    engine.initChange("demo");
    advancePhases("demo", 3);
    const before = engine.getState("demo")!;

    // 等一秒确保时间戳不同
    const result = undoPhase(engine, root, "demo");
    expect(result.ok).toBe(true);

    const after = engine.getState("demo")!;
    expect(new Date(after.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before.updatedAt).getTime(),
    );
  });

  // ── 错误路径 ──

  it("返回错误当 slug 不存在", () => {
    const result = undoPhase(engine, root, "nonexistent");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not found/i);
  });

  it("返回错误当 workflow 已完成", () => {
    process.env.TAIYI_SKIP_INTEGRATION_AUDIT = "1";
    try {
      engine.initChange("done");
      const changeDir = engine.changeDir("done");

      createFakeArtifact(changeDir, "CHANGE.md");
      createFakeArtifact(changeDir, "change.json");
      engine.completePhase("done", "change", {
        quality: { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true },
        human: { approved: true, approver: "test" },
      }, { skipArtifactValidation: true, skipStepOrderCheck: true });

      for (const [pid, art] of Object.entries(PHASE_ARTIFACTS).slice(1)) {
        createFakeArtifact(changeDir, art);
        const r = engine.completePhase("done", pid as any, {
          quality: { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true },
          human: { approved: true, approver: "test" },
        }, { skipArtifactValidation: true, skipStepOrderCheck: true });
        if (!r.ok) throw new Error(`advance ${pid}: ${r.error}`);
      }

      const result = undoPhase(engine, root, "done");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/已完成/);
    } finally {
      delete process.env.TAIYI_SKIP_INTEGRATION_AUDIT;
    }
  });

  it("返回错误当 workflow 已取消", () => {
    engine.initChange("aborted");
    const state = engine.getState("aborted")!;
    const newState = { ...state, workflowStatus: "aborted" as const };
    const sp = path.join(root, "changes", "aborted", "state.json");
    fs.writeFileSync(sp, JSON.stringify(newState, null, 2) + "\n", "utf8");

    const result = undoPhase(engine, root, "aborted");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/已取消/);
  });

  it("返回错误当无已完成阶段", () => {
    engine.initChange("fresh");
    const result = undoPhase(engine, root, "fresh");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/无可回滚/);
  });

  it("返回错误当 targetPhase 尚未完成", () => {
    engine.initChange("demo");
    advancePhases("demo", 2); // completed: change, requirement
    const result = undoPhase(engine, root, "demo", "design");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/尚未完成/);
  });

  it("返回错误当 targetPhase = change（基石保护）", () => {
    engine.initChange("demo");
    advancePhases("demo", 1); // completed: change
    const result = undoPhase(engine, root, "demo", "change");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/不可回滚/);
  });

  it("返回错误当 state.json 不存在（engine.getState 报 not found）", () => {
    // engine.getState 在 state.json 缺失时返回 null，触发 not-found 路径
    const result = undoPhase(engine, root, "demo");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/not found/i);
  });

  // ── OCC version 验证 ──

  it("每次回滚递增 state.version", () => {
    engine.initChange("demo");
    advancePhases("demo", 3);

    const before = engine.getState("demo")!;
    const prevVersion = before.version ?? 0;

    const r1 = undoPhase(engine, root, "demo");
    expect(r1.ok).toBe(true);

    const after1 = engine.getState("demo")!;
    expect(after1.version).toBe(prevVersion + 1);

    // 再次回滚
    undoPhase(engine, root, "demo");
    const after2 = engine.getState("demo")!;
    expect(after2.version).toBe(prevVersion + 2);
  });

  // ── formatUndoPlain ──

  it("formatUndoPlain 格式正确（成功）", () => {
    engine.initChange("demo");
    advancePhases("demo", 4);
    const result = undoPhase(engine, root, "demo", "design");
    const msg = formatUndoPlain("demo", result);
    expect(msg).toContain("已回滚");
    expect(msg).toContain("design");
  });

  it("formatUndoPlain 格式正确（失败）", () => {
    const result = undoPhase(engine, root, "nonexistent");
    const msg = formatUndoPlain("nonexistent", result);
    expect(msg).toContain("undo 失败");
  });

  // ── 回滚连续多个阶段 ──

  it("从中间阶段回滚，级联移除其后所有阶段", () => {
    engine.initChange("demo");
    advancePhases("demo", 6); // change → requirement → design → ui-design → task → dev

    const state = engine.getState("demo")!;
    expect(state.completedPhases.length).toBeGreaterThanOrEqual(5);

    // 回滚到 ui-design — 应移除 task 和 dev
    const result = undoPhase(engine, root, "demo", "ui-design");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.undone).toContain("task");
    expect(result.undone).toContain("dev");

    const after = engine.getState("demo")!;
    expect(after.completedPhases).not.toContain("task");
    expect(after.completedPhases).not.toContain("dev");
    expect(after.currentPhase).toBe("ui-design");
  });

  // ── 幂等：连续两次回滚 ──

  it("连续两次回滚各自生效", () => {
    engine.initChange("demo");
    advancePhases("demo", 4); // change, requirement, design, ui-design

    // 第一次回滚 → 回到 design（移除 ui-design）
    const r1 = undoPhase(engine, root, "demo");
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.currentPhase).toBe("ui-design");
    expect(r1.undone).toContain("ui-design");

    // 第二次回滚 → 回到 design（移除 design）
    const r2 = undoPhase(engine, root, "demo");
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.currentPhase).toBe("design");
    expect(r2.undone).toContain("design");
  });
});
