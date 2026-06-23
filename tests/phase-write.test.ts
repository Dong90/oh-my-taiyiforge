import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import {
  phaseIdFromSlashVerb,
  runPhaseWriteGuide,
  PHASE_SLASH_VERB,
} from "../src/core/phase-write.js";
import {
  runBugScenario,
  runFeatureScenario,
  runMvpScenario,
  runMicroScenario,
  runNanoScenario,
  runServiceScenario,
  runDesignSystemScenario,
  runCiScenario,
  runRefactorScenario,
  runHotfixScenario,
  runPrototypeScenario,
  runConfigScenario,
  runDocsScenario,
  runDepUpgradeScenario,
  renderScenarioPlaybook,
} from "../src/core/scenario-shortcuts.js";
import { taiyiWrite, taiyiPhaseWrite } from "../src/plugin/handlers.js";

describe("phase-write", () => {
  let workspace: string;
  let taiyiRoot: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-write-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(taiyiRoot);
    engine.initChange("write-demo", { profile: "full" });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("maps slash verbs to phase ids", () => {
    expect(phaseIdFromSlashVerb("change")).toBe("change");
    expect(phaseIdFromSlashVerb("ui-design")).toBe("ui-design");
    expect(PHASE_SLASH_VERB.integration).toBe("integration");
  });

  it("write guide targets current phase", () => {
    const r = runPhaseWriteGuide(engine, workspace, taiyiRoot, "write-demo", "change");
    expect(r.ok).toBe(true);
    expect(r.skill).toBe("taiyi-change");
    expect(r.text).toContain("CHANGE.md");
    expect(r.text).toContain("taiyi-change");
  });

  it("rejects mismatched phase write", () => {
    const r = runPhaseWriteGuide(engine, workspace, taiyiRoot, "write-demo", "dev");
    expect(r.ok).toBe(false);
    expect(r.mismatch).toBe(true);
    expect(r.text).toContain("阶段不一致");
  });

  it("handler write returns current phase skill", () => {
    const r = taiyiWrite(workspace, "write-demo");
    expect(r.ok).toBe(true);
    if ("text" in r && r.text) {
      expect(r.text).toContain("taiyi-change");
    }
  });

  it("handler phase write for change", () => {
    const r = taiyiPhaseWrite(workspace, "change", "write-demo");
    expect(r.ok).toBe(true);
    if ("text" in r && r.text) expect(r.text).toContain("/taiyi:continue");
  });
});

describe("scenario-shortcuts", () => {
  let workspace: string;
  let taiyiRoot: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-scenario-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(taiyiRoot);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("feature with existing slug returns short line", () => {
    engine.initChange("feat-x", { profile: "full" });
    const r = runFeatureScenario(engine, taiyiRoot, "feat-x");
    expect(r.text).toContain("slug=feat-x");
    expect(r.text).toContain("/taiyi:status feat-x");
    expect(r.text).not.toContain("推荐串联");
  });

  it("feature without slug returns full playbook", () => {
    const r = runFeatureScenario(engine, taiyiRoot, "New feature title");
    expect(r.text).toContain("/taiyi:write");
    expect(r.text).toContain("/taiyi:archive");
  });

  it("bug without state returns lite playbook", () => {
    const r = runBugScenario(engine, taiyiRoot, "fix-login");
    expect(r.text).toContain("lite");
    expect(r.text).toContain("无 REVIEW.md / review-loop");
  });
});

