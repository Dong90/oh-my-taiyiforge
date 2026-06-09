import fs from "node:fs";
import path from "node:path";
import { parseYamlListBlocks } from "./yaml-list-parse.js";
import { resolvePackageRoot } from "./package-root.js";
import type { PhaseDefinition, PhaseId } from "./types.js";

/** 无 YAML 时的兜底（与 docs/taiyi/phases.yaml 同构） */
export const FALLBACK_PHASES: PhaseDefinition[] = [
  { id: "change", order: 1, skill: "taiyi-change", artifact: "CHANGE.md", kind: "markdown", requires: [] },
  { id: "requirement", order: 2, skill: "taiyi-requirement", artifact: "REQUIREMENT.md", kind: "markdown", requires: ["change"] },
  { id: "design", order: 3, skill: "taiyi-design", artifact: "DESIGN.md", kind: "markdown", requires: ["requirement"] },
  { id: "ui-design", order: 4, skill: "taiyi-ui-design", artifact: "UI-DESIGN.md", kind: "markdown", requires: ["design"] },
  { id: "task", order: 5, skill: "taiyi-task", artifact: "TASK.md", kind: "markdown", requires: ["ui-design"] },
  { id: "dev", order: 6, skill: "taiyi-dev", artifact: "dev.bundle", kind: "code", requires: ["task"] },
  { id: "test", order: 7, skill: "taiyi-test", artifact: "TEST.md", kind: "markdown", requires: ["dev"] },
  { id: "review", order: 8, skill: "taiyi-review", artifact: "REVIEW.md", kind: "markdown", requires: ["test"] },
  { id: "integration", order: 9, skill: "taiyi-integration", artifact: "CHANGELOG.md", kind: "markdown", requires: ["review"] },
];

export function loadPhasesFromYaml(fromModuleUrl: string): PhaseDefinition[] {
  const yamlPath = path.join(resolvePackageRoot(fromModuleUrl), "docs", "taiyi", "phases.yaml");
  if (!fs.existsSync(yamlPath)) return FALLBACK_PHASES;

  const raw = parseYamlListBlocks(fs.readFileSync(yamlPath, "utf8"), "phases");
  if (raw.length === 0) return FALLBACK_PHASES;

  return raw.map((row) => ({
    id: String(row.id) as PhaseId,
    order: Number(row.order),
    skill: String(row.skill),
    artifact: String(row.artifact),
    kind: (row.kind === "code" ? "code" : "markdown") as PhaseDefinition["kind"],
    requires: (Array.isArray(row.requires) ? row.requires : []) as PhaseId[],
  }));
}
