import { z } from "zod";
import type { PhaseId } from "./types.js";
import type { Edge, EdgeKind, GraphNode, MatchStrategy, NodeKind, SSOTViolation } from "./change-graph/types.js";
import { BUILTIN_SSOT_RULES } from "./builtin-ssot-rules.js";

export const SSOTRuleDefinitionSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    fromPhases: z.array(z.string()).min(1),
    fromKind: z.string(),
    toPhases: z.array(z.string()).min(1),
    toKind: z.string(),
    edgeKind: z.string(),
    /** Optional: explicit ID-reference field on source node's data.
     *  When set, the rule prefers to use src.data[matchRefField] (an array of
     *  target node ids) for edge building — more robust than positional pairing. */
    matchRefField: z.string().optional(),
    matchFields: z.array(z.string()).optional(),
    matchStrategy: z.enum(["exact", "substring", "word-overlap-2", "word-overlap-1"]).optional(),
    violationEnabled: z.boolean().optional(),
    builtin: z.boolean().optional(),
  })
  .strict();

export type SSOTRuleDefinition = z.infer<typeof SSOTRuleDefinitionSchema>;

export type SSOTRuleSource = "builtin" | "yaml" | "package.json" | "programmatic";

export type SSOTRuleError = {
  code: "NOT_FOUND" | "VALIDATION" | "DUPLICATE" | "PARSE" | "IO";
  message: string;
  ruleId?: string;
  cause?: unknown;
};

export type Result<T, E = SSOTRuleError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const SOURCE_PRIORITY: Record<SSOTRuleSource, number> = {
  builtin: 0,
  "package.json": 100,
  yaml: 200,
  programmatic: 1000,
};

export class SSOTRuleRegistry {
  private byId = new Map<string, { def: SSOTRuleDefinition; source: SSOTRuleSource }>();
  private builtinsLoaded = false;

  ensureBuiltins(): void {
    if (this.builtinsLoaded) return;
    for (const def of BUILTIN_SSOT_RULES) this.register(def, "builtin");
    this.builtinsLoaded = true;
  }

  register(
    def: SSOTRuleDefinition,
    source: SSOTRuleSource,
  ): Result<void, SSOTRuleError> {
    if (source !== "builtin") this.ensureBuiltins();
    const parsed = SSOTRuleDefinitionSchema.safeParse(def);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? parsed.error.message,
          ruleId: def?.id,
          cause: parsed.error,
        },
      };
    }
    const existing = this.byId.get(parsed.data.id);
    if (existing && existing.source === source) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Rule ${parsed.data.id} already registered from ${source}`,
          ruleId: parsed.data.id,
        },
      };
    }
    if (existing?.def.builtin === true) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Cannot override builtin rule ${parsed.data.id}`,
          ruleId: parsed.data.id,
        },
      };
    }
    this.byId.set(parsed.data.id, { def: parsed.data, source });
    return { ok: true, value: undefined };
  }

  get(id: string): SSOTRuleDefinition | undefined {
    this.ensureBuiltins();
    return this.byId.get(id)?.def;
  }

  list(): SSOTRuleDefinition[] {
    this.ensureBuiltins();
    return [...this.byId.values()]
      .sort((a, b) => {
        const pa = SOURCE_PRIORITY[a.source];
        const pb = SOURCE_PRIORITY[b.source];
        if (pa !== pb) return pa - pb;
        return a.def.id.localeCompare(b.def.id);
      })
      .map((e) => e.def);
  }

  reset(): void {
    this.byId.clear();
    this.builtinsLoaded = false;
  }
}

let defaultInstance: SSOTRuleRegistry | null = null;

export function getDefaultSSOTRuleRegistry(): SSOTRuleRegistry {
  if (!defaultInstance) defaultInstance = new SSOTRuleRegistry();
  return defaultInstance;
}

export function resetDefaultSSOTRuleRegistry(): void {
  if (defaultInstance) defaultInstance.reset();
  defaultInstance = null;
}

/** Top-level: register an SSOT rule to the default registry. */
export function registerSSOTRule(
  def: SSOTRuleDefinition,
  source: SSOTRuleSource = "programmatic",
): Result<void, SSOTRuleError> {
  return getDefaultSSOTRuleRegistry().register(def, source);
}

// ── Edge building with ID reference support ──

/** Build edges using the registry's rules.
 *  For each rule:
 *  - If matchRefField is set on the rule AND the source node has data[matchRefField]
 *    as an array of ids, link to those targets (filtered to ones that exist).
 *  - Otherwise, fall back to positional pairing (sorted by id, zip-match).
 *  - For "duplicates" edgeKind, all-to-all is used. */
