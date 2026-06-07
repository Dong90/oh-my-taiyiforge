import fs from "node:fs";
import path from "node:path";
import { resolvePackageRoot } from "../core/package-root.js";
import type { PhaseId } from "../core/types.js";
import type { HarnessHook } from "./harness-hooks.js";

export type SuperpowersCatalogEntry = { when: string };

export type PhaseSkillMap = {
  order?: number;
  taiyi_skill: string;
  artifact: string;
  kind?: string;
  requires?: string[];
  superpowers: string[];
  superpowers_optional: string[];
  external_optional: string[];
  auxiliary: string[];
  slash: string[];
  human_gate?: boolean;
  engine_gate?: string;
  harness: HarnessHook[];
};

export type AuxiliarySkillDef = {
  id: string;
  phases: PhaseId[];
  artifact: string;
  required_when?: string;
  when?: string;
};

export type WorkflowGates = {
  human_phases: PhaseId[];
  delivery_phase: PhaseId;
  quality_dimensions: string[];
  dev_complete?: string;
  integration?: string;
};

export type WorkflowManifest = {
  profiles: Record<string, { skip_phases: PhaseId[] }>;
  gates: WorkflowGates;
  superpowers_catalog: Record<string, SuperpowersCatalogEntry>;
  auxiliary_skills: AuxiliarySkillDef[];
  phases: Record<string, PhaseSkillMap>;
};

let cached: WorkflowManifest | null = null;

