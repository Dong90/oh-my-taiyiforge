import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { ZOD_PHASES, ZOD_SCHEMAS } from "./artifact-validator.js";
import { getPhase } from "./phase-registry.js";
import { resolveHbsTemplatesDir } from "./package-root.js";
import { renderPhaseMarkdown, writeRenderSnapshot } from "./artifact-seed.js";

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

  if (options?.validate !== false) {
    try {
      ZOD_SCHEMAS[phaseId as Exclude<PhaseId, "dev">].parse(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: `[Zod] ${phaseId}.json: ${msg}` };
    }
  }

  const slug = options?.slug ?? path.basename(changeDir);
  const title =
    typeof data.title === "string" ? data.title : slug.replace(/-/g, " ");

  const markdown = renderPhaseMarkdown(phaseId, data, hbsDir, { slug, title }, {
    wrapSeed: false,
  });
  const phase = getPhase(phaseId);
  fs.writeFileSync(path.join(changeDir, phase.artifact), markdown, "utf8");
  writeRenderSnapshot(changeDir, phaseId, markdown);

  return { ok: true, artifact: phase.artifact, phaseId };
}
