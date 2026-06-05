import type { PhaseId } from "../types.js";

export const DEFAULT_HUMAN_GATE_PHASES: PhaseId[] = ["change", "design", "review"];

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