describe("renderScenarioPlaybook (unified)", () => {
  let workspace: string;
  let taiyiRoot: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-playbook-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(taiyiRoot);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  // ── Existing slug shortcut (all slug-aware scenarios) ──

  it.each(["feature", "bug", "mvp", "micro", "nano", "service", "design-system", "refactor", "hotfix", "prototype", "config", "docs", "dep-upgrade"] as const)(
    "%s with existing slug returns short line",
    (scenario) => {
      engine.initChange("my-thing", { profile: "full" });
      const r = renderScenarioPlaybook(engine, taiyiRoot, scenario, "my-thing");
      expect(r.ok).toBe(true);
      expect(r.slug).toBe("my-thing");
      expect(r.text).toContain("slug=my-thing");
      expect(r.text).toContain(`scenario=${scenario}`);
      expect(r.text).toContain("/taiyi:status my-thing");
    },
  );

  // ── ci ignores slug and does not short-circuit ──

  it("ci ignores existing slug and returns full playbook", () => {
    engine.initChange("ci-demo", { profile: "full" });
    const r = renderScenarioPlaybook(engine, taiyiRoot, "ci", "ci-demo");
    expect(r.text).not.toMatch(/slug=ci-demo/);
    expect(r.text).toContain("成熟 DevOps");
    expect(r.text).toContain("deliveryGate");
  });

  // ── Each scenario produces its own header / body text ──

  it("feature with slug returns full playbook including body lines", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "feature", "my-feature");
    expect(r.text).toContain("Taiyi 场景 · 做功能");
    expect(r.text).toContain("profile **full**");
    expect(r.text).toContain("推荐串联");
    expect(r.text).toContain("全自动: /taiyi:mode autopilot");
  });

  it("feature without slug and no active change returns ok:false", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "feature");
    expect(r.ok).toBe(false);
    expect(r.text).toContain("无活跃变更");
  });

  it("feature with title generates create hint", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "feature", "用户登录");
    expect(r.text).toContain("创建变更");
    expect(r.text).toContain("用户登录");
    expect(r.text).toContain("--profile full");
  });

  it("bug generates lite-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "bug", "fix-export");
    expect(r.text).toContain("修 Bug");
    expect(r.text).toContain("profile **lite**");
    expect(r.text).toContain("lite 路径");
    expect(r.text).toContain("无 REVIEW.md / review-loop");
  });

  it("mvp generates spike-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "mvp", "mvp-test");
    expect(r.text).toContain("创业 MVP");
    expect(r.text).toContain("profile **spike**");
    expect(r.text).toContain("spike 路径");
    expect(r.text).toContain("CHANGE.md 写清动机");
  });

  it("micro generates micro-specific text with config hint", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "micro", "cli-thing");
    expect(r.text).toContain("个人工具");
    expect(r.text).toContain("profile **micro**");
    expect(r.text).toContain("micro 路径");
    expect(r.text).toContain("deliveryGate");
  });

  it("nano generates nano-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "nano", "hotfix");
    expect(r.text).toContain("极简变更");
    expect(r.text).toContain("profile **nano**");
    expect(r.text).toContain("nano 路径");
    expect(r.text).toContain("直接从 dev 开始");
  });

  it("service generates api-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "service", "api-thing");
    expect(r.text).toContain("后端服务");
    expect(r.text).toContain("profile **api**");
    expect(r.text).toContain("requirement + design + task + dev");
  });

  it("design-system generates ui-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "design-system", "ui-kit");
    expect(r.text).toContain("设计系统");
    expect(r.text).toContain("profile **ui**");
    expect(r.text).toContain("ui-design → /taiyi:restyle");
  });

  it("ci returns devops playbook with config reading", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "ci");
    expect(r.text).toContain("成熟 DevOps");
    expect(r.text).toContain("deliveryGate");
    expect(r.text).toContain("npm run taiyi -- ci verify");
  });

  it("refactor generates lite-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "refactor", "refactor-auth");
    expect(r.text).toContain("代码重构");
    expect(r.text).toContain("profile **lite**");
    expect(r.text).toContain("重构原则");
    expect(r.text).toContain("不改行为");
  });

  it("hotfix generates nano-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "hotfix", "hotfix-payment");
    expect(r.text).toContain("紧急热修复");
    expect(r.text).toContain("profile **nano**");
    expect(r.text).toContain("直接从 dev 开始");
    expect(r.text).toContain("生产热修复");
  });

  it("prototype generates spike-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "prototype", "proto-test");
    expect(r.text).toContain("快速原型");
    expect(r.text).toContain("profile **spike**");
    expect(r.text).toContain("spike 路径");
    expect(r.text).toContain("探索目标");
  });

  it("config generates micro-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "config", "update-env");
    expect(r.text).toContain("配置变更");
    expect(r.text).toContain("profile **micro**");
    expect(r.text).toContain("micro 路径");
    expect(r.text).toContain("只改配置");
  });

  it("docs generates nano-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "docs", "update-readme");
    expect(r.text).toContain("文档更新");
    expect(r.text).toContain("profile **nano**");
    expect(r.text).toContain("直接从 dev 开始");
    expect(r.text).toContain("只改文档不改代码");
  });

  it("dep-upgrade generates micro-specific text", () => {
    const r = renderScenarioPlaybook(engine, taiyiRoot, "dep-upgrade", "bump-deps");
    expect(r.text).toContain("依赖升级");
    expect(r.text).toContain("profile **micro**");
    expect(r.text).toContain("micro 路径");
    expect(r.text).toContain("只升级依赖不改业务");
  });

  // ── Legacy backward-compat: old exports delegate to new function ──

  it("runFeatureScenario produces same text as renderScenarioPlaybook", () => {
    const oldR = runFeatureScenario(engine, taiyiRoot, "用户登录");
    const newR = renderScenarioPlaybook(engine, taiyiRoot, "feature", "用户登录");
    expect(oldR.text).toBe(newR.text);
    expect(oldR.ok).toBe(newR.ok);
    expect(oldR.profile).toBe(newR.profile);
  });

  it("runBugScenario produces same text as renderScenarioPlaybook", () => {
    const oldR = runBugScenario(engine, taiyiRoot, "fix-login");
    const newR = renderScenarioPlaybook(engine, taiyiRoot, "bug", "fix-login");
    expect(oldR.text).toBe(newR.text);
    expect(oldR.ok).toBe(newR.ok);
    expect(oldR.profile).toBe(newR.profile);
  });

  it.each([
    ["mvp", runMvpScenario],
    ["micro", runMicroScenario],
    ["nano", runNanoScenario],
    ["service", runServiceScenario],
    ["design-system", runDesignSystemScenario],
    ["ci", runCiScenario],
    ["refactor", runRefactorScenario],
    ["hotfix", runHotfixScenario],
    ["prototype", runPrototypeScenario],
    ["config", runConfigScenario],
    ["docs", runDocsScenario],
    ["dep-upgrade", runDepUpgradeScenario],
  ])("%s wrapper delegates to renderScenarioPlaybook", (scenario, fn) => {
    const slug = `${scenario}-test`;
    const oldR = fn(engine, taiyiRoot, slug);
    const newR = renderScenarioPlaybook(engine, taiyiRoot, scenario as any, slug);
    expect(oldR.text).toBe(newR.text);
    expect(oldR.ok).toBe(newR.ok);
    expect(oldR.profile).toBe(newR.profile);
  });

  // ── Return shape ──

  it("returns correctly typed ScenarioRunResult for every scenario", () => {
    const scenarios = ["feature", "bug", "mvp", "micro", "nano", "service", "design-system", "ci", "refactor", "hotfix", "prototype", "config", "docs", "dep-upgrade"] as const;
    for (const s of scenarios) {
      const r = renderScenarioPlaybook(engine, taiyiRoot, s);
      expect(r).toHaveProperty("ok");
      expect(r).toHaveProperty("scenario", s);
      expect(r).toHaveProperty("text");
      expect(typeof r.text).toBe("string");
      expect(r.text.length).toBeGreaterThan(0);
    }
  });
});