function parseArray(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function parseBool(v: string | undefined): boolean | undefined {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

function loadManifestFile(): WorkflowManifest {
  if (cached) return cached;

  const pkgRoot = resolvePackageRoot(import.meta.url);
  const file = path.join(pkgRoot, "docs", "taiyi", "workflow-manifest.yaml");
  const empty: WorkflowManifest = {
    profiles: {},
    gates: {
      human_phases: ["change", "design", "review"],
      delivery_phase: "integration",
      quality_dimensions: [],
    },
    superpowers_catalog: {},
    auxiliary_skills: [],
    phases: {},
  };
  if (!fs.existsSync(file)) {
    cached = empty;
    return cached;
  }

  const profiles: WorkflowManifest["profiles"] = {};
  const gates: Partial<WorkflowGates> = {};
  const superpowers_catalog: Record<string, SuperpowersCatalogEntry> = {};
  const auxiliary_skills: AuxiliarySkillDef[] = [];
  const phases: Record<string, PhaseSkillMap> = {};

  let section:
    | "none"
    | "profiles"
    | "gates"
    | "superpowers"
    | "auxiliary"
    | "phases"
    | "harness"
    | "archive" = "none";
  let profileId: string | null = null;
  let spId: string | null = null;
  let spWhen = "";
  let phaseId: string | null = null;
  let phaseDraft: Partial<PhaseSkillMap> = {};
  let harnessDraft: Partial<HarnessHook> | null = null;
  let auxDraft: Partial<AuxiliarySkillDef> & { phases?: PhaseId[] } = {};

  const flushHarness = () => {
    if (phaseId && harnessDraft?.tool && harnessDraft.when) {
      phaseDraft.harness ??= [];
      phaseDraft.harness.push(harnessDraft as HarnessHook);
    }
    harnessDraft = null;
  };

  const flushPhase = () => {
    flushHarness();
    if (phaseId && phaseDraft.taiyi_skill) {
      phases[phaseId] = {
        order: phaseDraft.order,
        taiyi_skill: phaseDraft.taiyi_skill,
        artifact: phaseDraft.artifact ?? "",
        kind: phaseDraft.kind,
        requires: phaseDraft.requires ?? [],
        superpowers: phaseDraft.superpowers ?? [],
        superpowers_optional: phaseDraft.superpowers_optional ?? [],
        external_optional: phaseDraft.external_optional ?? [],
        auxiliary: phaseDraft.auxiliary ?? [],
        slash: phaseDraft.slash ?? [],
        human_gate: phaseDraft.human_gate,
        engine_gate: phaseDraft.engine_gate,
        harness: phaseDraft.harness ?? [],
      };
    }
    phaseDraft = {};
  };

  const flushAux = () => {
    if (auxDraft.id && auxDraft.phases?.length) {
      auxiliary_skills.push({
        id: auxDraft.id,
        phases: auxDraft.phases,
        artifact: auxDraft.artifact ?? "",
        required_when: auxDraft.required_when,
        when: auxDraft.when,
      });
    }
    auxDraft = {};
  };

  const flushSp = () => {
    if (spId && spWhen) superpowers_catalog[spId] = { when: spWhen };
    spId = null;
    spWhen = "";
  };

  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line === "profiles:") {
      flushSp();
      flushPhase();
      flushAux();
      section = "profiles";
      continue;
    }
    if (line === "gates:") {
      section = "gates";
      continue;
    }
    if (line === "superpowers_catalog:") {
      section = "superpowers";
      continue;
    }
    if (line === "auxiliary_skills:") {
      flushSp();
      section = "auxiliary";
      continue;
    }
    if (line === "phases:") {
      flushSp();
      flushAux();
      section = "phases";
      continue;
    }
    if (line === "archive:") {
      flushPhase();
      section = "archive";
      continue;
    }
    if (
      line.startsWith("external_skills:") ||
      line.startsWith("token_compress:") ||
      line.startsWith("orchestrator:") ||
      line.startsWith("description:")
    ) {
      if (section === "harness") flushHarness();
      section = "none";
      continue;
    }

    if (section === "profiles") {
      const m = line.match(/^  ([a-z]+):$/);
      if (m) {
        profileId = m[1];
        profiles[profileId] = { skip_phases: [] };
        continue;
      }
      const skip = line.match(/^    skip_phases:\s*\[(.+)\]$/)?.[1];
      if (skip && profileId) profiles[profileId].skip_phases = parseArray(skip) as PhaseId[];
      continue;
    }

    if (section === "gates") {
      const arr = line.match(/^  ([a-z_]+):\s*\[(.+)\]$/)?.[2];
      if (arr) {
        const key = line.match(/^  ([a-z_]+):/)?.[1];
        if (key === "human_phases") gates.human_phases = parseArray(arr) as PhaseId[];
        if (key === "quality_dimensions") gates.quality_dimensions = parseArray(arr);
      }
      const scalar = line.match(/^  ([a-z_]+):\s*(.+)$/);
      if (scalar) {
        const [, k, v] = scalar;
        if (k === "delivery_phase") gates.delivery_phase = v as PhaseId;
        if (k === "dev_complete") gates.dev_complete = v;
        if (k === "integration") gates.integration = v;
      }
      continue;
    }

    if (section === "superpowers") {
      const m = line.match(/^  ([a-z0-9-]+):$/);
      if (m) {
        flushSp();
        spId = m[1];
        continue;
      }
      const when = line.match(/^    when:\s*(.+)$/)?.[1];
      if (when) spWhen = when;
      continue;
    }

    if (section === "auxiliary") {
      if (line.match(/^  - id:/)) {
        flushAux();
        auxDraft.id = line.match(/id:\s*(\S+)/)?.[1];
        continue;
      }
      const phasesMatch = line.match(/^    phases:\s*\[(.+)\]$/)?.[1];
      if (phasesMatch) auxDraft.phases = parseArray(phasesMatch) as PhaseId[];
      const artifact = line.match(/^    artifact:\s*(.+)$/)?.[1];
      if (artifact) auxDraft.artifact = artifact;
      const rw = line.match(/^    required_when:\s*(.+)$/)?.[1];
      if (rw) auxDraft.required_when = rw;
      const when = line.match(/^    when:\s*(.+)$/)?.[1];
      if (when) auxDraft.when = when;
      continue;
    }

    if (section === "phases") {
      const m = line.match(/^  ([a-z-]+):$/);
      if (m && m[1] !== "harness") {
        flushPhase();
        phaseId = m[1];
        phaseDraft.harness = [];
        continue;
      }
      if (line === "    harness:") {
        section = "harness";
        continue;
      }
      const arrMatch = line.match(
        /^    (superpowers|superpowers_optional|external_optional|auxiliary|slash|requires):\s*\[(.+)\]$/,
      );
      if (arrMatch && phaseId) {
        const key = arrMatch[1] as keyof PhaseSkillMap;
        phaseDraft[key] = parseArray(arrMatch[2]) as never;
      }
      const scalar = line.match(/^    ([a-z_]+):\s*(.+)$/);
      if (scalar && phaseId && section === "phases") {
        const [, k, v] = scalar;
        if (k === "order") phaseDraft.order = Number(v);
        if (k === "taiyi_skill") phaseDraft.taiyi_skill = v;
        if (k === "artifact") phaseDraft.artifact = v;
        if (k === "kind") phaseDraft.kind = v;
        if (k === "engine_gate") phaseDraft.engine_gate = v;
        if (k === "human_gate") phaseDraft.human_gate = parseBool(v);
      }
      continue;
    }

    if (section === "harness") {
      if (line.match(/^\s+-\s+tool:/)) {
        flushHarness();
        harnessDraft = { tool: line.match(/tool:\s*(\S+)/)?.[1] ?? "" };
        continue;
      }
      if (!harnessDraft || !phaseId) continue;
      const skill = line.match(/skill:\s*(\S+)/)?.[1];
      const command = line.match(/command:\s*(.+)$/)?.[1];
      const when = line.match(/when:\s*(.+)$/)?.[1];
      const optional = line.match(/optional:\s*(true|false)/)?.[1];
      if (skill) harnessDraft.skill = skill;
      if (command) harnessDraft.command = command;
      if (when) harnessDraft.when = when;
      if (optional === "true") harnessDraft.optional = true;
      const nextPhase = line.match(/^  ([a-z-]+):$/);
      if (nextPhase && nextPhase[1] !== "harness") {
        flushHarness();
        flushPhase();
        section = "phases";
        phaseId = nextPhase[1];
        phaseDraft.harness = [];
      }
    }
  }

  flushSp();
  flushAux();
  flushPhase();

  cached = {
    profiles,
    gates: {
      human_phases: gates.human_phases ?? ["change", "design", "review"],
      delivery_phase: gates.delivery_phase ?? "integration",
      quality_dimensions: gates.quality_dimensions ?? [],
      dev_complete: gates.dev_complete,
      integration: gates.integration,
    },
    superpowers_catalog,
    auxiliary_skills,
    phases,
  };
  return cached;
}

