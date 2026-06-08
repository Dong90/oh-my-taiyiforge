import type { PhaseId } from "../core/types.js";
import { getOpenspecStatus } from "./openspec.js";
import { tokenCompressHarnessHooks } from "./token-compress-hooks.js";
import {
  getHarnessHooksFromManifest,
  getWorkflowManifest,
  resetWorkflowManifestCache,
} from "./workflow-manifest.js";

export type HarnessHook = {
  tool: string;
  skill?: string;
  command?: string;
  when: string;
  optional?: boolean;
};

export type HarnessContext = {
  phase: PhaseId;
  slug: string;
  hooks: HarnessHook[];
  notes: string[];
};

export function getHarnessContext(
  workspaceDir: string,
  slug: string,
  phase: PhaseId,
): HarnessContext {
  const hooks: HarnessHook[] = getHarnessHooksFromManifest(phase).map((h) => ({
    ...h,
    command: h.command?.replace(/<slug>/g, slug),
  }));

  for (const th of tokenCompressHarnessHooks(phase, slug)) {
    hooks.push({
      tool: th.tool,
      skill: th.skill,
      command: th.command,
      when: th.when,
      optional: th.optional,
    });
  }

  const notes: string[] = [];
  const openspec = getOpenspecStatus(workspaceDir, slug);
  const manifest = getWorkflowManifest();
  const phaseDef = manifest.phases[phase];

  if (phase === "integration" && openspec.detected && !openspec.changeExists) {
    notes.push(`OpenSpec 已初始化但无 openspec/changes/${slug}/，archive 前需先创建变更目录`);
  }
  if (phaseDef?.human_gate) {
    notes.push(`人工门：complete 须 --approver（见 workflow-manifest gates.human_phases）`);
  }
  if (phaseDef?.engine_gate) {
    notes.push(`引擎门禁：${phaseDef.engine_gate}`);
  }
  if (phaseDef?.auxiliary?.length) {
    notes.push(`辅助 Skill（auto 须工件）：${phaseDef.auxiliary.join(", ")}`);
  }
  if (phase === "review") {
    notes.push("medium/high 复杂度：须先 taiyi-health → health-report.md");
  }
  if (phase === "task" || phase === "dev") {
    notes.push("Superpowers test-driven-development：task=测试计划 · dev=红绿重构；/taiyi:tdd plan|dev");
    notes.push("多切片并行：/taiyi:ultrawork · harness optional taiyi/taiyi-ultrawork · TAIYI_ULW_AUTO_TASK=1");
  }
  if (tokenCompressHarnessHooks(phase, slug).length > 0) {
    notes.push("Token 压缩：见 workflow-manifest token_compress");
  }
  notes.push("完整流程真源：docs/taiyi/workflow-manifest.yaml");

  return { phase, slug, hooks, notes };
}

/** @deprecated tests only */
export function resetHarnessHooksCache(): void {
  resetWorkflowManifestCache();
}
