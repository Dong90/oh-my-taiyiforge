import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { ZOD_PHASES, ZOD_SCHEMAS } from "./artifact-validator.js";
import { getPhase } from "./phase-registry.js";
import { resolveHbsTemplatesDir } from "./package-root.js";
import { renderPhaseMarkdown, writeRenderSnapshot } from "./artifact-seed.js";
import { isSeedTemplate } from "./seed-marker.js";
import { autoFillJson } from "./json-auto-fill.js";

export type ForceRenderResult =
  | { ok: true; artifact: string; phaseId: PhaseId }
  | { ok: false; error: string };

/**
 * Explicit json → md render (drops seed marker). Used by `taiyi render`.
 */
export function forceRenderPhaseFromJson(
  changeDir: string,
  phaseId: PhaseId,
  hbsTemplatesDir?: string,
  options?: { slug?: string; validate?: boolean },
): ForceRenderResult {
  if (!ZOD_PHASES.includes(phaseId)) {
    return { ok: false, error: `Phase "${phaseId}" has no Zod json view` };
  }

  const hbsDir = hbsTemplatesDir ?? resolveHbsTemplatesDir(import.meta.url);
  const jsonPath = path.join(changeDir, `${phaseId}.json`);
  if (!fs.existsSync(jsonPath)) {
    return { ok: false, error: `Missing ${phaseId}.json` };
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<string, unknown>;
  } catch {
    return { ok: false, error: `Invalid JSON: ${phaseId}.json` };
  }

  const slug = options?.slug ?? path.basename(changeDir);

  // Read complexity from state.json so autoFill can seed the right fields
  let complexity: { level: string; score: number } | undefined;
  try {
    const statePath = path.join(changeDir, "state.json");
    const raw = JSON.parse(fs.readFileSync(statePath, "utf8"));
    if (raw.complexity?.level && typeof raw.complexity.score === "number") {
      complexity = raw.complexity;
    }
  } catch { /* state.json may not exist yet — fine */ }

  if (options?.validate !== false) {
    // Auto-fill missing fields from schema defaults before validation.
    // This ensures templates never encounter missing fields, eliminating
    // [xxx] / _xxx_ placeholder generation at the source.
    const filled = autoFillJson(phaseId, data as Record<string, unknown>, slug, complexity);
    try {
      ZOD_SCHEMAS[phaseId as Exclude<PhaseId, "dev">].parse(filled);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: `[Zod] ${phaseId}.json: ${msg}` };
    }
    data = filled;
  }

  const title =
    typeof data.title === "string" ? data.title : slug.replace(/-/g, " ");

  const markdown = renderPhaseMarkdown(phaseId, data, hbsDir, { slug, title }, {
    wrapSeed: false,
  });
  const phase = getPhase(phaseId);
  const mdPath = path.join(changeDir, phase.artifact);

  // 如果 md 已被人工编辑过（非 seed），覆盖前提示 json 才是真源
  if (fs.existsSync(mdPath) && !isSeedTemplate(fs.readFileSync(mdPath, "utf8"))) {
    console.warn(`⚠ render 将覆盖已编辑的 ${phase.artifact}（数据真源为 ${phaseId}.json，请先改 json 再 render）`);
  }

  fs.writeFileSync(mdPath, markdown, "utf8");
  writeRenderSnapshot(changeDir, phaseId, markdown);

  return { ok: true, artifact: phase.artifact, phaseId };
}
