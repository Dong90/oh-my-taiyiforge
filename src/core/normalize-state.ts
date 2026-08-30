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
  const legacy = raw as unknown as Record<string, unknown>;
  const legacyPhase = legacy.currentPhase;
  const modernRaw: Record<string, unknown> = typeof legacyPhase === "object" && legacyPhase !== null
    ? {
        ...legacy,
        currentPhase: String((legacyPhase as { current?: unknown }).current ?? "change"),
        completedPhases: Array.isArray(legacy.completedPhases)
          ? legacy.completedPhases
          : Array.isArray(legacy.phases)
            ? (legacy.phases as Array<{ id?: string; complete?: boolean }>)
                .filter((phase) => phase.complete && typeof phase.id === "string")
                .map((phase) => phase.id)
            : [],
        skippedPhases: Array.isArray(legacy.skippedPhases) ? legacy.skippedPhases : [],
        strictDev: typeof legacy.strictDev === "boolean" ? legacy.strictDev : false,
        autoHarness: typeof legacy.autoHarness === "boolean" ? legacy.autoHarness : false,
        auxiliaryCompleted: Array.isArray(legacy.auxiliaryCompleted) ? legacy.auxiliaryCompleted : [],
            createdAt: typeof legacy.createdAt === "string" ? legacy.createdAt : String(legacy.created ?? ""),
        updatedAt: typeof legacy.updatedAt === "string" ? legacy.updatedAt : String(legacy.lastModified ?? legacy.created ?? ""),
        workflowStatus: legacy.workflowStatus ?? (legacy.active === false ? "completed" : "active"),
      }
    : legacy;
  const completedPhases = Array.isArray(modernRaw.completedPhases) ? modernRaw.completedPhases as PhaseId[] : [];
  const skippedPhases = Array.isArray(modernRaw.skippedPhases) ? modernRaw.skippedPhases as PhaseId[] : [];
  const draft: ChangeState = {
    ...modernRaw,
    profile: typeof modernRaw.profile === "string" ? modernRaw.profile as ChangeState["profile"] : "full",
    skippedPhases,
    completedPhases,
    strictDev: modernRaw.strictDev === true,
    autoHarness: modernRaw.autoHarness === true,
    auxiliaryCompleted: Array.isArray(modernRaw.auxiliaryCompleted) ? modernRaw.auxiliaryCompleted as string[] : [],
    complexity: normalizeComplexity(modernRaw.complexity),
    currentPhase: normalizeCurrentPhase({ ...modernRaw, currentPhase: String(modernRaw.currentPhase ?? "change"), completedPhases, skippedPhases } as ChangeState),
  } as ChangeState;
  const completed = isWorkflowCompleted(draft);
  const rawStatus = modernRaw.workflowStatus;
  const workflowStatus: ChangeState["workflowStatus"] =
    rawStatus === "aborted"
      ? "aborted"
      : rawStatus === "completed" && !completed
        ? "active"
        : rawStatus === "completed" || rawStatus === "active"
          ? rawStatus
          : (completed ? "completed" : "active");

  return {
    ...draft,
    workflowStatus,
  };
}
