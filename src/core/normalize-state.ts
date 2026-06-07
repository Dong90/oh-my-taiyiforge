import type { ChangeState, ComplexityAssessment, ComplexityLevel, PhaseId } from "./types.js";
import { isWorkflowCompleted } from "./change-status.js";
import { tryGetPhase } from "./phase-registry.js";

const LEVELS: ComplexityLevel[] = ["low", "medium", "high"];

/** Legacy state.json may store complexity as a plain string. */
export function normalizeComplexity(raw: unknown): ComplexityAssessment | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    const level = raw.trim() as ComplexityLevel;
    if (LEVELS.includes(level)) {
      return { level, score: 0, recommendedSkills: [] };
    }
    return undefined;
  }
  if (typeof raw === "object") {
    const o = raw as Partial<ComplexityAssessment>;
    const level = LEVELS.includes(o.level as ComplexityLevel)
      ? (o.level as ComplexityLevel)
      : "medium";
    return {
      level,
      score: typeof o.score === "number" ? o.score : 0,
      recommendedSkills: Array.isArray(o.recommendedSkills) ? o.recommendedSkills : [],
    };
  }
  return undefined;
}

/** Legacy hand-edited state may use currentPhase "complete". */
export function normalizeCurrentPhase(raw: ChangeState): PhaseId {
  const id = String(raw.currentPhase ?? "");
  if (id === "complete" || id === "completed") return "integration";
  if (tryGetPhase(id)) return id as PhaseId;
  if (isWorkflowCompleted(raw)) return "integration";
  return "change";
}

export function normalizeState(raw: ChangeState): ChangeState {
  const completedPhases = raw.completedPhases ?? [];
  const skippedPhases = raw.skippedPhases ?? [];
  const draft: ChangeState = {
    ...raw,
    profile: raw.profile ?? "full",
    skippedPhases,
    completedPhases,
    strictDev: raw.strictDev ?? false,
    autoHarness: raw.autoHarness ?? false,
    auxiliaryCompleted: raw.auxiliaryCompleted ?? [],
    complexity: normalizeComplexity(raw.complexity),
    currentPhase: normalizeCurrentPhase({ ...raw, completedPhases, skippedPhases }),
  };
  const completed = isWorkflowCompleted(draft);
  const workflowStatus =
    raw.workflowStatus === "completed" && !completed
      ? "active"
      : (raw.workflowStatus ?? (completed ? "completed" : "active"));

  return {
    ...draft,
    workflowStatus,
  };
}
