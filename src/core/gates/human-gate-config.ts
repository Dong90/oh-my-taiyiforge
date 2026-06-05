import type { HumanApproval, PhaseId } from "../types.js";

export function allowAutoHumanEnv(env = process.env): boolean {
  return env.TAIYI_AUTO_HUMAN === "1" || env.TAIYI_AUTO_HUMAN === "true";
}

/** Shared human-gate resolution for CLI complete and plugin taiyi_complete. */
export function resolveHumanForComplete(
  phaseId: PhaseId,
  requestedApprover: string | undefined,
  env = process.env,
):
  | { ok: true; human: HumanApproval; allowAutoHuman?: boolean }
  | { ok: false; error: string } {
  const needsHuman = requiresHumanGate(phaseId, env);
  const allowAutoHuman = allowAutoHumanEnv(env);
  const approver = requestedApprover?.trim();

  if (needsHuman && !approver && !allowAutoHuman) {
    return {
      ok: false,
      error: `Human gate required for phase ${phaseId}: provide gates.human.approver`,
    };
  }
  if (needsHuman && approver && isAutoApprover(approver) && !allowAutoHuman) {
    return {
      ok: false,
      error: `Human gate required for phase ${phaseId}: automated approver ${approver} not allowed`,
    };
  }

  const humanApprover = needsHuman
    ? (approver ?? (allowAutoHuman ? "cli-operator" : ""))
    : (approver ?? "opencode-agent");

  if (needsHuman && !humanApprover) {
    return { ok: false, error: `Human gate required for phase ${phaseId}` };
  }

  return {
    ok: true,
    human: { approved: true, approver: humanApprover },
    allowAutoHuman: needsHuman && !approver && allowAutoHuman ? true : undefined,
  };
}

export const DEFAULT_HUMAN_GATE_PHASES: PhaseId[] = ["change", "design", "review"];

/** Automated callers must not bypass human gates (loop / CLI / agent defaults). */
export const AUTO_APPROVERS = new Set([
  "loop-operator",
  "loop-auto",
  "cli-operator",
  "cli-auto",
  "opencode-agent",
  "e2e-runner",
]);

export function isAutoApprover(approver: string): boolean {
  return AUTO_APPROVERS.has(approver.trim());
}

export function rejectAutomatedHumanApproval(
  phaseId: PhaseId,
  approval: HumanApproval,
  allowAutoHuman?: boolean,
): { ok: true } | { ok: false; error: string } {
  if (allowAutoHuman || !requiresHumanGate(phaseId)) {
    return { ok: true };
  }
  if (!approval.approved || !isAutoApprover(approval.approver)) {
    return { ok: true };
  }
  return {
    ok: false,
    error: `Human gate required for phase ${phaseId}: explicit human approver needed (automated ${approval.approver} not allowed)`,
  };
}

export function parseHumanGatePhases(env = process.env): PhaseId[] {
  const raw = env.TAIYI_HUMAN_GATE_PHASES?.trim();
  if (!raw) return [...DEFAULT_HUMAN_GATE_PHASES];
  const valid: PhaseId[] = [
    "change",
    "requirement",
    "design",
    "ui-design",
    "task",
    "dev",
    "test",
    "review",
    "integration",
  ];
  const picked = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is PhaseId => (valid as string[]).includes(s));
  return picked.length > 0 ? picked : [...DEFAULT_HUMAN_GATE_PHASES];
}

export function requiresHumanGate(phaseId: PhaseId, env = process.env): boolean {
  return parseHumanGatePhases(env).includes(phaseId);
}
