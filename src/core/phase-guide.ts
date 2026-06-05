import fs from "node:fs";
import path from "node:path";
import type { ChangeState } from "./types.js";
import { getPhase, getNextPhase } from "./phase-registry.js";
import {
  artifactPathForPhase,
  validateArtifactFile,
} from "./artifact-validator.js";

export type PhaseGuide = {
  slug: string;
  currentPhase: ChangeState["currentPhase"];
  skill: string;
  artifact: string;
  artifactPath: string;
  artifactExists: boolean;
  qualityReady: boolean;
  qualityHints: string[];
  nextAction: string;
  nextPhase: string | null;
  nextSkill: string | null;
};

export function buildPhaseGuide(
  taiyiRoot: string,
  slug: string,
  state: ChangeState,
): PhaseGuide {
  const phase = getPhase(state.currentPhase);
  const changeDir = path.join(taiyiRoot, "changes", slug);
  const artifactPath = artifactPathForPhase(changeDir, state.currentPhase);
  const artifactExists =
    fs.existsSync(artifactPath) && fs.statSync(artifactPath).size > 0;

  let qualityReady = false;
  let qualityHints: string[] = [];

  if (artifactExists && phase.kind === "markdown") {
    const v = validateArtifactFile(artifactPath, state.currentPhase);
    if (v) {
      qualityHints = v.hints;
      qualityReady = Object.values(v.scores).every(Boolean);
    }
  } else if (artifactExists && phase.kind === "code") {
    qualityReady = true;
  } else {
    qualityHints = [`创建并填写工件: ${artifactPath}`];
  }

  const next = getNextPhase(state.currentPhase);
  const nextPhaseDef = next ? getPhase(next) : null;

  let nextAction: string;
  if (!artifactExists) {
    nextAction = `加载 Skill「${phase.skill}」，编辑 ${phase.artifact}`;
  } else if (!qualityReady) {
    nextAction = `完善 ${phase.artifact}（见 qualityHints），再执行 complete ${state.currentPhase}`;
  } else {
    nextAction = `人工确认后执行: taiyi complete ${slug} ${state.currentPhase}`;
  }

  return {
    slug,
    currentPhase: state.currentPhase,
    skill: phase.skill,
    artifact: phase.artifact,
    artifactPath,
    artifactExists,
    qualityReady,
    qualityHints,
    nextAction,
    nextPhase: next,
    nextSkill: nextPhaseDef?.skill ?? null,
  };
}
