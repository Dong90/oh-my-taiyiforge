import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { ZOD_PHASES } from "./artifact-validator.js";
import { getTemplateEngine, type SeedVars } from "./template-engine.js";
import { isSeedTemplate, wrapSeedTemplate } from "./seed-marker.js";
import { getHash } from "./state-manager.js";
import { getPhase } from "./phase-registry.js";

function resolveTitle(vars: SeedVars): string {
  return vars.title ?? vars.slug.replace(/-/g, " ");
}

/** Zod-valid minimal seed JSON per phase (semantic source of truth). */
export function buildSeedJson(
  phaseId: PhaseId,
  vars: SeedVars,
): Record<string, unknown> {
  const title = resolveTitle(vars);

  switch (phaseId) {
    case "change":
      return {
        title,
        motivation: vars.motivation ?? "",
        scope: { includes: [], excludes: [] },
        success_criteria: [
          { id: "SC-01", description: "待填写", is_checked: false },
        ],
      };
    case "requirement":
      return {
        title,
        user_stories: [
          { as_a: "待填写", i_want: "待填写", so_that: "待填写" },
        ],
        acceptance_criteria: [
          { id: "AC-01", description: "待填写", is_checked: false },
        ],
      };
    case "design":
      return {
        title,
        options: [
          { id: "A", name: "Option A", pros: [], cons: [] },
          { id: "B", name: "Option B", pros: [], cons: [] },
        ],
        decision: { chosen: "A", reason: "待填写" },
        current_state: "",
        data_model: "",
        api_changes: "",
        key_flow: "",
      };
    case "ui-design":
      return {
        title,
        scope: "待填写",
      };
    case "task":
      return {
        title,
        slices: [{ id: "S-01", description: "待填写" }],
      };
    case "test":
      return {
        title,
        test_plan: [{ id: "T-01", description: "待填写", status: "pending" }],
      };
    case "review":
      return {
        title,
        verdict: "commented",
        overall_score: "",
      };
    case "integration":
      return {
        title,
        changelog_entries: [{ type: "chore", description: "待填写" }],
      };
    default:
      return { title };
  }
}

export function renderPhaseMarkdown(
  phaseId: PhaseId,
  data: Record<string, unknown>,
  hbsTemplatesDir: string,
  vars: SeedVars,
  options?: { wrapSeed?: boolean },
): string {
  const tplPath = path.join(hbsTemplatesDir, `${phaseId}.hbs`);
  if (!fs.existsSync(tplPath)) {
    throw new Error(`Handlebars template not found for phase "${phaseId}": ${tplPath}`);
  }
  const raw = fs.readFileSync(tplPath, "utf8");
  const rendered = getTemplateEngine().render(raw, {
    ...vars,
    ...data,
    slug: vars.slug,
    title: (data.title as string | undefined) ?? resolveTitle(vars),
  });
  return options?.wrapSeed === false ? rendered : wrapSeedTemplate(rendered);
}

export function writeRenderSnapshot(
  changeDir: string,
  phaseId: PhaseId,
  markdown: string,
): void {
  const snapshotDir = path.join(changeDir, ".taiyi", "snapshots");
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.writeFileSync(path.join(snapshotDir, `${phaseId}.hash`), getHash(markdown));
}

export type SeedPhaseArtifactsResult = {
  json: string;
  markdown: string;
};

/**
 * Seed Zod JSON + render Markdown view from hbs (canonical path).
 * Returns null if artifact already exists and is not a seed template.
 */
export function seedPhaseArtifacts(
  changeDir: string,
  hbsTemplatesDir: string,
  phaseId: PhaseId,
  vars: SeedVars,
): SeedPhaseArtifactsResult | null {
  if (!ZOD_PHASES.includes(phaseId)) return null;

  const phase = getPhase(phaseId);
  const mdPath = path.join(changeDir, phase.artifact);
  const jsonFile = `${phaseId}.json`;
  const jsonPath = path.join(changeDir, jsonFile);

  if (fs.existsSync(mdPath) && fs.statSync(mdPath).size > 0) {
    const existing = fs.readFileSync(mdPath, "utf8");
    if (!isSeedTemplate(existing)) return null;
    if (!(vars as SeedVars & { __forceOverwrite?: boolean }).__forceOverwrite) {
      return null;
    }
  }

  const seedJson = buildSeedJson(phaseId, vars);
  fs.writeFileSync(jsonPath, JSON.stringify(seedJson, null, 2), "utf8");

  const markdown = renderPhaseMarkdown(phaseId, seedJson, hbsTemplatesDir, vars);
  fs.writeFileSync(mdPath, markdown, "utf8");
  writeRenderSnapshot(changeDir, phaseId, markdown);

  return { json: jsonFile, markdown: phase.artifact };
}
