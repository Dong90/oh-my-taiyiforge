import type { QualityScores } from "../types.js";
import { loadQualityDimensionsFromYaml } from "../load-quality-gate-yaml.js";

export const QUALITY_DIMENSIONS = loadQualityDimensionsFromYaml(import.meta.url);

type DimensionId = (typeof QUALITY_DIMENSIONS)[number]["id"];

export function evaluateQualityGate(scores: QualityScores): {
  passed: boolean;
  failed: DimensionId[];
} {
  const failed = QUALITY_DIMENSIONS.filter((d) => !scores[d.id as keyof QualityScores]).map(
    (d) => d.id as DimensionId,
  );
  return { passed: failed.length === 0, failed };
}
