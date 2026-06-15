import fs from "node:fs";
import path from "node:path";
import { parseYamlListBlocks } from "./yaml-list-parse.js";
import { resolvePackageRoot } from "./package-root.js";

export type QualityDimensionDef = { id: string; label: string };

export const FALLBACK_QUALITY_DIMENSIONS: QualityDimensionDef[] = [
  { id: "completeness", label: "完整性" },
  { id: "consistency", label: "一致性" },
  { id: "verifiability", label: "可验证性" },
  { id: "traceability", label: "可追溯性" },
  { id: "engineering_quality", label: "工程质量" },
];

export function loadQualityDimensionsFromYaml(fromModuleUrl: string): QualityDimensionDef[] {
  const yamlPath = path.join(resolvePackageRoot(fromModuleUrl), "docs", "taiyi", "quality-gate.yaml");
  if (!fs.existsSync(yamlPath)) return FALLBACK_QUALITY_DIMENSIONS;

  const raw = parseYamlListBlocks(fs.readFileSync(yamlPath, "utf8"), "dimensions");
  if (raw.length === 0) return FALLBACK_QUALITY_DIMENSIONS;

  return raw.map((row) => ({
    id: String(row.id),
    label: String(row.label),
  }));
}
