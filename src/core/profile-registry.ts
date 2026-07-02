import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { BUILTIN_PROFILES } from "./builtin-profiles.js";
import { parseYamlListBlocks } from "./yaml-list-parse.js";
import { getLogger } from "./logger.js";

const log = getLogger();

export const ArchTemplateIdSchema = z.enum([
  "auto",
  "express-3layer",
  "fastapi-6layer",
  "react-component",
  "generic",
]);

export const ProfileDefinitionSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/, "id must be kebab-case (lowercase, digits, hyphens)"),
    extends: z.string().optional(),
    skipPhases: z.array(z.string()),
    arch: ArchTemplateIdSchema,
    description: z.string().optional(),
    builtin: z.boolean().optional(),
    keywords: z.array(z.string()).optional(),
  })
  .strict();

export type ProfileDefinition = z.infer<typeof ProfileDefinitionSchema>;
export type ArchTemplateId = z.infer<typeof ArchTemplateIdSchema>;

export type ProfileSource = "builtin" | "yaml" | "package.json" | "programmatic";

export type ProfileError = {
  code: "NOT_FOUND" | "VALIDATION" | "DUPLICATE" | "CYCLE" | "PARSE" | "IO";
  message: string;
  profileId?: string;
  cause?: unknown;
};

export type Result<T, E = ProfileError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const SOURCE_PRIORITY: Record<ProfileSource, number> = {
  builtin: 0,
  "package.json": 100,
  yaml: 200,
  programmatic: 1000,
};

export class ProfileRegistry {
  private byId = new Map<string, { def: ProfileDefinition; source: ProfileSource }>();
  private builtinsLoaded = false;

  ensureBuiltins(): void {
    if (this.builtinsLoaded) return;
    for (const def of BUILTIN_PROFILES) {
      const r = this.registerRawBuiltin(def);
      if (!r.ok) {
        throw new Error(
          `Failed to register builtin profile ${def.id}: ${r.error.message}`,
        );
      }
    }
    this.builtinsLoaded = true;
  }

