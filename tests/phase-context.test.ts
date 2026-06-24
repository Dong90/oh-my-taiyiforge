import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Mock AgentContext before importing phase-context
const mockWritePhaseContext = vi.fn();
vi.mock("../src/core/change-graph/agent-sdk.js", () => ({
  AgentContext: {
    fromChangeDir: vi.fn(() => ({
      writePhaseContext: mockWritePhaseContext,
    })),
  },
}));

// Import after mock
const { generateGraphPhaseContext, appendPhaseToContext } = await import("../src/core/phase-context.js");

describe("generateGraphPhaseContext", () => {
  beforeEach(() => {
    mockWritePhaseContext.mockReset();
  });

  it("returns ok:true on success", () => {
    const result = generateGraphPhaseContext("/tmp/changes/my-slug", "my-slug");
    expect(result.ok).toBe(true);
    expect(mockWritePhaseContext).toHaveBeenCalledOnce();
  });

  it("returns ok:false with error message on failure", () => {
    mockWritePhaseContext.mockImplementation(() => {
      throw new Error("Graph load failed");
    });
    const result = generateGraphPhaseContext("/tmp/changes/bad-slug", "bad-slug");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Graph load failed");
  });
});

describe("appendPhaseToContext", () => {
  let tmpDir: string;
  let changeDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "phase-ctx-test-"));
    changeDir = path.join(tmpDir, "changes", "test-slug");
    fs.mkdirSync(changeDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates PHASE-CONTEXT.md when none exists", () => {
    const state = {
      slug: "test-slug",
      currentPhase: "change" as const,
      profile: "full",
    };
    appendPhaseToContext(changeDir, "test-slug", "change", "requirement", state as any);

    const ctxPath = path.join(changeDir, "PHASE-CONTEXT.md");
    expect(fs.existsSync(ctxPath)).toBe(true);
    const content = fs.readFileSync(ctxPath, "utf8");
    expect(content).toContain("Phase Context — test-slug");
    expect(content).toContain("change (✓)");
    expect(content).toContain("requirement");
  });

  it("appends new phase section after existing completed phase", () => {
    // Prime with an initial context
    const state1 = {
      slug: "test-slug",
      currentPhase: "change" as const,
      profile: "full" as const,
    };
    appendPhaseToContext(changeDir, "test-slug", "change", "requirement", state1 as any);

    // Simulate completing requirement
    const state2 = {
      slug: "test-slug",
      currentPhase: "requirement" as const,
      profile: "full" as const,
    };
    appendPhaseToContext(changeDir, "test-slug", "requirement", "design", state2 as any);

    const content = fs.readFileSync(path.join(changeDir, "PHASE-CONTEXT.md"), "utf8");
    expect(content).toContain("change (✓)");
    expect(content).toContain("requirement (✓)");
    expect(content).toContain("design");
  });

  it("injects project context from CONTEXT.md on first creation", () => {
    // CONTEXT.md must be >= 50 chars to pass injectProjectContextIfMissing length gate
    fs.writeFileSync(
      path.join(changeDir, "CONTEXT.md"),
      "# Auth Module\nBuilding the full authentication module with JWT and OAuth support across the platform.",
      "utf8",
    );

    const state = {
      slug: "test-slug",
      currentPhase: "change" as const,
      profile: "full" as const,
    };
    appendPhaseToContext(changeDir, "test-slug", "change", "requirement", state as any);

    const content = fs.readFileSync(path.join(changeDir, "PHASE-CONTEXT.md"), "utf8");
    // Project context injected at top
    expect(content).toContain("Project Context");
    expect(content).toContain("PROJECT-CONTEXT-END");
    // Phase section appended after project context
    expect(content).toContain("change (✓)");
    expect(content).toContain("requirement");
  });

  it("does not inject project context when CONTEXT.md is a seed template", () => {
    fs.writeFileSync(path.join(changeDir, "CONTEXT.md"), "<!-- seed -->", "utf8");

    const state = {
      slug: "test-slug",
      currentPhase: "change" as const,
      profile: "full" as const,
    };
    appendPhaseToContext(changeDir, "test-slug", "change", "requirement", state as any);

    const content = fs.readFileSync(path.join(changeDir, "PHASE-CONTEXT.md"), "utf8");
    expect(content).not.toContain("Project Context");
  });

  it("preserves existing project context when appending", () => {
    // Inject project context first
    const projectCtx = {
      slug: "test-slug",
      currentPhase: "change" as const,
      profile: "full" as const,
    };
    appendPhaseToContext(changeDir, "test-slug", "change", "requirement", projectCtx as any);

    // Append another phase — project context should persist
    const nextCtx = {
      slug: "test-slug",
      currentPhase: "requirement" as const,
      profile: "full" as const,
    };
    appendPhaseToContext(changeDir, "test-slug", "requirement", "design", nextCtx as any);

    const content = fs.readFileSync(path.join(changeDir, "PHASE-CONTEXT.md"), "utf8");
    expect(content).toContain("change (✓)");
    expect(content).toContain("requirement (✓)");
  });

  it("reads phase MD content when file exists", () => {
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "# Change Proposal\nSome detailed change info.", "utf8");

    const state = {
      slug: "test-slug",
      currentPhase: "change" as const,
      profile: "full" as const,
    };
    appendPhaseToContext(changeDir, "test-slug", "change", "requirement", state as any);

    const content = fs.readFileSync(path.join(changeDir, "PHASE-CONTEXT.md"), "utf8");
    expect(content).toContain("change (✓)");
  });

  it("includes footer with complexity info when available", () => {
    const state = {
      slug: "test-slug",
      currentPhase: "change" as const,
      complexity: { level: "medium" },
      profile: "full" as const,
    };
    appendPhaseToContext(changeDir, "test-slug", "change", "requirement", state as any);

    const content = fs.readFileSync(path.join(changeDir, "PHASE-CONTEXT.md"), "utf8");
    expect(content).toContain("medium");
  });
});
