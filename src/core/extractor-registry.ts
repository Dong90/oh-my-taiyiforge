import type { GraphNode, NodeKind } from "./change-graph/types.js";
import type { PhaseId } from "./types.js";
import { BUILTIN_EXTRACTORS } from "./builtin-extractors.js";

/** Context provided to an extractor function. The extract() function may call
 *  addItems/addScalar to add nodes, or return an explicit array of nodes. */
export type ExtractorContext = {
  /** Add multiple nodes from an array of items. */
  addItems(
    arr: (Record<string, unknown> | string)[] | undefined,
    kind: NodeKind,
    labelKey?: string,
  ): void;
  /** Add a single node from a scalar field value. */
  addScalar(key: string, kind: NodeKind, val: unknown): void;
  /** Extract a string from data, trying multiple keys. */
  extractString(data: Record<string, unknown>, ...keys: string[]): string;
  /** Current phase (string form). */
  phaseStr: string;
  /** Monotonic index counter for ID generation. */
  idx: number;
};

export type ExtractorDefinition = {
  /** Phase this extractor targets (e.g. "change", "design"). */
  phase: PhaseId;
  /** Unique name within the phase (e.g. "default-change", "review-custom"). */
  name: string;
  /** True if this is a builtin (cannot be overridden by non-builtin sources). */
  builtin?: boolean;
  /** The extractor function. Receives the phase JSON data and a context
   *  with helper methods; returns 0 or more GraphNode entities. */
  extract: (data: Record<string, unknown>, ctx: ExtractorContext) => GraphNode[];
};

export type ExtractorSource = "builtin" | "yaml" | "package.json" | "programmatic";

export type ExtractorError = {
  code: "NOT_FOUND" | "VALIDATION" | "DUPLICATE";
  message: string;
  phase?: string;
  name?: string;
  cause?: unknown;
};

export type Result<T, E = ExtractorError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const SOURCE_PRIORITY: Record<ExtractorSource, number> = {
  builtin: 0,
  "package.json": 100,
  yaml: 200,
  programmatic: 1000,
};

export class ExtractorRegistry {
  /** key = `${phase}::${name}` for fast lookup */
  private byKey = new Map<string, { def: ExtractorDefinition; source: ExtractorSource }>();
  private builtinsLoaded = false;

  ensureBuiltins(): void {
    if (this.builtinsLoaded) return;
    for (const def of BUILTIN_EXTRACTORS) this.register(def, "builtin");
    this.builtinsLoaded = true;
  }

  register(
    def: ExtractorDefinition,
    source: ExtractorSource,
  ): Result<void, ExtractorError> {
    if (source !== "builtin") this.ensureBuiltins();
    if (!def.phase || !def.name) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Extractor must have phase and name",
          phase: def.phase,
          name: def.name,
        },
      };
    }
    const key = `${def.phase}::${def.name}`;
    const existing = this.byKey.get(key);
    if (existing && existing.source === source) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Extractor ${key} already registered from ${source}`,
          phase: def.phase,
          name: def.name,
        },
      };
    }
    if (existing?.def.builtin === true) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Cannot override builtin extractor ${key}`,
          phase: def.phase,
          name: def.name,
        },
      };
    }
    this.byKey.set(key, { def, source });
    return { ok: true, value: undefined };
  }

  get(phase: string, name: string): ExtractorDefinition | undefined {
    this.ensureBuiltins();
    return this.byKey.get(`${phase}::${name}`)?.def;
  }

  list(): ExtractorDefinition[] {
    this.ensureBuiltins();
    return [...this.byKey.values()]
      .sort((a, b) => {
        const pa = SOURCE_PRIORITY[a.source];
        const pb = SOURCE_PRIORITY[b.source];
        if (pa !== pb) return pa - pb;
        return (
          a.def.phase.localeCompare(b.def.phase) ||
          a.def.name.localeCompare(b.def.name)
        );
      })
      .map((e) => e.def);
  }

  listByPhase(phase: string): ExtractorDefinition[] {
    return this.list().filter((e) => e.phase === phase);
  }

  listPhases(): string[] {
    return [...new Set(this.list().map((e) => e.phase))];
  }

  reset(): void {
    this.byKey.clear();
    this.builtinsLoaded = false;
  }
}

let defaultInstance: ExtractorRegistry | null = null;

export function getDefaultExtractorRegistry(): ExtractorRegistry {
  if (!defaultInstance) defaultInstance = new ExtractorRegistry();
  return defaultInstance;
}

export function resetDefaultExtractorRegistry(): void {
  if (defaultInstance) defaultInstance.reset();
  defaultInstance = null;
}

export function registerExtractor(
  def: ExtractorDefinition,
  source: ExtractorSource = "programmatic",
): Result<void, ExtractorError> {
  return getDefaultExtractorRegistry().register(def, source);
}
