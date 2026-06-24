import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { getPhase, listPhases } from "./phase-registry.js";
import { isSeedTemplate, wrapSeedTemplate } from "./seed-marker.js";
import { ZOD_PHASES } from "./artifact-validator.js";
import { renderTemplate as engineRender } from "./template-engine.js";

import type { SeedVars } from "./template-engine.js";

export type SeedOptions = {
  /** 仅铺指定阶段工件；默认仅 change（避免 new 后九阶段文件全在）。 */
  phases?: PhaseId[];
  /** CONTEXT.md 仅由 taiyi-intel-scan 产出，init 默认不铺。 */
  includeContext?: boolean;
};

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

function seedArtifactFile(
  changeDir: string,
  templatesDir: string,
  artifact: string,
  vars: SeedVars,
): boolean {
  let templateFile = path.join(templatesDir, artifact);
  if (!fs.existsSync(templateFile)) {
    // Fallback: try .hbs naming convention (artifact "CHANGE.md" → "change.hbs")
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
  // Skip if file already exists — callers should use clear=true to force overwrite
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    const existing = fs.readFileSync(dest, "utf8");
    if (!isSeedTemplate(existing)) return false;
    // Only overwrite seed templates if flag allows (prevent completePhase from stomping enriched content)
    if (!(vars as any).__forceOverwrite) return false;
  }

  const raw = fs.readFileSync(templateFile, "utf8");
  fs.writeFileSync(dest, renderTemplate(raw, vars), "utf8");
  return true;
}

/** init 时仅铺 change 阶段（+ 可选 CONTEXT，默认关）。 */
export function seedChangeTemplates(
  changeDir: string,
  templatesDir: string,
  vars: SeedVars,
  options?: SeedOptions,
): string[] {
  if (!fs.existsSync(templatesDir)) return [];

  const phaseIds = options?.phases ?? (["change"] as PhaseId[]);
  const seeded: string[] = [];

  for (const phaseId of phaseIds) {
    const phase = getPhase(phaseId);
    if (phase.kind !== "markdown") continue;
    if (seedArtifactFile(changeDir, templatesDir, phase.artifact, vars)) {
      seeded.push(phase.artifact);
    }
  }

  if (options?.includeContext) {
    if (seedArtifactFile(changeDir, templatesDir, "CONTEXT.md", vars)) {
      seeded.push("CONTEXT.md");
    }
  }

  return seeded;
}

/** Seed a minimal Zod JSON for schema-driven phases */
function seedZodJson(changeDir: string, phaseId: PhaseId): void {
  const jsonPath = path.join(changeDir, `${phaseId}.json`);
  if (fs.existsSync(jsonPath)) return;

  const seeds: Record<string, Record<string, unknown>> = {
    change: { title: "{{title}}", motivation: "", scope: { includes: [] }, success_criteria: [] },
    requirement: { title: "{{title}}", features: [], acceptance_criteria: [] },
    design: { title: "{{title}}", options: [], decision: { chosen: "", reason: "" } },
    "ui-design": { title: "{{title}}", scope: "" },
    task: { title: "{{title}}", slices: [] },
    test: { title: "{{title}}", test_plan: [] },
    review: { title: "{{title}}", verdict: "commented" },
    integration: { title: "{{title}}", changelog_entries: [] },
  };

  const seedJson = seeds[phaseId];
  if (seedJson) fs.writeFileSync(jsonPath, JSON.stringify(seedJson, null, 2));
}

/** complete 过关后为下一阶段铺模板（若文件尚不存在）。 */
export function seedPhaseTemplate(
  changeDir: string,
  templatesDir: string,
  phaseId: PhaseId,
  vars: SeedVars,
): string | null {
  if (!fs.existsSync(templatesDir)) return null;
  const phase = getPhase(phaseId);
  if (phase.kind !== "markdown") return null;

  // Seed Zod JSON for schema-driven phases
  if (ZOD_PHASES.includes(phaseId)) {
    seedZodJson(changeDir, phaseId);
  }

  return seedArtifactFile(changeDir, templatesDir, phase.artifact, vars)
    ? phase.artifact
    : null;
}

/** @deprecated 仅测试/迁移：铺全部阶段模板（勿用于生产 init）。 */
export function seedAllPhaseTemplates(
  changeDir: string,
  templatesDir: string,
  vars: SeedVars,
): string[] {
  return seedChangeTemplates(changeDir, templatesDir, vars, {
    phases: listPhases()
      .filter((p) => p.kind === "markdown")
      .map((p) => p.id),
    includeContext: false,
  });
}
