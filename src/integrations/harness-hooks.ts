import type { PhaseId } from "../core/types.js";
import { getOpenspecStatus } from "./openspec.js";
import { tokenCompressHarnessHooks } from "./token-compress-hooks.js";
import {
  auxiliarySkillIdsForPhase,
  getHarnessHooksFromManifest,
  getWorkflowManifest,
  resetWorkflowManifestCache,
} from "./workflow-manifest.js";
import { ProviderRegistry } from "../config/providers.js";
import type { CapabilityId } from "../config/providers.js";

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

/** 每个 phase 关联的能力，用于从 ProviderRegistry 解析 hook */
const PHASE_CAPABILITIES: Partial<Record<PhaseId, CapabilityId[]>> = {
  integration: ["spec_archive", "spec_sync", "archive_hook"],
  review: ["code_review", "design_review", "eng_review", "sast_scan", "vuln_scan", "accessibility", "design_guidelines"],
  dev: ["e2e_test", "browser_qa"],
  test: ["e2e_test", "browser_qa"],
};

function resolveProviderHooks(
  workspaceDir: string,
  slug: string,
  phase: PhaseId,
): { hooks: HarnessHook[]; notes: string[] } {
  const hooks: HarnessHook[] = [];
  const notes: string[] = [];
  const caps = PHASE_CAPABILITIES[phase];
  if (!caps) return { hooks, notes };

  const registry = ProviderRegistry.forProject(workspaceDir);

  for (const cap of caps) {
    const provider = registry.getProviderForCapability(cap);
    if (!provider) continue;

    if (provider.type === "cli" && provider.cli) {
      const cmd = provider.cli
        .replace(/\$SLUG/g, slug)
        .replace(/\$WORKSPACE/g, workspaceDir);
      hooks.push({
        tool: provider.provider,
        command: cmd,
        when: phase,
        optional: true,
      });
    }

    if (provider.type === "skill" || provider.type === "skill_bundle") {
      notes.push(`Provider ${provider.provider} 提供 ${cap}（加载 skill：${provider.skill ?? provider.bundle ?? provider.provider}）`);
    }

    if (provider.type === "builtin") {
      notes.push(`内置 Provider ${provider.provider} 处理 ${cap}`);
    }
  }

  return { hooks, notes };
}

export function getHarnessContext(
  workspaceDir: string,
  slug: string,
  phase: PhaseId,
): HarnessContext {
  const rawHooks: HarnessHook[] = getHarnessHooksFromManifest(phase).map((h) => ({
    ...h,
    command: h.command?.replace(/<slug>/g, slug),
  }));

  for (const th of tokenCompressHarnessHooks(phase, slug)) {
    rawHooks.push({
      tool: th.tool,
      skill: th.skill,
      command: th.command,
      when: th.when,
      optional: th.optional,
    });
  }

  const providerResult = resolveProviderHooks(workspaceDir, slug, phase);
  rawHooks.push(...providerResult.hooks);

  /** 去重：同一 hook key 可能从 manifest + token-compress-hooks 多源添加 */
  const seen = new Set<string>();
  const hooks: HarnessHook[] = [];
  for (const h of rawHooks) {
    const key = `${h.tool}:${h.skill ?? ""}:${h.command ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hooks.push(h);
  }

  const notes: string[] = [...providerResult.notes];
  const openspec = getOpenspecStatus(workspaceDir, slug);
  const manifest = getWorkflowManifest();
  const phaseDef = manifest.phases[phase];

  if (phase === "integration" && openspec.detected && !openspec.changeExists) {
    notes.push(`OpenSpec 已初始化但无 openspec/changes/${slug}/，archive 前需先创建变更目录`);
  }
  if (phaseDef?.human_gate) {
    notes.push(`人工门：complete 须 --approver（见 human-gate-config / phase.human_gate）`);
  }
  if (phaseDef?.engine_gate) {
    notes.push(`引擎门禁：${phaseDef.engine_gate}`);
  }
  const auxIds = auxiliarySkillIdsForPhase(phase);
  if (auxIds.length > 0) {
    notes.push(`辅助 Skill（auto 须工件）：${auxIds.join(", ")}`);
  }
  if (phase === "review") {
    notes.push("medium/high 复杂度：须先 taiyi-health → health-report.md");
  }
  if (phase === "task" || phase === "dev") {
    notes.push("Superpowers test-driven-development：task=测试计划 · dev=红绿重构；/taiyi:tdd plan|dev");
    notes.push("多切片并行：/taiyi:ultrawork · harness optional taiyi/taiyi-ultrawork · TAIYI_ULW_AUTO_TASK=1");
  }
  if (tokenCompressHarnessHooks(phase, slug).length > 0) {
    notes.push("Token 压缩：见 token-compress-hooks.yaml");
  }
  notes.push("完整流程真源：docs/taiyi/workflow-manifest.yaml");

  return { phase, slug, hooks, notes };
}

/** @deprecated tests only */
export function resetHarnessHooksCache(): void {
  resetWorkflowManifestCache();
}
