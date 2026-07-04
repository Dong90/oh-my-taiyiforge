import fs from "node:fs";
import path from "node:path";
import type { ChangeState } from "./types.js";
import { detectAheadArtifacts } from "./ahead-artifacts.js";
import { detectCompletedAuxiliary } from "./auxiliary-artifacts.js";
import {
  artifactPathForPhase,
  validateArtifactContent,
} from "./artifact-validator.js";
import { getPhase } from "./phase-registry.js";
import { isSeedTemplate, TAIYI_SEED_MARKER } from "./seed-marker.js";
import { hasPlaceholders, countPlaceholders, hasSubstantiveContent } from "./placeholder-check.js";

export type StepBlocker = {
  code: string;
  message: string;
};

export type StateSyncResult = {
  state: ChangeState;
  changed: boolean;
  /** 本次自动修复（同步 auxiliary、去掉 seed 标记等） */
  actions: string[];
  /** 阻止 continue/complete 的顺序问题 */
  blockers: StepBlocker[];
};

function stripSeedMarker(content: string): string {
  return content.replace(new RegExp(`^${escapeRegExp(TAIYI_SEED_MARKER)}\\n?`), "").trimStart();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 内容已实质填写但忘了删 seed 标记时，自动 promote 为正式工件。 */
export function tryPromoteSeedArtifact(artifactPath: string, phaseId: ChangeState["currentPhase"]): boolean {
  if (!fs.existsSync(artifactPath)) return false;
  const content = fs.readFileSync(artifactPath, "utf8");
  if (!isSeedTemplate(content)) return false;

  // 占位符还在 → 内容仍为骨架，不 auto-promote。seed marker 留着让质量门继续报错
  if (hasPlaceholders(content)) return false;
  // 非 dev 阶段：content 长度 < 200 且无 substantive 内容 → 也不 promote
  if (phaseId !== "dev" && content.length < 200 && !hasSubstantiveContent(phaseId, content)) return false;

  const body = stripSeedMarker(content);
  if (phaseId === "dev") {
    const v = validateArtifactContent(phaseId, body);
    if (!Object.values(v.scores).every(Boolean)) return false;
  }

  fs.writeFileSync(artifactPath, body.endsWith("\n") ? body : `${body}\n`, "utf8");
  return true;
}

export function mergeAuxiliaryFromArtifacts(
  changeDir: string,
  state: ChangeState,
): { state: ChangeState; added: string[] } {
  const detected = detectCompletedAuxiliary(changeDir);
  const done = new Set(state.auxiliaryCompleted);
  const added: string[] = [];
  for (const skillId of detected) {
    if (!done.has(skillId)) {
      done.add(skillId);
      added.push(skillId);
    }
  }
  if (added.length === 0) return { state, added: [] };
  return {
    state: {
      ...state,
      auxiliaryCompleted: [...done],
      updatedAt: new Date().toISOString(),
    },
    added,
  };
}

export function detectStepBlockers(changeDir: string, state: ChangeState): StepBlocker[] {
  const blockers: StepBlocker[] = [];

  if (state.autoHarness) {
    return blockers;
  }

  for (const f of detectAheadArtifacts(changeDir, state)) {
    if (f.code === "artifacts.ahead-of-phase") {
      blockers.push({
        code: f.code,
        message: `${f.message}。请删除 ${f.file}、运行 scripts/taiyi-forge.sh trim-ahead ${state.slug}，或先 /taiyi:continue 按顺序过关当前阶段 ${state.currentPhase}。`,
      });
    }
  }

  return blockers;
}

/** 对齐磁盘工件与 state.json，减少「做了但引擎不知道」。 */
export function syncChangeState(changeDir: string, state: ChangeState): StateSyncResult {
  const actions: string[] = [];
  let working = state;
  let changed = false;

  const aux = mergeAuxiliaryFromArtifacts(changeDir, working);
  if (aux.added.length) {
    working = aux.state;
    changed = true;
    actions.push(`已同步辅助完成（来自工件）: ${aux.added.join(", ")}`);
  }

  const phase = getPhase(working.currentPhase);
  if (phase.kind === "markdown") {
    const artifactPath = artifactPathForPhase(changeDir, working.currentPhase);
    if (tryPromoteSeedArtifact(artifactPath, working.currentPhase)) {
      changed = true;
      actions.push(`已移除 ${phase.artifact} 的模板标记（内容已就绪）`);
    }
  }

  const blockers = detectStepBlockers(changeDir, working);

  return { state: working, changed, actions, blockers };
}

export function formatSyncActions(actions: string[]): string[] {
  return actions.map((a) => `↻ ${a}`);
}

export function formatStepBlockers(blockers: StepBlocker[]): string[] {
  return blockers.map((b) => `⚠ ${b.message}`);
}
