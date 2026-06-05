import type { GateInput, PhaseId, QualityScores } from "../core/types.js";
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases, getPhase } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { assessComplexity, type ComplexitySignals } from "../core/routing/complexity.js";

export function createEngine(workspaceDir: string): WorkflowEngine {
  return new WorkflowEngine(resolveTaiyiRoot(workspaceDir));
}

export function taiyiInit(workspaceDir: string, slug: string) {
  const engine = createEngine(workspaceDir);
  const state = engine.initChange(slug);
  return { ok: true as const, state, taiyiRoot: resolveTaiyiRoot(workspaceDir) };
}

export function taiyiStatus(workspaceDir: string, slug: string) {
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };
  return { ok: true as const, state, taiyiRoot: resolveTaiyiRoot(workspaceDir) };
}

export function taiyiPhases() {
  return listPhases().map((p) => ({
    id: p.id,
    order: p.order,
    skill: p.skill,
    artifact: p.artifact,
    requires: p.requires,
  }));
}

export function taiyiComplete(
  workspaceDir: string,
  slug: string,
  phaseId: string,
  gates?: Partial<GateInput>,
) {
  const engine = createEngine(workspaceDir);
  const phase = getPhase(phaseId as PhaseId);
  const quality: QualityScores = {
    completeness: gates?.quality?.completeness ?? true,
    consistency: gates?.quality?.consistency ?? true,
    verifiability: gates?.quality?.verifiability ?? true,
    traceability: gates?.quality?.traceability ?? true,
    engineering_quality: gates?.quality?.engineering_quality ?? true,
  };
  const human = gates?.human ?? { approved: true, approver: "opencode-agent" };
  const result = engine.completePhase(slug, phase.id, { quality, human });
  if (!result.ok) return { ok: false as const, error: result.error };
  return {
    ok: true as const,
    state: engine.getState(slug),
    phase: phase.id,
    nextSkill: getPhase(engine.getState(slug)!.currentPhase).skill,
  };
}

export function taiyiAssess(workspaceDir: string, slug: string, signals: ComplexitySignals) {
  const engine = createEngine(workspaceDir);
  try {
    const assessment = engine.assessComplexity(slug, signals);
    return { ok: true as const, assessment };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
}
