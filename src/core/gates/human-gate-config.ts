import type { HumanApproval, PhaseId } from "../types.js";

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
