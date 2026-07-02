import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { getPhase, listPhases } from "./phase-registry.js";
import { isSeedTemplate, wrapSeedTemplate } from "./seed-marker.js";
import { ZOD_PHASES } from "./artifact-validator.js";
import { renderTemplate as engineRender } from "./template-engine.js";
import { resolveHbsTemplatesDir } from "./package-root.js";
import { seedPhaseArtifacts } from "./artifact-seed.js";

import type { SeedVars } from "./template-engine.js";

export type SeedOptions = {
  /** 仅铺指定阶段工件；默认仅 change（避免 new 后九阶段文件全在）。 */
  phases?: PhaseId[];
  /** CONTEXT.md 仅由 taiyi-intel-scan 产出，init 默认不铺。 */
  includeContext?: boolean;
  /** Override Handlebars templates directory (default: resolveHbsTemplatesDir). `null` = legacy .md only. */
  hbsTemplatesDir?: string | null;
};

function resolveHbsDirForSeed(explicit?: string | null): string | undefined {
  if (explicit === null) return undefined;
  const dir = explicit ?? resolveHbsTemplatesDir(import.meta.url);
  return fs.existsSync(path.join(dir, "change.hbs")) ? dir : undefined;
}

function renderTemplate(raw: string, vars: SeedVars): string {
  return wrapSeedTemplate(engineRender(raw, vars));
}

// Map artifact filenames to phase IDs (handles CHANGELOG.md → integration)
const ARTIFACT_TO_PHASE_ID: Record<string, string> = {
  "CHANGE.md": "change",
  "REQUIREMENT.md": "requirement",
  "DESIGN.md": "design",
  "UI-DESIGN.md": "ui-design",
  "TASK.md": "task",
  "TEST.md": "test",
  "REVIEW.md": "review",
  "CHANGELOG.md": "integration",
};

function resolveHbsDir(explicit?: string | null): string | undefined {
  return resolveHbsDirForSeed(explicit);
}

/** Preserve explicit `null` (legacy md-only); only omit key → auto-detect hbs. */
function seedHbsOption(options?: SeedOptions): string | null | undefined {
  if (options && "hbsTemplatesDir" in options) return options.hbsTemplatesDir;
  return undefined;
}

/** Legacy: copy static .md when no hbs pipeline is available. */
function seedArtifactFileLegacy(
  changeDir: string,
  templatesDir: string,
  artifact: string,
  vars: SeedVars,
): boolean {
  let templateFile = path.join(templatesDir, artifact);
  if (!fs.existsSync(templateFile)) {
    const phaseId = ARTIFACT_TO_PHASE_ID[artifact];
    if (phaseId) {
      const hbsPath = path.join(templatesDir, `${phaseId}.hbs`);
      if (fs.existsSync(hbsPath)) templateFile = hbsPath;
      else return false;
    } else {
      return false;
    }
  }

  const dest = path.join(changeDir, artifact);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    const existing = fs.readFileSync(dest, "utf8");
    if (!isSeedTemplate(existing)) return false;
    if (!(vars as SeedVars & { __forceOverwrite?: boolean }).__forceOverwrite) {
      return false;
    }
  }

  const raw = fs.readFileSync(templateFile, "utf8");
  fs.writeFileSync(dest, renderTemplate(raw, vars), "utf8");
  return true;
}

function seedPhaseMarkdown(
  changeDir: string,
  templatesDir: string | undefined,
  phaseId: PhaseId,
  vars: SeedVars,
  hbsTemplatesDir?: string | null,
): string[] {
  const phase = getPhase(phaseId);
  if (phase.kind !== "markdown") return [];

  const hbsDir = resolveHbsDir(hbsTemplatesDir);
  if (hbsDir && ZOD_PHASES.includes(phaseId)) {
    const out = seedPhaseArtifacts(changeDir, hbsDir, phaseId, vars);
    if (out) return [out.json, out.markdown];
    return [];
  }

  if (!templatesDir || !fs.existsSync(templatesDir)) return [];
  if (seedArtifactFileLegacy(changeDir, templatesDir, phase.artifact, vars)) {
    return [phase.artifact];
  }
  return [];
}

/** init 时仅铺 change 阶段（+ 可选 CONTEXT，默认关）。 */
export function seedChangeTemplates(
  changeDir: string,
  templatesDir: string,
  vars: SeedVars,
  options?: SeedOptions,
): string[] {
  const phaseIds = options?.phases ?? (["change"] as PhaseId[]);
  const seeded: string[] = [];

  const hbsOpt = seedHbsOption(options);
  for (const phaseId of phaseIds) {
    seeded.push(
      ...seedPhaseMarkdown(changeDir, templatesDir, phaseId, vars, hbsOpt),
    );
  }

  if (options?.includeContext && fs.existsSync(templatesDir)) {
    if (seedArtifactFileLegacy(changeDir, templatesDir, "CONTEXT.md", vars)) {
      seeded.push("CONTEXT.md");
    }
  }

  return seeded;
}

/** complete 过关后为下一阶段铺模板（若文件尚不存在）。 */
export function seedPhaseTemplate(
  changeDir: string,
  templatesDir: string,
  phaseId: PhaseId,
  vars: SeedVars,
  hbsTemplatesDir?: string | null,
): string | null {
  const seeded = seedPhaseMarkdown(changeDir, templatesDir, phaseId, vars, hbsTemplatesDir);
  if (seeded.length === 0) return null;
  const phase = getPhase(phaseId);
  return phase.artifact;
}

/** @deprecated 仅测试/迁移：铺全部阶段模板（勿用于生产 init）。 */
export function seedAllPhaseTemplates(
  changeDir: string,
  templatesDir: string,
  vars: SeedVars,
  options?: Pick<SeedOptions, "hbsTemplatesDir">,
): string[] {
  return seedChangeTemplates(changeDir, templatesDir, vars, {
    phases: listPhases()
      .filter((p) => p.kind === "markdown")
      .map((p) => p.id),
    includeContext: false,
    ...(options && "hbsTemplatesDir" in options
      ? { hbsTemplatesDir: options.hbsTemplatesDir }
      : {}),
  });
}
