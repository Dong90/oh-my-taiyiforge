import type { PhaseId } from "../core/types.js";
import { getOpenspecStatus } from "./openspec.js";
import { tokenCompressHarnessHooks } from "./token-compress-hooks.js";
import {
  auxiliarySkillIdsForPhase,
  getHarnessHooksFromManifest,
  getPhaseFromManifest,
  getWorkflowManifest,
  resetWorkflowManifestCache,
} from "./workflow-manifest.js";
import {
  CAPABILITY_SKILL_HINTS,
  ProviderRegistry,
  type CapabilityId,
} from "../config/providers.js";
import {
  isNonMatchingProjectSkill,
  getAllProjectHooks,
  detectStack,
} from "./project-harness-hooks.js";

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

export function harnessHookKey(h: HarnessHook): string {
  if (h.skill) return `${h.tool}/${h.skill}`;
  if (h.command) return `${h.tool}:${h.command.split(/\s+/).slice(0, 2).join(" ")}`;
  return h.tool;
}

function capabilitiesForPhase(phase: PhaseId): { id: CapabilityId; optional: boolean }[] {
  const caps = getPhaseFromManifest(phase)?.capabilities;
  if (!caps) return [];
  const required = (caps.required ?? []).map((id) => ({
    id: id as CapabilityId,
    optional: false,
  }));
  const optional = (caps.optional ?? []).map((id) => ({
    id: id as CapabilityId,
    optional: true,
  }));
  return [...required, ...optional];
}

function resolveCapabilityHooks(
  workspaceDir: string,
  slug: string,
  phase: PhaseId,
): { hooks: HarnessHook[]; notes: string[] } {
  const hooks: HarnessHook[] = [];
  const notes: string[] = [];
  const registry = ProviderRegistry.forProject(workspaceDir);

  for (const { id: cap, optional } of capabilitiesForPhase(phase)) {
    const provider = registry.getProviderForCapability(cap);
    if (!provider || provider.type === "none") continue;

    const when = `cap/${cap}`;

    if (provider.type === "cli" && provider.cli) {
      const cmd = provider.cli
        .replace(/\$SLUG/g, slug)
        .replace(/\$WORKSPACE/g, workspaceDir);
      hooks.push({
        tool: provider.provider,
        command: cmd,
        when,
        optional,
      });
      continue;
    }

    if (provider.type === "skill" && provider.skill) {
      hooks.push({
        tool: provider.provider,
        skill: provider.skill,
        when,
        optional,
      });
      continue;
    }

    if (provider.type === "skill_bundle") {
      const hint = CAPABILITY_SKILL_HINTS[cap];
      if (hint) {
        hooks.push({
          tool: hint.tool,
          skill: hint.skill,
          when,
          optional,
        });
      } else {
        notes.push(
          `Provider ${provider.provider} 提供 ${cap}（bundle：${provider.bundle ?? provider.provider}，见 docs/taiyi/invoke-routing.md）`,
        );
      }
      continue;
    }

    if (provider.type === "builtin") {
      notes.push(`引擎内置 ${provider.provider} 处理 ${cap}`);
      continue;
    }

    if (provider.type === "manual" && provider.instructions) {
      notes.push(`${cap}: ${provider.instructions}`);
    }
  }

  return { hooks, notes };
}

export function getHarnessContext(
  workspaceDir: string,
  slug: string,
  phase: PhaseId,
): HarnessContext {
  const capabilityResult = resolveCapabilityHooks(workspaceDir, slug, phase);
  const projectLang = detectStack(workspaceDir);
  const projectTags = projectLang.allTags;

  const rawHooks: HarnessHook[] = getHarnessHooksFromManifest(phase)
    .filter((h) => {
      if (!h.skill) return true;
      return !isNonMatchingProjectSkill(h.skill, projectTags);
    })
    .map((h) => ({
      ...h,
      command: h.command?.replace(/<slug>/g, slug),
    }));

  const projHooks = getAllProjectHooks(workspaceDir, phase);
  for (const ph of projHooks) {
    rawHooks.push(ph);
  }

  rawHooks.push(...capabilityResult.hooks);

  for (const th of tokenCompressHarnessHooks(phase, slug)) {
    rawHooks.push({
      tool: th.tool,
      skill: th.skill,
      command: th.command,
      when: th.when,
      optional: th.optional,
    });
  }

  const seen = new Set<string>();
  const hooks: HarnessHook[] = [];
  for (const h of rawHooks.reverse()) {
    const key = harnessHookKey(h);
    if (seen.has(key)) continue;
    seen.add(key);
    hooks.unshift(h);
  }

  const techSummary = [
    projectLang.languages.length && `lang:${projectLang.languages.join(",")}`,
    projectLang.frameworks.length && `framework:${projectLang.frameworks.join(",")}`,
    projectLang.databases.length && `db:${projectLang.databases.join(",")}`,
    projectLang.infra.length && `infra:${projectLang.infra.join(",")}`,
    projectLang.tests.length && `test:${projectLang.tests.join(",")}`,
  ].filter(Boolean).join(" | ");

  const langNote = techSummary
    ? `项目技术栈: ${techSummary}（已注入专属 ECC 钩子）`
    : "项目技术栈: 未检测到（无专属钩子）";

  const notes: string[] = [
    ...capabilityResult.notes,
    langNote,
    "第三方调用真源：docs/taiyi/invoke-routing.md（Agent 加载 Skill · 引擎跑 CLI）",
  ];
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
    notes.push("ECC TDD：harness ecc/tdd-workflow；并行：/taiyi:ultrawork");
  }
  if (tokenCompressHarnessHooks(phase, slug).length > 0) {
    notes.push("Token 压缩：见 token-compress-hooks.yaml");
  }

  return { phase, slug, hooks, notes };
}

/** @deprecated tests only */
export function resetHarnessHooksCache(): void {
  resetWorkflowManifestCache();
}
