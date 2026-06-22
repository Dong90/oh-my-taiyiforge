/**
 * loader.ts — 从 change 目录或 fixtures 加载 phase JSON，提取实体为 GraphNode。
 */
import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "../types.js";
import type { GraphNode, NodeKind } from "./types.js";

const PHASES_WITH_JSON: PhaseId[] = [
  "change", "requirement", "design", "ui-design",
  "task", "test", "review", "integration",
];

export function loadPhaseJsons(changeDir: string): Map<PhaseId, Record<string, unknown>> {
  const result = new Map<PhaseId, Record<string, unknown>>();
  for (const phase of PHASES_WITH_JSON) {
    const jsonPath = path.join(changeDir, `${phase}.json`);
    try {
      const raw = fs.readFileSync(jsonPath, "utf8");
      result.set(phase, JSON.parse(raw));
    } catch { /* skip missing files */ }
  }
  return result;
}

function mkId(phase: string, kind: string, idx: number): string {
  return `${phase}-${kind}-${idx}`;
}

function extractString(data: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

export function extractNodesFromPhase(phase: PhaseId, data: Record<string, unknown>): GraphNode[] {
  if (!data || typeof data !== "object") return [];
  const nodes: GraphNode[] = [];
  const phaseStr = String(phase);
  let idx = 0;

  const addItems = (
    arr: (Record<string, unknown> | string)[] | undefined,
    kind: NodeKind,
    labelKey?: string,
  ) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      // Handle both object arrays and string arrays
      const isString = typeof item === "string";
      const label = isString
        ? item
        : labelKey
          ? extractString(item as Record<string, unknown>, labelKey, "id", "description", "name", "scenario", "error", "threat", "risk", "metric")
          : extractString(item as Record<string, unknown>, "id", "description", "name", "scenario", "error", "threat", "risk", "metric");
      nodes.push({
        id: mkId(phaseStr, kind, idx),
        phase: phase as PhaseId,
        kind,
        label: label || String(idx),
        data: isString ? { value: item } : (item as unknown as Record<string, unknown>),
      });
      idx++;
    }
  };

  const addScalar = (key: string, kind: NodeKind, val: unknown) => {
    if (typeof val !== "string" || val.length === 0) return;
    nodes.push({
      id: mkId(phaseStr, kind, idx),
      phase: phase as PhaseId,
      kind,
      label: val,
      data: { [key]: val },
    });
    idx++;
  };

  // ── phase-specific extraction ──
  switch (phase) {
    case "change": {
      addItems(data.risks as Array<Record<string, unknown>> | undefined, "risk", "risk");
      addItems(data.success_criteria as Array<Record<string, unknown>> | undefined, "acceptance_criterion", "description");
      addItems(data.impact_map as Array<Record<string, unknown>> | undefined, "unknown", "module");
      if (typeof data.rollback_trigger === "string") addScalar("rollback_trigger", "rollback", data.rollback_trigger);
      addItems(data.rollout_steps as string[] | undefined, "deployment_step");
      break;
    }
    case "requirement": {
      addItems(data.acceptance_criteria as Array<Record<string, unknown>> | undefined, "acceptance_criterion", "description");
      addItems(data.error_rescue_map as Array<Record<string, unknown>> | undefined, "unknown", "error");
      const nf = data.non_functional as Record<string, unknown> | undefined;
      if (nf) {
        addItems(nf.security as Array<Record<string, unknown>> | undefined, "nfr", "description");
        addItems(nf.performance as Array<Record<string, unknown>> | undefined, "nfr", "description");
        addItems(nf.availability as Array<Record<string, unknown>> | undefined, "nfr", "description");
      }
      if (Array.isArray(data.functional_requirements)) {
        for (const mod of data.functional_requirements as Array<Record<string, unknown>>) {
          addItems(mod.items as Array<Record<string, unknown>> | undefined, "unknown", "description");
        }
      }
      addItems(data.shadow_paths as Array<Record<string, unknown>> | undefined, "unknown", "flow");
      addItems(data.non_happy_path_cases as Array<Record<string, unknown>> | undefined, "unknown", "scenario");
      break;
    }
    case "design": {
      addItems(data.security_threats as Array<Record<string, unknown>> | undefined, "threat", "threat");
      addItems(data.blast_radius as Array<Record<string, unknown>> | undefined, "risk", "decision");
      addItems(data.tradeoffs as Array<Record<string, unknown>> | undefined, "design_decision", "point");
      addItems(data.modules as Array<Record<string, unknown>> | undefined, "unknown", "name");
      addItems(data.rollout_steps as string[] | undefined, "deployment_step");
      if (typeof data.rollback_trigger === "string") addScalar("rollback_trigger", "rollback", data.rollback_trigger);
      if (data.decision && typeof data.decision === "object") {
        const d = data.decision as Record<string, unknown>;
        nodes.push({
          id: mkId(phaseStr, "design_decision", idx),
          phase: phase as PhaseId,
          kind: "design_decision",
          label: extractString(d, "chosen", "reason"),
          data: d,
        });
        idx++;
      }
      break;
    }
    case "ui-design": {
      if (typeof data.scope === "string") addScalar("scope", "design_decision", data.scope);
      addItems(data.states as Array<Record<string, unknown>> | undefined, "unknown", "name");
      addItems(data.accessibility as string[] | undefined, "unknown");
      break;
    }
    case "task": {
      addItems(data.slices as Array<Record<string, unknown>> | undefined, "slice", "label");
      addItems(data.slice_risks as Array<Record<string, unknown>> | undefined, "risk", "risk");
      addItems(data.slice_rollbacks as Array<Record<string, unknown>> | undefined, "rollback", "rollback");
      addItems(data.waves as Array<Record<string, unknown>> | undefined, "unknown", "name");
      break;
    }
    case "test": {
      addItems(data.test_plan as Array<Record<string, unknown>> | undefined, "test_case", "description");
      addItems(data.security_checks as string[] | undefined, "test_case");
      addItems(data.edge_cases as Array<Record<string, unknown>> | undefined, "test_case", "scenario");
      addItems(data.performance_tests as Array<Record<string, unknown>> | undefined, "test_case", "scenario");
      addItems(data.regression_items as Array<Record<string, unknown>> | undefined, "test_case", "item");
      break;
    }
    case "review": {
      addItems(data.findings as Array<Record<string, unknown>> | undefined, "unknown", "description");
      addItems(data.security_audit as string[] | undefined, "test_case");
      addItems(data.code_quality as Array<Record<string, unknown>> | undefined, "unknown", "dimension");
      addItems(data.test_coverage as Array<Record<string, unknown>> | undefined, "test_case", "layer");
      addItems(data.performance_audit as Array<Record<string, unknown>> | undefined, "unknown", "item");
      break;
    }
    case "integration": {
      addItems(data.changelog_entries as Array<Record<string, unknown>> | undefined, "unknown", "description");
      addItems(data.monitoring as Array<Record<string, unknown>> | undefined, "monitoring_metric", "metric");
      addItems(data.alerts as Array<Record<string, unknown>> | undefined, "monitoring_metric", "alert");
      if (typeof data.rollback_trigger === "string") addScalar("rollback_trigger", "rollback", data.rollback_trigger);
      break;
    }
    default:
      break;
  }

  return nodes;
}
