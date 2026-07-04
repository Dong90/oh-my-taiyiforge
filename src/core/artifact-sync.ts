import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { ZOD_PHASES } from "./artifact-validator.js";
import { getPhase } from "./phase-registry.js";
import { isSeedTemplate } from "./seed-marker.js";
import {
  renderPhaseMarkdown,
  writeRenderSnapshot,
} from "./artifact-seed.js";
import { getHash } from "./state-manager.js";

export type JsonSyncResult = {
  rendered: boolean;
  reason?: string;
};

function resolveVars(
  changeDir: string,
  data: Record<string, unknown>,
  vars?: { slug: string; title?: string },
): { slug: string; title: string } {
  const slug =
    vars?.slug ??
    (typeof data.slug === "string" ? data.slug : path.basename(changeDir));
  const title =
    vars?.title ??
    (typeof data.title === "string" ? data.title : slug.replace(/-/g, " "));
  return { slug, title };
}

/**
 * Re-render MD from JSON when:
 * - MD missing, or still seed template, or
 * - MD unchanged since last render (hash matches snapshot) but JSON changed.
 */
export function syncMarkdownFromJsonIfStale(
  phaseId: PhaseId,
  changeDir: string,
  hbsTemplatesDir: string,
  vars?: { slug: string; title?: string },
): JsonSyncResult {
  if (!ZOD_PHASES.includes(phaseId)) {
    return { rendered: false, reason: "not-zod-phase" };
  }

  const phase = getPhase(phaseId);
  const jsonPath = path.join(changeDir, `${phaseId}.json`);
  const mdPath = path.join(changeDir, phase.artifact);
  const hbsPath = path.join(hbsTemplatesDir, `${phaseId}.hbs`);
  const hashPath = path.join(changeDir, ".taiyi", "snapshots", `${phaseId}.hash`);

  if (!fs.existsSync(jsonPath) || !fs.existsSync(hbsPath)) {
    return { rendered: false, reason: "missing-json-or-hbs" };
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<string, unknown>;
  } catch {
    return { rendered: false, reason: "invalid-json" };
  }

  const v = resolveVars(changeDir, data, vars);
  const candidateMd = renderPhaseMarkdown(phaseId, data, hbsTemplatesDir, v, {
    wrapSeed: false,
  });
  const candidateHash = getHash(candidateMd);

  const mdExists = fs.existsSync(mdPath);
  const currentMd = mdExists ? fs.readFileSync(mdPath, "utf8") : "";
  const currentHash = getHash(currentMd);
  const savedHash = fs.existsSync(hashPath) ? fs.readFileSync(hashPath, "utf8").trim() : "";

  const shouldRender =
    !mdExists ||
    isSeedTemplate(currentMd) ||
    (savedHash.length > 0 &&
      currentHash === savedHash &&
      candidateHash !== savedHash);

  if (!shouldRender) {
    return { rendered: false, reason: "md-up-to-date-or-human-edited" };
  }

  const wrapSeed = !mdExists || isSeedTemplate(currentMd);
  const markdown = renderPhaseMarkdown(phaseId, data, hbsTemplatesDir, v, {
    wrapSeed,
  });
  fs.writeFileSync(mdPath, markdown, "utf8");
  writeRenderSnapshot(changeDir, phaseId, markdown);

  return { rendered: true, reason: "json-changed-since-last-render" };
}