export function getWorkflowManifest(): WorkflowManifest {
  return loadManifestFile();
}

export function resetWorkflowManifestCache(): void {
  cached = null;
}

export function getPhaseFromManifest(phase: PhaseId): PhaseSkillMap | null {
  const m = loadManifestFile().phases[phase];
  return m ?? null;
}

export function getHarnessHooksFromManifest(phase: PhaseId): HarnessHook[] {
  return getPhaseFromManifest(phase)?.harness ?? [];
}

export function auxiliaryForPhaseFromManifest(phase: PhaseId): string[] {
  const data = loadManifestFile();
  return data.auxiliary_skills
    .filter(
      (a) =>
        a.phases.includes(phase) &&
        !a.when &&
        !a.required_when,
    )
    .map((a) => a.id);
}

export function auxiliaryHomePhaseFromManifest(skillId: string): PhaseId | undefined {
  const hit = loadManifestFile().auxiliary_skills.find((a) => a.id === skillId);
  return hit?.phases[0];
}

export function listSuperpowersFromManifest(): { id: string; entry: SuperpowersCatalogEntry }[] {
  const data = loadManifestFile();
  return Object.entries(data.superpowers_catalog).map(([id, entry]) => ({ id, entry }));
}

export function formatPhaseWorkflowPlain(phase: PhaseId): string | null {
  const map = getPhaseFromManifest(phase);
  if (!map) return null;

  const lines: string[] = [];
  if (map.superpowers.length) {
    lines.push(`Superpowers（建议）: ${map.superpowers.join(", ")}`);
  }
  if (map.superpowers_optional.length) {
    lines.push(`Superpowers（可选）: ${map.superpowers_optional.join(", ")}`);
  }
  if (map.external_optional.length) {
    lines.push(`外部 Skill/CLI（可选）: ${map.external_optional.join(", ")}`);
  }
  if (map.auxiliary.length) {
    lines.push(`辅助 Skill: ${map.auxiliary.join(", ")}`);
  }
  const requiredHooks = map.harness.filter((h) => !h.optional);
  const optionalHooks = map.harness.filter((h) => h.optional);
  if (requiredHooks.length) {
    lines.push(
      `harness 必选: ${requiredHooks.map((h) => (h.skill ? `${h.tool}/${h.skill}` : h.command ? `${h.tool}:${h.command.split(/\s+/).slice(0, 2).join(" ")}` : h.tool)).join(", ")}`,
    );
  }
  if (optionalHooks.length) {
    lines.push(
      `harness 可选: ${optionalHooks.map((h) => (h.skill ? `${h.tool}/${h.skill}` : h.tool)).join(", ")}`,
    );
  }
  if (map.slash.length) {
    lines.push(`斜杠命令: ${map.slash.join(" · ")}`);
  }
  if (map.human_gate) lines.push(`人工门: 须 --approver`);
  if (map.engine_gate) lines.push(`引擎门禁: ${map.engine_gate}`);
  lines.push(`Taiyi Skill: ${map.taiyi_skill} → ${map.artifact}`);
  return lines.join("\n");
}

/** @deprecated use getPhaseFromManifest — backward compat for skill-flow.ts */
export function getPhaseSkillFlow(phase: PhaseId): {
  superpowers: string[];
  superpowers_optional: string[];
  external_optional: string[];
  taiyi_skill: string;
  slash: string[];
  engine_gate?: string;
} | null {
  const m = getPhaseFromManifest(phase);
  if (!m) return null;
  return {
    superpowers: m.superpowers,
    superpowers_optional: m.superpowers_optional,
    external_optional: m.external_optional,
    taiyi_skill: m.taiyi_skill,
    slash: m.slash,
    engine_gate: m.engine_gate,
  };
}
