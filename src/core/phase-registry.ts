import type { PhaseDefinition, PhaseId } from "./types.js";

const PHASES: PhaseDefinition[] = [
  {
    id: "change",
    order: 1,
    skill: "taiyi-change",
    artifact: "CHANGE.md",
    kind: "markdown",
    requires: [],
  },
  {
    id: "requirement",
    order: 2,
    skill: "taiyi-requirement",
    artifact: "REQUIREMENT.md",
    kind: "markdown",
    requires: ["change"],
  },
  {
    id: "design",
    order: 3,
    skill: "taiyi-design",
    artifact: "DESIGN.md",
    kind: "markdown",
    requires: ["requirement"],
  },
  {
    id: "ui-design",
    order: 4,
    skill: "taiyi-ui-design",
    artifact: "UI-DESIGN.md",
    kind: "markdown",
    requires: ["design"],
  },
  {
    id: "task",
    order: 5,
    skill: "taiyi-task",
    artifact: "TASK.md",
    kind: "markdown",
    requires: ["ui-design"],
  },
  {
    id: "dev",
    order: 6,
    skill: "taiyi-dev",
    artifact: "dev.bundle",
    kind: "code",
    requires: ["task"],
  },
  {
    id: "test",
    order: 7,
    skill: "taiyi-test",
    artifact: "TEST.md",
    kind: "markdown",
    requires: ["dev"],
  },
  {
    id: "review",
    order: 8,
    skill: "taiyi-review",
    artifact: "REVIEW.md",
    kind: "markdown",
    requires: ["test"],
  },
  {
    id: "integration",
    order: 9,
    skill: "taiyi-integration",
    artifact: "CHANGELOG.md",
    kind: "markdown",
    requires: ["review"],
  },
];

export function listPhases(): PhaseDefinition[] {
  return [...PHASES];
}

export function getPhase(id: PhaseId): PhaseDefinition {
  const phase = PHASES.find((p) => p.id === id);
  if (!phase) throw new Error(`Unknown phase: ${id}`);
  return phase;
}

export function getPhaseOrder(id: PhaseId): number {
  return getPhase(id).order;
}

export function getNextPhase(id: PhaseId): PhaseId | null {
  const order = getPhaseOrder(id);
  const next = PHASES.find((p) => p.order === order + 1);
  return next?.id ?? null;
}

export function canEnterPhase(
  target: PhaseId,
  ctx: { completedPhases: PhaseId[] },
): { ok: boolean; missing: PhaseId[] } {
  const phase = getPhase(target);
  const missing = phase.requires.filter(
    (r) => !ctx.completedPhases.includes(r),
  );
  return { ok: missing.length === 0, missing };
}
