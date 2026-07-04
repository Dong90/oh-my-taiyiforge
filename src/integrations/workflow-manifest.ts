import fs from "node:fs";
import path from "node:path";
import { resolvePackageRoot } from "../core/package-root.js";
import type { PhaseId } from "../core/types.js";
import type { HarnessHook } from "./harness-hooks.js";

export type SuperpowersCatalogEntry = { when: string };

export type PhaseSkillMap = {
  taiyi_skill: string;
  artifact: string;
  superpowers: string[];
  superpowers_optional: string[];
  external_optional: string[];
  capabilities?: {
    required: string[];
    optional: string[];
  };
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

export type WorkflowManifest = {
  superpowers_catalog: Record<string, SuperpowersCatalogEntry>;
  auxiliary_skills: AuxiliarySkillDef[];
  phases: Record<string, PhaseSkillMap>;
};

let cached: WorkflowManifest | null = null;
let cachedFilePath: string | null = null;

/** 当前 manifest 文件路径（可被 TAIYI_WORKFLOW_MANIFEST 覆盖） */
export function currentManifestPath(): string {
  const pkgRoot = resolvePackageRoot(import.meta.url);
  const explicit = process.env.TAIYI_WORKFLOW_MANIFEST;
  if (explicit && explicit.length > 0) {
    if (explicit === "default") {
      return path.join(pkgRoot, "docs", "taiyi", "workflow-manifest.yaml");
    }
    if (!explicit.includes("/") && !explicit.endsWith(".yaml")) {
      return path.join(pkgRoot, "docs", "taiyi", `workflow-manifest-${explicit}.yaml`);
    }
    return path.isAbsolute(explicit)
      ? explicit
      : path.join(pkgRoot, "docs", "taiyi", explicit);
  }
  return path.join(pkgRoot, "docs", "taiyi", "workflow-manifest.yaml");
}

/** 列出可用的 manifest preset（不含扩展名） */
export const MANIFEST_PRESETS = ["default", "optimized"] as const;

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

/** 跳过已废弃、仅文档用途的顶栏 section（旧 manifest 兼容） */
function isSkippedTopLevelSection(line: string): boolean {
  return (
    line.startsWith("version:") ||
    line.startsWith("description:") ||
    line.startsWith("profiles:") ||
    line.startsWith("gates:") ||
    line.startsWith("orchestrator:") ||
    line.startsWith("external_skills:") ||
    line.startsWith("token_compress:") ||
    line.startsWith("archive:")
  );
}

function loadManifestFile(): WorkflowManifest {
  if (cached && cachedFilePath === currentManifestPath()) return cached;

  const file = currentManifestPath();
  const empty: WorkflowManifest = {
    superpowers_catalog: {},
    auxiliary_skills: [],
    phases: {},
  };
  if (!fs.existsSync(file)) {
    cached = empty;
    cachedFilePath = file;
    return cached;
  }

  const superpowers_catalog: Record<string, SuperpowersCatalogEntry> = {};
  const auxiliary_skills: AuxiliarySkillDef[] = [];
  const phases: Record<string, PhaseSkillMap> = {};

  let section: "none" | "superpowers" | "auxiliary" | "phases" | "harness" | "skip" = "none";
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
        taiyi_skill: phaseDraft.taiyi_skill,
        artifact: phaseDraft.artifact ?? "",
        superpowers: phaseDraft.superpowers ?? [],
        superpowers_optional: phaseDraft.superpowers_optional ?? [],
        external_optional: phaseDraft.external_optional ?? [],
        capabilities: phaseDraft.capabilities,
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
    if (line.startsWith("#")) continue;

    if (isSkippedTopLevelSection(line)) {
      if (section === "harness") flushHarness();
      section = "skip";
      continue;
    }

    if (line === "superpowers_catalog:") {
      flushSp();
      flushPhase();
      flushAux();
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

    if (section === "skip") {
      if (line.match(/^[a-z_]+:/) && !line.startsWith(" ")) section = "none";
      else continue;
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
      if (line === "    capabilities:") {
        phaseDraft.capabilities = { required: [], optional: [] };
        continue;
      }
      const arrMatch = line.match(
        /^    (superpowers|superpowers_optional|external_optional|slash):\s*\[(.+)\]$/,
      );
      if (arrMatch && phaseId) {
        const key = arrMatch[1] as keyof PhaseSkillMap;
        phaseDraft[key] = parseArray(arrMatch[2]) as never;
      }
      const capMatch = line.match(/^\s{6}(required|optional):\s*\[(.+)\]$/);
      if (capMatch && phaseDraft.capabilities) {
        const capKey = capMatch[1] as "required" | "optional";
        phaseDraft.capabilities[capKey] = parseArray(capMatch[2]);
      }
      const scalar = line.match(/^    ([a-z_]+):\s*(.+)$/);
      if (scalar && phaseId && section === "phases") {
        const [, k, v] = scalar;
        if (k === "taiyi_skill") phaseDraft.taiyi_skill = v;
        if (k === "artifact") phaseDraft.artifact = v;
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
    superpowers_catalog,
    auxiliary_skills,
    phases,
  };
  cachedFilePath = file;
  return cached;
}

export function getWorkflowManifest(): WorkflowManifest {
  return loadManifestFile();
}

export function resetWorkflowManifestCache(): void {
  cached = null;
  cachedFilePath = null;
}

export function getPhaseFromManifest(phase: PhaseId): PhaseSkillMap | null {
  const m = loadManifestFile().phases[phase];
  return m ?? null;
}

export function getHarnessHooksFromManifest(phase: PhaseId): HarnessHook[] {
  return getPhaseFromManifest(phase)?.harness ?? [];
}

/** 某阶段关联的全部辅助 Skill（含带 when / required_when 的项，用于展示） */
export function auxiliarySkillIdsForPhase(phase: PhaseId): string[] {
  return loadManifestFile()
    .auxiliary_skills.filter((a) => a.phases.includes(phase))
    .map((a) => a.id);
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
  lines.push(`Taiyi Skill: ${map.taiyi_skill} → ${map.artifact}`);

  if (map.capabilities) {
    if (map.capabilities.required.length) {
      lines.push(`引擎能力（必选）: ${map.capabilities.required.map((c) => `cap/${c}`).join(", ")}`);
    }
    if (map.capabilities.optional.length) {
      lines.push(`引擎能力（可选）: ${map.capabilities.optional.map((c) => `cap/${c}`).join(", ")}`);
    }
  }

  const agentHooks = map.harness.filter((h) => h.skill && h.tool !== "openspec");
  const specialCli = map.harness.filter((h) => h.command && !h.skill);
  if (agentHooks.length) {
    lines.push(
      `Agent harness: ${agentHooks.map((h) => `${h.tool}/${h.skill}${h.optional ? "?" : ""}`).join(", ")}`,
    );
  }
  if (specialCli.length) {
    lines.push(
      `特例 CLI: ${specialCli.map((h) => h.command?.split(/\s+/).slice(0, 3).join(" ")).join(", ")}`,
    );
  }

  const auxIds = auxiliarySkillIdsForPhase(phase);
  if (auxIds.length) {
    lines.push(`辅助 Skill: ${auxIds.join(", ")}`);
  }
  if (map.slash.length) {
    lines.push(`斜杠: ${map.slash.join(" · ")}`);
  }
  if (map.human_gate) lines.push(`人工门: 须 --approver`);
  if (map.engine_gate) lines.push(`引擎门禁: ${map.engine_gate}`);
  lines.push(`capability 解析见 docs/taiyi/invoke-routing.md`);
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