export function buildEdgesWithRegistry(
  nodes: Map<string, GraphNode>,
  edges: Map<string, Edge[]>,
  registry: SSOTRuleRegistry,
): void {
  registry.ensureBuiltins();
  const nodeArr = [...nodes.values()];

  for (const rule of registry.list()) {
    const sources = nodeArr
      .filter(
        (n) =>
          (rule.fromPhases as string[]).includes(n.phase) && n.kind === rule.fromKind,
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const targets = nodeArr
      .filter(
        (n) =>
          (rule.toPhases as string[]).includes(n.phase) && n.kind === rule.toKind,
      )
      .sort((a, b) => a.id.localeCompare(b.id));

    if (sources.length === 0 || targets.length === 0) continue;

    if (rule.edgeKind === "duplicates") {
      for (const src of sources) {
        for (const tgt of targets) {
          addEdgeIfNew(edges, src.id, tgt.id, rule.edgeKind as EdgeKind);
        }
      }
      continue;
    }

    if (rule.matchRefField) {
      // ID-reference path: link src → each ref id (filtered)
      let usedRef = false;
      for (const src of sources) {
        const refs = src.data[rule.matchRefField];
        if (Array.isArray(refs)) {
          for (const ref of refs) {
            if (typeof ref === "string" && nodes.has(ref)) {
              addEdgeIfNew(edges, src.id, ref, rule.edgeKind as EdgeKind);
              usedRef = true;
            }
          }
        }
      }
      // If at least one source had refs, don't fall back to positional for this rule.
      if (usedRef) continue;
    }

    // Positional pairing fallback
    const maxLen = Math.max(sources.length, targets.length);
    for (let i = 0; i < maxLen; i++) {
      const src = sources[i % sources.length];
      const tgt = targets[i % targets.length];
      addEdgeIfNew(edges, src.id, tgt.id, rule.edgeKind as EdgeKind);
    }
  }
}

function addEdgeIfNew(
  edges: Map<string, Edge[]>,
  from: string,
  to: string,
  kind: EdgeKind,
): void {
  const existing = edges.get(from) ?? [];
  if (!existing.some((e) => e.to === to && e.kind === kind)) {
    existing.push({ from, to, kind });
    edges.set(from, existing);
  }
}

// ── SSOT violation detection (delegated to existing logic) ──

export function detectSSOTViolationsWithRegistry(
  nodes: Map<string, GraphNode>,
  registry: SSOTRuleRegistry,
): SSOTViolation[] {
  // Reuse existing violation detection logic; rules come from registry.
  // (Implementation inlined here for self-containment; original detectSSOTViolations
  // in edges.ts uses EDGE_CATALOG hardcoded — this version uses registry.)
  registry.ensureBuiltins();
  const violationRules = registry
    .list()
    .filter((r) => r.violationEnabled === true);
  const violations: SSOTViolation[] = [];

  for (const rule of violationRules) {
    const sources = [...nodes.values()]
      .filter(
        (n) =>
          (rule.fromPhases as string[]).includes(n.phase) && n.kind === rule.fromKind,
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const targets = [...nodes.values()]
      .filter(
        (n) =>
          (rule.toPhases as string[]).includes(n.phase) && n.kind === rule.toKind,
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    if (sources.length === 0 || targets.length === 0) continue;
    const strategy: MatchStrategy = (rule.matchStrategy ?? "substring") as MatchStrategy;
    const minLen = Math.min(sources.length, targets.length);
    for (let i = 0; i < minLen; i++) {
      const src = sources[i]!;
      const tgt = targets[i]!;
      if (!labelsDiffer(src.label, tgt.label, strategy)) continue;
      violations.push({
        field: `${rule.fromKind} (${String(src.phase)} vs ${String(tgt.phase)})`,
        nodes: [src, tgt],
        description: `${rule.fromKind} 跨阶段不一致: "${src.label}" ≠ "${tgt.label}"`,
        severity: severityForKind(rule.fromKind),
      });
    }
  }
  return violations;
}

const SEVERITY_MAP: Record<string, "low" | "medium" | "high"> = {
  rollback: "high",
  threat: "high",
  nfr: "high",
  risk: "medium",
  deployment_step: "medium",
  monitoring_metric: "medium",
  design_decision: "low",
};

function severityForKind(kind: string): "low" | "medium" | "high" {
  return SEVERITY_MAP[kind] ?? "low";
}

function labelsDiffer(a: string, b: string, strategy: MatchStrategy): boolean {
  if (a === b) return false;
  if (strategy === "exact") return true;
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return false;
  if (strategy === "substring") return !(na.includes(nb) || nb.includes(na));
  const wa = new Set(na.split(/\s+/).filter((w) => w.length > 1));
  const wb = new Set(nb.split(/\s+/).filter((w) => w.length > 1));
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  const threshold = strategy === "word-overlap-2" ? 2 : 1;
  return common < threshold;
}
