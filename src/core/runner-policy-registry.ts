import { z } from "zod";
import { getLogger } from "./logger.js";
import { BUILTIN_RUNNER_POLICIES } from "./builtin-runner-policies.js";

const log = getLogger();

/** Names of the 6 user-facing runners. */
export const RUNNER_NAMES = [
  "autopilot",
  "ralph",
  "team",
  "ultrawork",
  "loop",
  "review-loop",
] as const;
export type RunnerName = (typeof RUNNER_NAMES)[number];

export const RunnerPolicyDefinitionSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, "id must be kebab-case"),
    /** Which underlying runner to invoke. */
    runner: z.enum(RUNNER_NAMES),
    /** Max iterations before aborting. */
    maxIterations: z.number().int().positive().default(100),
    /** Token budget for the whole run. */
    maxTokens: z.number().int().positive().default(200000),
    /** Whether to auto-run post-phase harness hooks. */
    autoHarness: z.boolean().default(false),
    /** Optional: explicit role override for team mode. */
    roleOverride: z.string().optional(),
    /** Optional: parallelism (1 = sequential). */
    parallelism: z.number().int().positive().default(1),
    /** Whether to verify each phase result before moving on. */
    verifyEachPhase: z.boolean().default(false),
    /** Optional: prompt hint to inject into runner. */
    promptHint: z.string().optional(),
    /** Mark as builtin (cannot be overridden by non-builtin sources). */
    builtin: z.boolean().optional(),
    description: z.string().optional(),
  })
  .strict();

export type RunnerPolicyDefinition = z.infer<typeof RunnerPolicyDefinitionSchema>;

export type RunnerPolicySource = "builtin" | "yaml" | "package.json" | "programmatic";

export type RunnerPolicyError = {
  code: "NOT_FOUND" | "VALIDATION" | "DUPLICATE";
  message: string;
  policyId?: string;
  cause?: unknown;
};

export type Result<T, E = RunnerPolicyError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const SOURCE_PRIORITY: Record<RunnerPolicySource, number> = {
  builtin: 0,
  "package.json": 100,
  yaml: 200,
  programmatic: 1000,
};

export class RunnerPolicyRegistry {
  private byId = new Map<string, { def: RunnerPolicyDefinition; source: RunnerPolicySource }>();
  private builtinsLoaded = false;

  ensureBuiltins(): void {
    if (this.builtinsLoaded) return;
    for (const def of BUILTIN_RUNNER_POLICIES) this.register(def, "builtin");
    this.builtinsLoaded = true;
  }

  register(
    def: RunnerPolicyDefinition,
    source: RunnerPolicySource,
  ): Result<void, RunnerPolicyError> {
    if (source !== "builtin") this.ensureBuiltins();
    const parsed = RunnerPolicyDefinitionSchema.safeParse(def);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? parsed.error.message,
          policyId: def?.id,
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
          message: `Runner policy ${parsed.data.id} already registered from ${source}`,
          policyId: parsed.data.id,
        },
      };
    }
    if (existing?.def.builtin === true) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Cannot override builtin runner policy ${parsed.data.id}`,
          policyId: parsed.data.id,
        },
      };
    }
    this.byId.set(parsed.data.id, { def: parsed.data, source });
    return { ok: true, value: undefined };
  }

  get(id: string): RunnerPolicyDefinition | undefined {
    this.ensureBuiltins();
    return this.byId.get(id)?.def;
  }

  list(): RunnerPolicyDefinition[] {
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

let defaultInstance: RunnerPolicyRegistry | null = null;

export function getDefaultRunnerPolicyRegistry(): RunnerPolicyRegistry {
  if (!defaultInstance) defaultInstance = new RunnerPolicyRegistry();
  return defaultInstance;
}

export function resetDefaultRunnerPolicyRegistry(): void {
  if (defaultInstance) defaultInstance.reset();
  defaultInstance = null;
}

export function registerRunnerPolicy(
  def: RunnerPolicyDefinition,
  source: RunnerPolicySource = "programmatic",
): Result<void, RunnerPolicyError> {
  return getDefaultRunnerPolicyRegistry().register(def, source);
}

/** Resolve a policy id to the underlying runner name to invoke.
 *  Falls back to "autopilot" for unknown policy ids (with a warning so the
 *  silent fallback is at least visible in logs). */
export function selectRunnerForPolicy(
  policyId: string,
  registry: RunnerPolicyRegistry = getDefaultRunnerPolicyRegistry(),
): RunnerName {
  const def = registry.get(policyId);
  if (def) return def.runner;
  if ((RUNNER_NAMES as readonly string[]).includes(policyId)) {
    return policyId as RunnerName;
  }
  log.warn(
    `Unknown runner policy "${policyId}", falling back to "autopilot"`,
  );
  return "autopilot";
}
