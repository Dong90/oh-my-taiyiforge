/**
 * loader.ts — 从 change 目录或 fixtures 加载 phase JSON，提取实体为 GraphNode。
 * v2: 策略模式替代巨型 switch，按阶段注册 Extractor。
 */
import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "../types.js";
import type { GraphNode, NodeKind } from "./types.js";
import { tryRepairJson } from "../json-repair.js";
import { safeObjectArray, safeRecord, safeString } from "../type-guards.js";
import { getDefaultExtractorRegistry, type ExtractorContext } from "../extractor-registry.js";

const PHASES_WITH_JSON: PhaseId[] = [
  "change", "requirement", "design", "ui-design",
  "task", "test", "review", "integration",
];

export function loadPhaseJsons(changeDir: string): Map<PhaseId, Record<string, unknown>> {
  const result = new Map<PhaseId, Record<string, unknown>>();
  const errors: string[] = [];
  for (const phase of PHASES_WITH_JSON) {
    const jsonPath = path.join(changeDir, `${phase}.json`);
      try {
        const raw = fs.readFileSync(jsonPath, "utf8");
        const repair = tryRepairJson(raw);
        if (!repair.ok) {
          errors.push(`Unrepairable JSON in ${phase}.json: ${repair.error}`);
          continue;
        }
        result.set(phase, JSON.parse(repair.repaired!));
      } catch (e: unknown) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue;
      const msg = e instanceof SyntaxError
        ? `Malformed JSON in ${phase}.json: ${e.message}`
        : `Failed to read ${phase}.json: ${e instanceof Error ? e.message : String(e)}`;
      errors.push(msg);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Phase JSON load errors:\n${errors.join("\n")}`);
  }
  return result;
}
// ── 策略模式：Extractor 注册表 ──

type ExtractContext = {
  addItems(arr: (Record<string, unknown> | string)[] | undefined, kind: NodeKind, labelKey?: string): void;
  addScalar(key: string, kind: NodeKind, val: unknown): void;
  extractString(data: Record<string, unknown>, ...keys: string[]): string;
  phaseStr: string;
  idx: number;
};

type PhaseExtractor = (data: Record<string, unknown>, ctx: ExtractContext) => GraphNode[];

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

// ── Per-phase extractors ──

const extractChange: PhaseExtractor = (data, ctx) => {
  ctx.addItems(safeObjectArray(data.risks), "risk", "risk");
  ctx.addItems(safeObjectArray(data.success_criteria), "acceptance_criterion", "description");
  ctx.addItems(safeObjectArray(data.impact_map), "unknown", "module");
  if (safeString(data.rollback_trigger)) ctx.addScalar("rollback_trigger", "rollback", data.rollback_trigger);
  ctx.addItems(safeObjectArray(data.rollout_steps), "deployment_step");
  return [];
};

const extractRequirement: PhaseExtractor = (data, ctx) => {
  ctx.addItems(safeObjectArray(data.acceptance_criteria), "acceptance_criterion", "description");
  ctx.addItems(safeObjectArray(data.error_rescue_map), "unknown", "error");
  const nf = safeRecord(data.non_functional);
  if (nf) {
    ctx.addItems(safeObjectArray(nf.security), "nfr", "description");
    ctx.addItems(safeObjectArray(nf.performance), "nfr", "description");
    ctx.addItems(safeObjectArray(nf.availability), "nfr", "description");
  }
  if (Array.isArray(data.functional_requirements)) {
    for (const mod of (data.functional_requirements as Record<string, unknown>[])) {
      ctx.addItems(safeObjectArray(mod.items), "unknown", "description");
    }
  }
  ctx.addItems(safeObjectArray(data.shadow_paths), "unknown", "flow");
  ctx.addItems(safeObjectArray(data.non_happy_path_cases), "unknown", "scenario");
  return [];
};

const extractDesign: PhaseExtractor = (data, ctx) => {
  ctx.addItems(safeObjectArray(data.security_threats), "threat", "threat");
  ctx.addItems(safeObjectArray(data.blast_radius), "risk", "decision");
  ctx.addItems(safeObjectArray(data.tradeoffs), "design_decision", "point");
  ctx.addItems(safeObjectArray(data.modules), "unknown", "name");
  ctx.addItems(safeObjectArray(data.rollout_steps), "deployment_step");
  if (safeString(data.rollback_trigger)) ctx.addScalar("rollback_trigger", "rollback", data.rollback_trigger);
  if (data.decision && typeof data.decision === "object") {
    const d = data.decision as Record<string, unknown>;
    return [{
      id: mkId(ctx.phaseStr, "design_decision", ctx.idx),
      phase: "design" as PhaseId,
      kind: "design_decision",
      label: ctx.extractString(d, "chosen", "reason"),
      data: d,
    }];
  }
  return [];
};

const extractUiDesign: PhaseExtractor = (data, ctx) => {
  if (typeof data.scope === "string") ctx.addScalar("scope", "design_decision", data.scope);
  ctx.addItems(safeObjectArray(data.states), "unknown", "name");
  ctx.addItems(safeObjectArray(data.accessibility), "unknown");
  return [];
};

const extractTask: PhaseExtractor = (data, ctx) => {
  ctx.addItems(safeObjectArray(data.slices), "slice", "label");
  ctx.addItems(safeObjectArray(data.slice_risks), "risk", "risk");
  ctx.addItems(safeObjectArray(data.slice_rollbacks), "rollback", "rollback");
  ctx.addItems(safeObjectArray(data.waves), "unknown", "name");
  return [];
};

const extractTest: PhaseExtractor = (data, ctx) => {
  ctx.addItems(safeObjectArray(data.test_plan), "test_case", "description");
  ctx.addItems(safeObjectArray(data.security_checks), "test_case");
  ctx.addItems(safeObjectArray(data.edge_cases), "test_case", "scenario");
  ctx.addItems(safeObjectArray(data.performance_tests), "test_case", "scenario");
  ctx.addItems(safeObjectArray(data.regression_items), "test_case", "item");
  return [];
};

const extractReview: PhaseExtractor = (data, ctx) => {
  ctx.addItems(safeObjectArray(data.findings), "unknown", "description");
  ctx.addItems(safeObjectArray(data.security_audit), "test_case");
  ctx.addItems(safeObjectArray(data.code_quality), "unknown", "dimension");
  ctx.addItems(safeObjectArray(data.test_coverage), "test_case", "layer");
  ctx.addItems(safeObjectArray(data.performance_audit), "unknown", "item");
  return [];
};

const extractIntegration: PhaseExtractor = (data, ctx) => {
  ctx.addItems(safeObjectArray(data.changelog_entries), "unknown", "description");
  ctx.addItems(safeObjectArray(data.monitoring), "monitoring_metric", "metric");
  ctx.addItems(safeObjectArray(data.alerts), "monitoring_metric", "alert");
  if (safeString(data.rollback_trigger)) ctx.addScalar("rollback_trigger", "rollback", data.rollback_trigger);
  return [];
};

/** @deprecated Use ExtractorRegistry (src/core/extractor-registry.ts) instead.
 *  This Map is retained for backward compat — registerExtractor delegates to
 *  the default registry. Will be removed in v1.1. */
const EXTRACTORS = new Map<PhaseId, PhaseExtractor>([
  ["change", extractChange],
  ["requirement", extractRequirement],
  ["design", extractDesign],
  ["ui-design", extractUiDesign],
  ["task", extractTask],
  ["test", extractTest],
  ["review", extractReview],
  ["integration", extractIntegration],
]);

/** @deprecated Use registerExtractor from src/core/extractor-registry.ts instead. */
export function registerExtractor(phase: PhaseId, extractor: PhaseExtractor): void {
  EXTRACTORS.set(phase, extractor);
}

/** Extract GraphNode entities from a single phase's JSON data using the
 *  default ExtractorRegistry. Backward compatible: existing callers see
 *  identical behavior. */
export function extractNodesFromPhase(phase: PhaseId, data: Record<string, unknown>): GraphNode[] {
  if (!data || typeof data !== "object") return [];
  const registry = getDefaultExtractorRegistry();
  registry.ensureBuiltins();
  const extractors = registry.listByPhase(phase);
  if (extractors.length === 0) return [];

  const nodes: GraphNode[] = [];
  // Build a context for each extractor. Since each extractor has its own idx counter,
  // we instantiate a fresh ctx per extractor. To keep IDs unique, we use a global offset.
  for (const ext of extractors) {
    let localIdx = 0;
    const ctx: ExtractorContext = {
      addItems(arr, kind, labelKey) {
        if (!Array.isArray(arr)) return;
        for (const item of arr) {
          const isString = typeof item === "string";
          const label = isString
            ? item
            : labelKey
              ? extractString(item as Record<string, unknown>, labelKey, "id", "description", "name", "scenario", "error", "threat", "risk", "metric")
              : extractString(item as Record<string, unknown>, "id", "description", "name", "scenario", "error", "threat", "risk", "metric");
          nodes.push({
            id: mkId(String(phase), kind, localIdx),
            phase,
            kind,
            label: label || String(localIdx),
            data: isString ? { value: item } : (item as unknown as Record<string, unknown>),
          });
          localIdx++;
        }
      },
      addScalar(key, kind, val) {
        if (typeof val !== "string" || val.length === 0) return;
        nodes.push({
          id: mkId(String(phase), kind, localIdx),
          phase,
          kind,
          label: val,
          data: { [key]: val },
        });
        localIdx++;
      },
      extractString: (d, ...keys) => extractString(d, ...keys),
      phaseStr: String(phase),
      get idx() {
        return localIdx;
      },
    };
    const subNodes = ext.extract(data, ctx);
    for (const sn of subNodes) {
      nodes.push(sn);
      localIdx++;
    }
  }
  return nodes;
}
