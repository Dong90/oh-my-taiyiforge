import type { PhaseDefinition, PhaseId } from "./types.js";
import { loadPhasesFromYaml } from "./load-phases-yaml.js";

const PHASES: PhaseDefinition[] = loadPhasesFromYaml(import.meta.url);

export function listPhases(): PhaseDefinition[] {
  return [...PHASES];
}

export function tryGetPhase(id: string): PhaseDefinition | null {
  return PHASES.find((p) => p.id === id) ?? null;
}

export function getPhase(id: PhaseId): PhaseDefinition {
  const phase = tryGetPhase(id);
  if (!phase) throw new Error(`Unknown phase: ${id}`);
  return phase;
}

/** Register a custom phase definition at runtime. */
export function registerCustomPhase(def: PhaseDefinition): void {
  const existing = PHASES.find((p) => p.id === def.id);
  if (existing) {
    Object.assign(existing, def);
    return;
  }
  PHASES.push(def);
  PHASES.sort((a, b) => a.order - b.order);
}

/** Register multiple custom phases. */
export function registerCustomPhases(defs: PhaseDefinition[]): void {
  for (const def of defs) registerCustomPhase(def);
}

/** Load custom phases from a TaiyiProjectConfig.customPhases array and register them. */
export function loadCustomPhasesFromConfig(
  customPhases: PhaseDefinition[] | undefined,
): { registered: number } {
  if (!customPhases || customPhases.length === 0) return { registered: 0 };
  registerCustomPhases(customPhases);
  return { registered: customPhases.length };
}

/** Reset phases to built-in defaults (for testing). */
export function resetPhases(): void {
  PHASES.length = 0;
  PHASES.push(...loadPhasesFromYaml(import.meta.url));
}

export function getPhaseOrder(id: PhaseId): number {
  return getPhase(id).order;
}

/** Return the canonical order of built-in phase IDs (sorted by `.order`). */
export function getCanonicalPhaseOrder(): string[] {
  return PHASES.map((p) => p.id);
}

export function effectiveCompletedPhases(
  completedPhases: PhaseId[],
  skippedPhases: PhaseId[] = [],
): PhaseId[] {
  return [...new Set([...completedPhases, ...skippedPhases])];
}

export function getNextPhase(id: PhaseId, skippedPhases: PhaseId[] = []): PhaseId | null {
  let order = getPhaseOrder(id);
  while (order < PHASES.length) {
    order += 1;
    const next = PHASES.find((p) => p.order === order);
    if (!next) return null;
    if (!skippedPhases.includes(next.id)) return next.id;
  }
  return null;
}

export function canEnterPhase(
  target: PhaseId,
  ctx: { completedPhases: PhaseId[]; skippedPhases?: PhaseId[] },
): { ok: boolean; missing: PhaseId[] } {
  const phase = getPhase(target);
  const effective = effectiveCompletedPhases(
    ctx.completedPhases,
    ctx.skippedPhases ?? [],
  );
  const missing = phase.requires.filter((r) => !effective.includes(r));
  return { ok: missing.length === 0, missing };
}
