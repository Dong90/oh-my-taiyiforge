import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { estimateTokens } from "../src/core/token/estimate.js";
import { loadTokenBudgetConfig } from "../src/core/token/budget-config.js";
import {
  readTokenUsage,
  recordTokenUsage,
  sumUsageByPhase,
  totalTokenUsage,
} from "../src/core/token/usage-store.js";
import { evaluateTokenBudget } from "../src/core/token/budget-gate.js";
import { compressChangeContext } from "../src/core/token/compress-context.js";
import { scanArtifactTokens } from "../src/core/token/scan-artifacts.js";
import { formatTokenBudgetPlain } from "../src/core/format-token.js";
import { WorkflowEngine } from "../src/core/workflow-engine.js";

describe("token estimate", () => {
  it("estimates ~1 token per 4 chars", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(400))).toBe(100);
    expect(estimateTokens("")).toBe(0);
  });
});

describe("token budget config", () => {
  it("loads defaults with phase limits", () => {
    const cfg = loadTokenBudgetConfig({}, undefined);
    expect(cfg.enabled).toBe(true);
    expect(cfg.globalBudget).toBeGreaterThan(0);
    expect(cfg.phaseLimits.change).toBeGreaterThan(0);
    expect(cfg.enforce).toBe(false);
  });

  it("respects env overrides", () => {
    const cfg = loadTokenBudgetConfig(
      {
        TAIYI_TOKEN_BUDGET: "50000",
        TAIYI_TOKEN_ENFORCE: "1",
        TAIYI_TOKEN_COST_PER_M: "3",
      },
      undefined,
    );
    expect(cfg.globalBudget).toBe(50_000);
    expect(cfg.enforce).toBe(true);
    expect(cfg.costPerMillionTokens).toBe(3);
  });

  it("merges project .taiyi/token-budget.yaml over bundled default", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-tok-yaml-"));
    fs.mkdirSync(path.join(dir, ".taiyi"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".taiyi", "token-budget.yaml"),
      "globalBudget: 120000\nenforce: true\n",
    );
    const cfg = loadTokenBudgetConfig({}, dir);
    expect(cfg.globalBudget).toBe(120_000);
    expect(cfg.enforce).toBe(true);
    expect(cfg.phaseLimits.change).toBeGreaterThan(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("token usage store", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "tok-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("records and aggregates by phase", () => {
    recordTokenUsage(dir, "demo", {
      phase: "change",
      kind: "agent",
      tokens: 1000,
      label: "brainstorm",
    });
    recordTokenUsage(dir, "demo", {
      phase: "change",
      kind: "artifact",
      tokens: 500,
    });
    const usage = readTokenUsage(dir);
    expect(usage?.slug).toBe("demo");
    expect(totalTokenUsage(usage!)).toBe(1500);
    expect(sumUsageByPhase(usage!, "change")).toBe(1500);
  });
});

describe("token budget gate", () => {
  it("passes when under limits", () => {
    const cfg = loadTokenBudgetConfig({}, undefined);
    const r = evaluateTokenBudget(cfg, {
      version: 1,
      slug: "x",
      totalTokens: 1000,
      estimatedCostUsd: 0,
      byPhase: { change: 1000 },
      entries: [],
    });
    expect(r.ok).toBe(true);
  });

  it("blocks when enforce and over global budget", () => {
    const cfg = { ...loadTokenBudgetConfig({}, undefined), globalBudget: 1000, enforce: true };
    const r = evaluateTokenBudget(cfg, {
      version: 1,
      slug: "x",
      totalTokens: 2000,
      estimatedCostUsd: 0,
      byPhase: { change: 2000 },
      entries: [],
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/全局/);
  });

  it("blocks when enforce and over phase limit", () => {
    const cfg = {
      ...loadTokenBudgetConfig({}, undefined),
      enforce: true,
      phaseLimits: { change: 500 },
    };
    const r = evaluateTokenBudget(
      cfg,
      {
        version: 1,
        slug: "x",
        totalTokens: 600,
        estimatedCostUsd: 0,
        byPhase: { change: 600 },
        entries: [],
      },
      "change",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/change/);
  });

  it("warns but passes when over budget without enforce", () => {
    const cfg = { ...loadTokenBudgetConfig({}, undefined), globalBudget: 100, enforce: false };
    const r = evaluateTokenBudget(cfg, {
      version: 1,
      slug: "x",
      totalTokens: 9999,
      estimatedCostUsd: 0,
      byPhase: { change: 9999 },
      entries: [],
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("compress context", () => {
  let changeDir: string;

  beforeEach(() => {
    changeDir = fs.mkdtempSync(path.join(os.tmpdir(), "tok-comp-"));
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\n${"x".repeat(2000)}\n\n## Scope\nshort\n`,
    );
    fs.writeFileSync(
      path.join(changeDir, "REQUIREMENT.md"),
      `# REQ\n\n## User Stories\n${"y".repeat(1500)}\n`,
    );
  });

  afterEach(() => {
    fs.rmSync(changeDir, { recursive: true, force: true });
  });

  it("writes CONTEXT-COMPACT.md smaller than sources", () => {
    const r = compressChangeContext(changeDir, { maxSectionChars: 200 });
    expect(fs.existsSync(r.outputPath)).toBe(true);
    expect(r.outputTokens).toBeLessThan(r.inputTokens);
    expect(r.savedTokens).toBeGreaterThan(0);
  });

  it("records compress usage when slug provided", () => {
    compressChangeContext(changeDir, { maxSectionChars: 200, slug: "demo", record: true });
    const usage = readTokenUsage(changeDir);
    expect(usage?.entries.some((e) => e.kind === "compress")).toBe(true);
  });
});

describe("scan artifacts", () => {
  it("estimates tokens for markdown artifacts", () => {
    const changeDir = fs.mkdtempSync(path.join(os.tmpdir(), "tok-scan-"));
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "a".repeat(400));
    const r = scanArtifactTokens(changeDir);
    expect(r.total).toBe(100);
    expect(r.files.some((f) => f.name === "CHANGE.md")).toBe(true);
    fs.rmSync(changeDir, { recursive: true, force: true });
  });
});

describe("format token budget", () => {
  it("includes usage ratio and cost", () => {
    const cfg = loadTokenBudgetConfig({}, undefined);
    const usage = {
      version: 1 as const,
      slug: "demo",
      totalTokens: 10_000,
      estimatedCostUsd: 0.03,
      byPhase: { change: 10_000 },
      entries: [],
    };
    const evalResult = evaluateTokenBudget(cfg, usage, "change");
    const text = formatTokenBudgetPlain(cfg, usage, evalResult);
    expect(text).toContain("Token");
    expect(text).toContain("10,000");
    expect(text).toContain("change");
  });
});

describe("workflow complete token gate", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "tok-wf-"));
    engine = new WorkflowEngine(root);
    process.env.TAIYI_TOKEN_ENFORCE = "1";
    process.env.TAIYI_TOKEN_BUDGET = "100";
  });

  afterEach(() => {
    delete process.env.TAIYI_TOKEN_ENFORCE;
    delete process.env.TAIYI_TOKEN_BUDGET;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("blocks complete when token budget exceeded", () => {
    engine.initChange("tok1");
    const dir = engine.changeDir("tok1");
    recordTokenUsage(dir, "tok1", { phase: "change", kind: "agent", tokens: 500 });
    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\nok\n\n## Scope\nok\n\n## Success Criteria\n- [x] ok\n`,
    );
    const GATES = {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "test" },
    };
    const r = engine.completePhase("tok1", "change", GATES);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Token budget/i);
  });
});
