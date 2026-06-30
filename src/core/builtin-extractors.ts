import type { ExtractorDefinition } from "./extractor-registry.js";
import { safeObjectArray, safeString } from "./type-guards.js";
import type { GraphNode } from "./change-graph/types.js";

/** Helper to build ID like `${phase}-${kind}-${idx}` */
function mkId(phase: string, kind: string, idx: number): string {
  return `${phase}-${kind}-${idx}`;
}

function makeCtx(phase: string) {
  let idx = 0;
  const nodes: GraphNode[] = [];
  const ctx = {
    addItems(
      arr: (Record<string, unknown> | string)[] | undefined,
      kind: GraphNode["kind"],
      labelKey?: string,
    ) {
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        const isString = typeof item === "string";
        const label = isString
          ? item
          : labelKey
            ? (item as any)[labelKey] ?? String(idx)
            : (item as any).description ??
              (item as any).name ??
              (item as any).scenario ??
              (item as any).error ??
              (item as any).threat ??
              (item as any).risk ??
              (item as any).metric ??
              (item as any).decision ??
              (item as any).point ??
              (item as any).label ??
              (item as any).item ??
              (item as any).dimension ??
              (item as any).module ??
              (item as any).flow ??
              String(idx);
        nodes.push({
          id: mkId(phase, kind, idx),
          phase: phase as any,
          kind,
          label: typeof label === "string" ? label : String(idx),
          data: isString ? { value: item } : (item as Record<string, unknown>),
        });
        idx++;
      }
    },
    addScalar(key: string, kind: GraphNode["kind"], val: unknown) {
      if (typeof val !== "string" || val.length === 0) return;
      nodes.push({
        id: mkId(phase, kind, idx),
        phase: phase as any,
        kind,
        label: val,
        data: { [key]: val },
      });
      idx++;
    },
    extractString(data: Record<string, unknown>, ...keys: string[]): string {
      for (const k of keys) {
        const v = data[k];
        if (typeof v === "string" && v.length > 0) return v;
      }
      return "";
    },
    phaseStr: phase,
    get idx() {
      return idx;
    },
  };
  return { ctx, nodes, bump: () => idx };
}

