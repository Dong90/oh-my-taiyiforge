import { describe, expect, it } from "vitest";
import {
  allowAutoHumanEnv,
  isAutoApprover,
  parseHumanGatePhases,
  rejectAutomatedHumanApproval,
  requiresHumanGate,
  resolveHumanForComplete,
} from "../src/core/gates/human-gate-config.js";

describe("requiresHumanGate", () => {
  it("returns true for change, design, review by default", () => {
    expect(requiresHumanGate("change")).toBe(true);
    expect(requiresHumanGate("design")).toBe(true);
    expect(requiresHumanGate("review")).toBe(true);
  });

  it("returns false for other phases by default", () => {
    expect(requiresHumanGate("requirement")).toBe(false);
    expect(requiresHumanGate("dev")).toBe(false);
    expect(requiresHumanGate("test")).toBe(false);
    expect(requiresHumanGate("integration")).toBe(false);
  });

  it("reads custom phases from TAIYI_HUMAN_GATE_PHASES env", () => {
    const env = { TAIYI_HUMAN_GATE_PHASES: "dev,integration" };
    expect(requiresHumanGate("change", env)).toBe(false);
    expect(requiresHumanGate("dev", env)).toBe(true);
    expect(requiresHumanGate("integration", env)).toBe(true);
  });

  it("ignores invalid phase names in env", () => {
    const env = { TAIYI_HUMAN_GATE_PHASES: "change,invalid-phase,dev" };
    expect(requiresHumanGate("change", env)).toBe(true);
    expect(requiresHumanGate("dev", env)).toBe(true);
  });
});

describe("parseHumanGatePhases", () => {
  it("returns defaults when env not set", () => {
    expect(parseHumanGatePhases({})).toEqual(["change", "design", "review"]);
  });

  it("parses comma-separated phase IDs", () => {
    const env = { TAIYI_HUMAN_GATE_PHASES: "dev,test,integration" };
    expect(parseHumanGatePhases(env)).toEqual(["dev", "test", "integration"]);
  });

  it("filters invalid values and falls back to defaults when none valid", () => {
    const env = { TAIYI_HUMAN_GATE_PHASES: "foo,bar" };
    expect(parseHumanGatePhases(env)).toEqual(["change", "design", "review"]);
  });
});

describe("isAutoApprover", () => {
  it("returns true for known auto approvers", () => {
    expect(isAutoApprover("loop-operator")).toBe(true);
    expect(isAutoApprover("loop-auto")).toBe(true);
    expect(isAutoApprover("cli-operator")).toBe(true);
    expect(isAutoApprover("cli-auto")).toBe(true);
    expect(isAutoApprover("opencode-agent")).toBe(true);
    expect(isAutoApprover("e2e-runner")).toBe(true);
  });

  it("trims whitespace before matching", () => {
    expect(isAutoApprover("  loop-auto  ")).toBe(true);
  });

  it("returns false for human names", () => {
    expect(isAutoApprover("lead@example.com")).toBe(false);
    expect(isAutoApprover("shixiaocai")).toBe(false);
  });
});

describe("allowAutoHumanEnv", () => {
  it("returns true when TAIYI_AUTO_HUMAN=1", () => {
    const env = { TAIYI_AUTO_HUMAN: "1" };
    expect(allowAutoHumanEnv(env)).toBe(true);
  });

  it("returns true when TAIYI_AUTO_HUMAN=true", () => {
    const env = { TAIYI_AUTO_HUMAN: "true" };
    expect(allowAutoHumanEnv(env)).toBe(true);
  });

  it("returns false when TAIYI_AUTO_HUMAN=0", () => {
    const env = { TAIYI_AUTO_HUMAN: "0" };
    expect(allowAutoHumanEnv(env)).toBe(false);
  });

  it("returns false when env not set", () => {
    expect(allowAutoHumanEnv({})).toBe(false);
  });
});

describe("rejectAutomatedHumanApproval", () => {
  it("allows when allowAutoHuman is true", () => {
    const result = rejectAutomatedHumanApproval("change",
      { approved: true, approver: "loop-auto" },
      true,
    );
    expect(result).toEqual({ ok: true });
  });

  it("allows when phase does not require human gate", () => {
    const result = rejectAutomatedHumanApproval("dev",
      { approved: true, approver: "loop-auto" },
    );
    expect(result).toEqual({ ok: true });
  });

  it("allows when approver is not an auto approver", () => {
    const result = rejectAutomatedHumanApproval("change",
      { approved: true, approver: "lead@example.com" },
    );
    expect(result).toEqual({ ok: true });
  });

  it("rejects auto approver on human-gated phase", () => {
    const result = rejectAutomatedHumanApproval("change",
      { approved: true, approver: "loop-auto" },
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Human gate required/);
  });
});

describe("resolveHumanForComplete", () => {
  it("succeeds with explicit human approver for gated phase", () => {
    const result = resolveHumanForComplete("change", "lead@example.com");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.human.approver).toBe("lead@example.com");
      expect(result.human.approved).toBe(true);
    }
  });

  it("fails when gated phase has no approver and auto human is off", () => {
    const env = { TAIYI_AUTO_HUMAN: "0" };
    const result = resolveHumanForComplete("change", undefined, env);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/approver/);
    }
  });

  it("fails when auto approver used on gated phase without allow", () => {
    const env = { TAIYI_AUTO_HUMAN: "0" };
    const result = resolveHumanForComplete("change", "opencode-agent", env);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not allowed/);
    }
  });

  it("uses opencode-agent for non-gated phase when no approver given", () => {
    const result = resolveHumanForComplete("dev");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.human.approver).toBe("opencode-agent");
    }
  });

  it("allows auto human when TAIYI_AUTO_HUMAN is set", () => {
    const env = { TAIYI_AUTO_HUMAN: "1" };
    const result = resolveHumanForComplete("change", undefined, env);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.allowAutoHuman).toBe(true);
    }
  });
});