  /** Register a builtin profile bypassing the builtin-protection guard
   *  (used by ensureBuiltins to bootstrap builtins). */
  private registerRawBuiltin(
    def: ProfileDefinition,
  ): Result<void, ProfileError> {
    const parsed = ProfileDefinitionSchema.safeParse(def);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? parsed.error.message,
          profileId: def?.id,
        },
      };
    }
    this.byId.set(parsed.data.id, { def: parsed.data, source: "builtin" });
    return { ok: true, value: undefined };
  }

  register(def: ProfileDefinition, source: ProfileSource): Result<void, ProfileError> {
    // Only call ensureBuiltins for non-builtin source to avoid infinite recursion.
    if (source !== "builtin") this.ensureBuiltins();
    const parsed = ProfileDefinitionSchema.safeParse(def);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: firstIssue?.message ?? parsed.error.message,
          profileId: def?.id,
          cause: parsed.error,
        },
      };
    }
    const existing = this.byId.get(parsed.data.id);
    // 同 source 重复 → DUPLICATE
    if (existing && existing.source === source) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Profile ${parsed.data.id} already registered from ${source}`,
          profileId: parsed.data.id,
        },
      };
    }
    // builtin 保护：已存在的 builtin 不能被任何 source 覆盖
    if (existing?.def.builtin === true) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Cannot override builtin profile ${parsed.data.id}`,
          profileId: parsed.data.id,
        },
      };
    }
    this.byId.set(parsed.data.id, { def: parsed.data, source });
    return { ok: true, value: undefined };
  }

  get(id: string): ProfileDefinition | undefined {
    this.ensureBuiltins();
    return this.byId.get(id)?.def;
  }

  list(): ProfileDefinition[] {
    this.ensureBuiltins();
    // For builtin profiles, preserve the canonical order from BUILTIN_PROFILES.
    // For other sources, fall back to id sort.
    const builtinOrder = new Map(BUILTIN_PROFILES.map((d, i) => [d.id, i]));
    return [...this.byId.values()]
      .sort((a, b) => {
        const pa = SOURCE_PRIORITY[a.source];
        const pb = SOURCE_PRIORITY[b.source];
        if (pa !== pb) return pa - pb;
        const oa = builtinOrder.get(a.def.id);
        const ob = builtinOrder.get(b.def.id);
        if (oa !== undefined && ob !== undefined) return oa - ob;
        if (oa !== undefined) return -1;
        if (ob !== undefined) return 1;
        return a.def.id.localeCompare(b.def.id);
      })
      .map((e) => e.def);
  }

  /** Resolve a profile by id. Walks the `extends` chain and:
   *  - merges skipPhases via Set union
   *  - lets child override parent's arch / description (child = first in chain = given id)
   *  - detects cycles via visited Set
   *  Returns { ok: false, error: NOT_FOUND | CYCLE } if invalid.
   *
   *  Strategy: first walk to the root of the chain (collecting all defs in order),
   *  then apply from root → child so child wins on scalar fields.
   */
  resolve(id: string): Result<ProfileDefinition, ProfileError> {
    this.ensureBuiltins();
    const visited = new Set<string>();
    const chain: ProfileDefinition[] = [];
    let currentId: string | undefined = id;

    // Walk to root, collecting all defs
    while (currentId) {
      if (visited.has(currentId)) {
        return {
          ok: false,
          error: {
            code: "CYCLE",
            message: `Cycle detected at ${currentId}`,
            profileId: id,
          },
        };
      }
      visited.add(currentId);
      const entry = this.byId.get(currentId);
      if (!entry) {
        return {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: `Profile not found: ${currentId}`,
            profileId: id,
          },
        };
      }
      chain.push(entry.def);
      // 规范化：空字符串视为无 extends
      const ext = entry.def.extends;
      currentId = ext && ext.length > 0 ? ext : undefined;
    }

    // Apply from root (last in chain) → child (first in chain)
    // so child overrides parent on scalar fields.
    const skipPhases = new Set<string>();
    let arch: ProfileDefinition["arch"] = "auto";
    let description: string | undefined;
    let extendsChain: string | undefined;
    let builtin: boolean | undefined;
    for (let i = chain.length - 1; i >= 0; i--) {
      const d = chain[i]!;
      for (const p of d.skipPhases) skipPhases.add(p);
      arch = d.arch;
      if (d.description !== undefined) description = d.description;
    }
    // The child (first in chain) is the canonical id; only child sets extendsChain & builtin
    const child = chain[0];
    extendsChain = child.extends;
    builtin = child.builtin;

    return {
      ok: true,
      value: {
        id: child.id,
        skipPhases: [...skipPhases],
        arch,
        description,
        extends: extendsChain,
        builtin,
      },
    };
  }

  reset(): void {
    this.byId.clear();
    this.builtinsLoaded = false;
  }
}

let defaultInstance: ProfileRegistry | null = null;

export function getDefaultRegistry(): ProfileRegistry {
  if (!defaultInstance) defaultInstance = new ProfileRegistry();
  return defaultInstance;
}

export function resetProfileRegistry(): void {
  if (defaultInstance) defaultInstance.reset();
  defaultInstance = null;
}

/** Top-level: register a profile to the default registry.
 *  Default source is "programmatic" (highest priority). */
export function registerProfile(
  def: ProfileDefinition,
  source: ProfileSource = "programmatic",
): Result<void, ProfileError> {
  return getDefaultRegistry().register(def, source);
}

/** Top-level: resolve a profile id via the default registry. */
export function resolveProfile(id: string): Result<ProfileDefinition, ProfileError> {
  return getDefaultRegistry().resolve(id);
}

/** Top-level: get a profile by id (returns undefined if unknown). */
export function getProfile(id: string): ProfileDefinition | undefined {
  return getDefaultRegistry().get(id);
}

/** Top-level: list all profiles from the default registry. */
export function listProfiles(): ProfileDefinition[] {
  return getDefaultRegistry().list();
}

// Force-load builtin profiles at module-import time so default registry is ready
// for any consumer (including PROFILE_SKIPPED snapshot in profile.ts).
getDefaultRegistry().ensureBuiltins();

// ── YAML validation & loading ──

/** Parse YAML content (with `profiles:` root key) and validate against Zod schema.
 *  Returns { ok: true, value: ProfileDefinition[] } on success.
 *  Returns { ok: false, error: { code: PARSE | VALIDATION | DUPLICATE } } on failure.
 *
 *  Uses the project's hand-rolled parseYamlListBlocks (no yaml npm dep).
 *  Supports the same flat list-of-objects format that phases.yaml / quality-gate.yaml use. */
