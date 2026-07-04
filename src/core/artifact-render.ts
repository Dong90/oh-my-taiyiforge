import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { ZOD_PHASES, ZOD_SCHEMAS } from "./artifact-validator.js";
import { getPhase } from "./phase-registry.js";
import { resolveHbsTemplatesDir } from "./package-root.js";
import { renderPhaseMarkdown, writeRenderSnapshot } from "./artifact-seed.js";
import { isSeedTemplate } from "./seed-marker.js";

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
  const mdPath = path.join(changeDir, phase.artifact);

  // 如果 md 已被人工编辑过（非 seed），覆盖前提示 json 才是真源
  if (fs.existsSync(mdPath) && !isSeedTemplate(fs.readFileSync(mdPath, "utf8"))) {
    console.warn(`⚠ render 将覆盖已编辑的 ${phase.artifact}（数据真源为 ${phaseId}.json，请先改 json 再 render）`);
  }

  fs.writeFileSync(mdPath, markdown, "utf8");
  writeRenderSnapshot(changeDir, phaseId, markdown);

  return { ok: true, artifact: phase.artifact, phaseId };
}