/** 8 个内置 extractor —— port 自 src/core/change-graph/loader.ts */
export const BUILTIN_EXTRACTORS: ExtractorDefinition[] = [
  {
    phase: "change",
    name: "default",
    builtin: true,
    extract: (data, _ctx) => {
      const { ctx, nodes } = makeCtx("change");
      ctx.addItems(safeObjectArray(data.risks), "risk", "risk");
      ctx.addItems(safeObjectArray(data.success_criteria), "acceptance_criterion", "description");
      ctx.addItems(safeObjectArray(data.impact_map), "unknown", "module");
      if (safeString(data.rollback_trigger))
        ctx.addScalar("rollback_trigger", "rollback", data.rollback_trigger);
      ctx.addItems(safeObjectArray(data.rollout_steps), "deployment_step");
      return nodes;
    },
  },
  {
    phase: "requirement",
    name: "default",
    builtin: true,
    extract: (data, _ctx) => {
      const { ctx, nodes } = makeCtx("requirement");
      ctx.addItems(safeObjectArray(data.acceptance_criteria), "acceptance_criterion", "description");
      ctx.addItems(safeObjectArray(data.error_rescue_map), "unknown", "error");
      const nf = (data.non_functional ?? {}) as Record<string, unknown>;
      ctx.addItems(safeObjectArray(nf.security), "nfr", "description");
      ctx.addItems(safeObjectArray(nf.performance), "nfr", "description");
      ctx.addItems(safeObjectArray(nf.availability), "nfr", "description");
      if (Array.isArray(data.functional_requirements)) {
        for (const mod of data.functional_requirements as Record<string, unknown>[]) {
          ctx.addItems(safeObjectArray(mod.items), "unknown", "description");
        }
      }
      ctx.addItems(safeObjectArray(data.shadow_paths), "unknown", "flow");
      ctx.addItems(safeObjectArray(data.non_happy_path_cases), "unknown", "scenario");
      return nodes;
    },
  },
  {
    phase: "design",
    name: "default",
    builtin: true,
    extract: (data, ctx) => {
      const localCtx = makeCtx("design");
      localCtx.ctx.addItems(safeObjectArray(data.security_threats), "threat", "threat");
      localCtx.ctx.addItems(safeObjectArray(data.blast_radius), "risk", "decision");
      localCtx.ctx.addItems(safeObjectArray(data.tradeoffs), "design_decision", "point");
      localCtx.ctx.addItems(safeObjectArray(data.modules), "unknown", "name");
      localCtx.ctx.addItems(safeObjectArray(data.rollout_steps), "deployment_step");
      if (safeString(data.rollback_trigger))
        localCtx.ctx.addScalar("rollback_trigger", "rollback", data.rollback_trigger);
      if (data.decision && typeof data.decision === "object") {
        const d = data.decision as Record<string, unknown>;
        return [
          ...localCtx.nodes,
          {
            id: mkId("design", "design_decision", localCtx.bump()),
            phase: "design" as any,
            kind: "design_decision" as const,
            label: ctx.extractString(d, "chosen", "reason"),
            data: d,
          },
        ];
      }
      return localCtx.nodes;
    },
  },
  {
    phase: "ui-design",
    name: "default",
    builtin: true,
    extract: (data, _ctx) => {
      const { ctx, nodes } = makeCtx("ui-design");
      if (typeof data.scope === "string") ctx.addScalar("scope", "design_decision", data.scope);
      ctx.addItems(safeObjectArray(data.states), "unknown", "name");
      ctx.addItems(safeObjectArray(data.accessibility), "unknown");
      return nodes;
    },
  },
  {
    phase: "task",
    name: "default",
    builtin: true,
    extract: (data, _ctx) => {
      const { ctx, nodes } = makeCtx("task");
      ctx.addItems(safeObjectArray(data.slices), "slice", "label");
      ctx.addItems(safeObjectArray(data.slice_risks), "risk", "risk");
      ctx.addItems(safeObjectArray(data.slice_rollbacks), "rollback", "rollback");
      ctx.addItems(safeObjectArray(data.waves), "unknown", "name");
      return nodes;
    },
  },
  {
    phase: "test",
    name: "default",
    builtin: true,
    extract: (data, _ctx) => {
      const { ctx, nodes } = makeCtx("test");
      ctx.addItems(safeObjectArray(data.test_plan), "test_case", "description");
      ctx.addItems(safeObjectArray(data.security_checks), "test_case");
      ctx.addItems(safeObjectArray(data.edge_cases), "test_case", "scenario");
      ctx.addItems(safeObjectArray(data.performance_tests), "test_case", "scenario");
      ctx.addItems(safeObjectArray(data.regression_items), "test_case", "item");
      return nodes;
    },
  },
  {
    phase: "review",
    name: "default",
    builtin: true,
    extract: (data, _ctx) => {
      const { ctx, nodes } = makeCtx("review");
      ctx.addItems(safeObjectArray(data.findings), "unknown", "description");
      ctx.addItems(safeObjectArray(data.security_audit), "test_case");
      ctx.addItems(safeObjectArray(data.code_quality), "unknown", "dimension");
      ctx.addItems(safeObjectArray(data.test_coverage), "test_case", "layer");
      ctx.addItems(safeObjectArray(data.performance_audit), "unknown", "item");
      return nodes;
    },
  },
  {
    phase: "integration",
    name: "default",
    builtin: true,
    extract: (data, _ctx) => {
      const { ctx, nodes } = makeCtx("integration");
      ctx.addItems(safeObjectArray(data.changelog_entries), "unknown", "description");
      ctx.addItems(safeObjectArray(data.monitoring), "monitoring_metric", "metric");
      ctx.addItems(safeObjectArray(data.alerts), "monitoring_metric", "alert");
      if (safeString(data.rollback_trigger))
        ctx.addScalar("rollback_trigger", "rollback", data.rollback_trigger);
      return nodes;
    },
  },
];