export function validateProfileYaml(
  content: string,
): Result<ProfileDefinition[], ProfileError> {
  let raw: Record<string, string | number | string[]>[];
  try {
    raw = parseYamlListBlocks(content, "profiles");
  } catch (e) {
    return {
      ok: false,
      error: { code: "PARSE", message: String(e), cause: e },
    };
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      ok: false,
      error: { code: "PARSE", message: "Missing or empty 'profiles' block" },
    };
  }

  const seen = new Set<string>();
  const out: ProfileDefinition[] = [];
  for (const item of raw) {
    const r = ProfileDefinitionSchema.safeParse(item);
    if (!r.success) {
      const firstIssue = r.error.issues[0];
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: firstIssue?.message ?? r.error.message,
          cause: r.error,
        },
      };
    }
    if (seen.has(r.data.id)) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Duplicate profile id in yaml: ${r.data.id}`,
          profileId: r.data.id,
        },
      };
    }
    seen.add(r.data.id);
    out.push(r.data);
  }
  return { ok: true, value: out };
}

/** Read YAML file from disk, validate, and register all profiles into the default registry.
 *  Returns { ok: true, value: count } on success.
 *  Returns { ok: false, error: { code: IO | PARSE | VALIDATION | DUPLICATE } } on failure. */
export function loadProfilesFromYaml(
  yamlPath: string,
): Result<number, ProfileError> {
  if (!fs.existsSync(yamlPath)) {
    return {
      ok: false,
      error: { code: "IO", message: `File not found: ${yamlPath}` },
    };
  }
  const content = fs.readFileSync(yamlPath, "utf8");
  const v = validateProfileYaml(content);
  if (!v.ok) return v;
  const reg = getDefaultRegistry();
  let count = 0;
  for (const def of v.value) {
    const r = reg.register(def, "yaml");
    if (r.ok) count++;
  }
  return { ok: true, value: count };
}

/** Scan rootDir/node_modules for `taiyi.profiles` arrays in package.json.
 *  Shallow scan only (depth=1, no recursion into nested node_modules).
 *  Skips noise dirs: .bin / .cache / .pnpm / .store and any dotfile dirs.
 *  Returns the count of successfully registered profiles.
 *  Per-profile failures (e.g. builtin collision) are silently skipped.
 */
export function loadProfilesFromNodeModules(
  rootDir: string,
): Result<number, ProfileError> {
  const nmDir = path.join(rootDir, "node_modules");
  if (!fs.existsSync(nmDir)) {
    return { ok: true, value: 0 };
  }

  const SKIP_TOP = new Set([".bin", ".cache", ".pnpm", ".store"]);
  const reg = getDefaultRegistry();
  let count = 0;

  let entries: string[];
  try {
    entries = fs.readdirSync(nmDir);
  } catch (e) {
    return {
      ok: false,
      error: { code: "IO", message: `Cannot read ${nmDir}: ${e}`, cause: e },
    };
  }

  for (const entry of entries) {
    if (SKIP_TOP.has(entry)) continue;
    if (entry.startsWith(".")) continue;

    // Support both `node_modules/foo` and scoped `node_modules/@scope/foo`
    const candidates: string[] = [];
    const directPkg = path.join(nmDir, entry, "package.json");
    if (fs.existsSync(directPkg)) {
      candidates.push(directPkg);
    } else if (entry.startsWith("@")) {
      // Scoped: read subdirs
      try {
        const scopedEntries = fs.readdirSync(path.join(nmDir, entry));
        for (const scoped of scopedEntries) {
          const p = path.join(nmDir, entry, scoped, "package.json");
          if (fs.existsSync(p)) candidates.push(p);
        }
      } catch {
        // ignore unreadable scope
      }
    }

    for (const pkgPath of candidates) {
      let pkg: { taiyi?: { profiles?: unknown } };
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      } catch (e) {
        // Malformed JSON — warn + skip
        log.warn(`Skipping malformed package.json: ${pkgPath}`, { error: String(e) });
        continue;
      }
      const profiles = pkg.taiyi?.profiles;
      if (!Array.isArray(profiles)) continue;

      for (const def of profiles) {
        const r = reg.register(def as ProfileDefinition, "package.json");
        if (r.ok) count++;
        // Per-profile failures (builtin collision, validation) are silently skipped
        // to avoid one bad package breaking the whole scan.
      }
    }
  }

  return { ok: true, value: count };
}
