import { describe, it, expect, beforeEach } from "vitest";
import {
  listPhases,
  tryGetPhase,
  registerCustomPhase,
  registerCustomPhases,
  loadCustomPhasesFromConfig,
  resetPhases,
} from "../../src/core/phase-registry.js";

describe("PhaseId extensibility", () => {
  beforeEach(() => {
    resetPhases();
  });

  it("registerCustomPhase adds a new phase to the registry", () => {
    registerCustomPhase({
      id: "deploy",
      order: 10,
      skill: "taiyi-deploy",
      artifact: "DEPLOY.md",
      kind: "markdown",
      requires: ["integration"],
    });
    const phase = tryGetPhase("deploy");
    expect(phase).not.toBeNull();
    expect(phase!.id).toBe("deploy");
  });

  it("registerCustomPhase updates an existing phase in place", () => {
    const original = tryGetPhase("dev");
    expect(original).not.toBeNull();
    registerCustomPhase({
      id: "dev",
      order: 6,
      skill: "taiyi-dev-custom",
      artifact: "DEV.md",
      kind: "markdown",
      requires: ["task"],
    });
    const updated = tryGetPhase("dev");
    expect(updated!.skill).toBe("taiyi-dev-custom");
    expect(updated!.artifact).toBe("DEV.md");
  });

  it("registerCustomPhases registers multiple phases", () => {
    registerCustomPhases([
      {
        id: "audit",
        order: 11,
        skill: "taiyi-audit",
        artifact: "AUDIT.md",
        kind: "markdown",
        requires: ["integration"],
      },
      {
        id: "rollback",
        order: 12,
        skill: "taiyi-rollback",
        artifact: "ROLLBACK.md",
        kind: "markdown",
        requires: ["audit"],
      },
    ]);
    expect(tryGetPhase("audit")).not.toBeNull();
    expect(tryGetPhase("rollback")).not.toBeNull();
  });

  it("loadCustomPhasesFromConfig processes an array of custom phases", () => {
    const result = loadCustomPhasesFromConfig([
      {
        id: "security-review",
        order: 8,
        skill: "taiyi-security",
        artifact: "SECURITY.md",
        kind: "markdown",
        requires: ["dev"],
      },
    ]);
    expect(result.registered).toBe(1);
    expect(tryGetPhase("security-review")).not.toBeNull();
  });

  it("loadCustomPhasesFromConfig handles empty/undefined config", () => {
    expect(loadCustomPhasesFromConfig(undefined).registered).toBe(0);
    expect(loadCustomPhasesFromConfig([]).registered).toBe(0);
  });

  it("resetPhases restores built-in phases", () => {
    registerCustomPhase({
      id: "custom-phase",
      order: 99,
      skill: "taiyi-custom",
      artifact: "CUSTOM.md",
      kind: "markdown",
      requires: [],
    });
    expect(tryGetPhase("custom-phase")).not.toBeNull();
    resetPhases();
    expect(tryGetPhase("custom-phase")).toBeNull();
  });

  it("custom phases are included in listPhases", () => {
    registerCustomPhase({
      id: "post-review",
      order: 10,
      skill: "taiyi-post-review",
      artifact: "POST_REVIEW.md",
      kind: "markdown",
      requires: ["review"],
    });
    const all = listPhases();
    expect(all.some((p) => p.id === "post-review")).toBe(true);
  });
});
