import type { QualityScores } from "../types.js";

export const QUALITY_DIMENSIONS = [
  { id: "completeness", label: "完整性" },
  { id: "consistency", label: "一致性" },
  { id: "verifiability", label: "可验证性" },
  { id: "traceability", label: "可追溯性" },
  { id: "engineering_quality", label: "工程质量" },
] as const;

type DimensionId = (typeof QUALITY_DIMENSIONS)[number]["id"];

export function evaluateQualityGate(scores: QualityScores): {
  passed: boolean;
  failed: DimensionId[];
} {
  const failed = QUALITY_DIMENSIONS.filter((d) => !scores[d.id]).map(
    (d) => d.id,
  );
  return { passed: failed.length === 0, failed };
}
