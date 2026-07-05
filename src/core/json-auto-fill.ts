import type { PhaseId } from "./types.js";
import { buildSeedJson } from "./artifact-seed.js";

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...source };
  for (const key of Object.keys(target)) {
    if (!(key in result) || result[key] === undefined || result[key] === null) {
      result[key] = target[key];
    } else if (
      typeof target[key] === "object" &&
      target[key] !== null &&
      !Array.isArray(target[key]) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        result[key] as Record<string, unknown>,
      );
    }
    // arrays and primitives: user value wins, no merge
  }
  return result;
}

/**
 * Take user-provided JSON and fill in missing fields from the phase's seed defaults.
 * Returns a new object with all template-required fields present.
 * User values always take precedence over defaults.
 */
export function autoFillJson(
  phaseId: PhaseId,
  userJson: Record<string, unknown>,
  slug: string,
  complexity?: { level: string; score: number },
): Record<string, unknown> {
  const title = typeof userJson.title === "string" && userJson.title.length > 0
    ? userJson.title
    : slug.replace(/-/g, " ");
  const seed = buildSeedJson(phaseId, { slug, title, complexity });
  return deepMerge(seed, userJson);
}
