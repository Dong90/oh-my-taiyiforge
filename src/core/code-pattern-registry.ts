import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { BUILTIN_CODE_PATTERNS } from "./builtin-code-patterns.js";
import { parseYamlListBlocks } from "./yaml-list-parse.js";
import { getLogger } from "./logger.js";

const log = getLogger();

export const CodePatternSourceSchema = z.enum([
  "builtin",
  "yaml",
  "package.json",
  "programmatic",
]);

export type CodePatternSource = z.infer<typeof CodePatternSourceSchema>;

export const CodePatternDefinitionSchema = z
  .object({
    /** Pattern name (e.g. "Adapter", "Strategy", "MyDomainService"). */
    pattern: z
      .string()
      .regex(/^[A-Z][A-Za-z0-9]*$/, "pattern must be PascalCase (start with uppercase)"),
    /** Template file name relative to templatesDir (e.g. "adapter.hbs"). */
    templateFile: z.string().min(1),
    /** Default output file extension. Defaults to ".py" if not set. */
    outputExtension: z.string().default(".py"),
    /** Optional description for the agent. */
    description: z.string().optional(),
    /** Mark as builtin (cannot be overridden by non-builtin sources). */
    builtin: z.boolean().optional(),
  })
  .strict();

export type CodePatternDefinition = z.infer<typeof CodePatternDefinitionSchema>;

export type CodePatternError = {
  code: "NOT_FOUND" | "VALIDATION" | "DUPLICATE" | "PARSE" | "IO";
  message: string;
  pattern?: string;
  cause?: unknown;
};

export type Result<T, E = CodePatternError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

const SOURCE_PRIORITY: Record<CodePatternSource, number> = {
  builtin: 0,
  "package.json": 100,
  yaml: 200,
  programmatic: 1000,
};

export type CodePatternRegistryConfig = {
  /** Directory containing the .hbs template files. */
  templatesDir: string;
};

export class CodePatternRegistry {
  private byPattern = new Map<
    string,
    { def: CodePatternDefinition; source: CodePatternSource }
  >();
  private builtinsLoaded = false;
  private config: CodePatternRegistryConfig;

  constructor(config: CodePatternRegistryConfig) {
    this.config = config;
  }

  /** Load built-in patterns from BUILTIN_CODE_PATTERNS. */
  ensureBuiltins(): void {
    if (this.builtinsLoaded) return;
    for (const def of BUILTIN_CODE_PATTERNS) {
      this.register(def, "builtin");
    }
    this.builtinsLoaded = true;
  }

  register(
    def: CodePatternDefinition,
    source: CodePatternSource,
  ): Result<void, CodePatternError> {
    // Only call ensureBuiltins for non-builtin source to avoid infinite recursion.
    if (source !== "builtin") this.ensureBuiltins();
    const parsed = CodePatternDefinitionSchema.safeParse(def);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? parsed.error.message,
          pattern: def?.pattern,
          cause: parsed.error,
        },
      };
    }
    const existing = this.byPattern.get(parsed.data.pattern);
    if (existing && existing.source === source) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Pattern ${parsed.data.pattern} already registered from ${source}`,
          pattern: parsed.data.pattern,
        },
      };
    }
    if (existing?.def.builtin === true) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Cannot override builtin pattern ${parsed.data.pattern}`,
          pattern: parsed.data.pattern,
        },
      };
    }
    this.byPattern.set(parsed.data.pattern, { def: parsed.data, source });
    return { ok: true, value: undefined };
  }

  get(pattern: string): CodePatternDefinition | undefined {
    this.ensureBuiltins();
    return this.byPattern.get(pattern)?.def;
  }

  list(): CodePatternDefinition[] {
    this.ensureBuiltins();
    return [...this.byPattern.values()]
      .sort((a, b) => {
        const pa = SOURCE_PRIORITY[a.source];
        const pb = SOURCE_PRIORITY[b.source];
        if (pa !== pb) return pa - pb;
        return a.def.pattern.localeCompare(b.def.pattern);
      })
      .map((e) => e.def);
  }

  resolve(pattern: string): Result<CodePatternDefinition, CodePatternError> {
    this.ensureBuiltins();
    const entry = this.byPattern.get(pattern);
    if (!entry) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: `Pattern not found: ${pattern}`,
          pattern,
        },
      };
    }
    return { ok: true, value: entry.def };
  }

  reset(): void {
    this.byPattern.clear();
    this.builtinsLoaded = false;
  }
}

let defaultInstance: CodePatternRegistry | null = null;

/** Get (or create) the default singleton CodePatternRegistry.
 *  On first call, requires user to set templatesDir via setDefaultTemplatesDir()
 *  before the registry can be useful. If unset, returns a registry with empty
 *  templatesDir — calls to ensureBuiltins will still register builtins but
 *  template lookups against disk may fail. */
export function getDefaultCodePatternRegistry(): CodePatternRegistry {
  if (!defaultInstance) {
    defaultInstance = new CodePatternRegistry({ templatesDir: "" });
  }
  return defaultInstance;
}

export function resetDefaultCodePatternRegistry(): void {
  if (defaultInstance) defaultInstance.reset();
  defaultInstance = null;
}

/** @deprecated No-op kept for API stability. The templatesDir is stored on the
 *  registry config but `generateCode` reads it from `options.templatesDir` instead.
 *  This function will be removed once generateCode is refactored to consult the
 *  registry's templatesDir as a fallback. */
export function setDefaultTemplatesDir(templatesDir: string): void {
  resetDefaultCodePatternRegistry();
  defaultInstance = new CodePatternRegistry({ templatesDir });
}

/** Top-level: register a code pattern to the default registry. */
export function registerCodePattern(
  def: CodePatternDefinition,
  source: CodePatternSource = "programmatic",
): Result<void, CodePatternError> {
  return getDefaultCodePatternRegistry().register(def, source);
}

// ── YAML validation & loading ──

/** Parse YAML content (with `patterns:` root key) and validate against Zod schema.
 *  Returns { ok: true, value: CodePatternDefinition[] } on success. */
export function validateCodePatternsYaml(
  content: string,
): Result<CodePatternDefinition[], CodePatternError> {
  let raw: Record<string, string | number | string[]>[];
  try {
    raw = parseYamlListBlocks(content, "patterns");
  } catch (e) {
    return {
      ok: false,
      error: { code: "PARSE", message: `YAML parse error: ${e}`, cause: e },
    };
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      ok: false,
      error: { code: "PARSE", message: "Missing or empty 'patterns' block" },
    };
  }

  const seen = new Set<string>();
  const out: CodePatternDefinition[] = [];
  for (const item of raw) {
    const r = CodePatternDefinitionSchema.safeParse(item);
    if (!r.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: r.error.issues[0]?.message ?? r.error.message,
          cause: r.error,
        },
      };
    }
    if (seen.has(r.data.pattern)) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE",
          message: `Duplicate pattern in yaml: ${r.data.pattern}`,
          pattern: r.data.pattern,
        },
      };
    }
    seen.add(r.data.pattern);
    out.push(r.data);
  }
  return { ok: true, value: out };
}

/** Read YAML file from disk, validate, and register all patterns into the default registry.
 *  Per-pattern register failures (e.g. builtin collision) are silently skipped. */
export function loadCodePatternsFromYaml(
  yamlPath: string,
): Result<number, CodePatternError> {
  if (!fs.existsSync(yamlPath)) {
    return {
      ok: false,
      error: { code: "IO", message: `File not found: ${yamlPath}` },
    };
  }
  const content = fs.readFileSync(yamlPath, "utf8");
  const v = validateCodePatternsYaml(content);
  if (!v.ok) return v;
  const reg = getDefaultCodePatternRegistry();
  let count = 0;
  for (const def of v.value) {
    const r = reg.register(def, "yaml");
    if (r.ok) count++;
  }
  return { ok: true, value: count };
}

/** Scan rootDir/node_modules for `taiyi.patterns` arrays in package.json.
 *  Shallow scan (depth=1). Skips noise dirs (.bin / .cache / .pnpm / .store).
 *  Supports scoped packages. Per-pattern failures are silently skipped. */
export function loadCodePatternsFromNodeModules(
  rootDir: string,
): Result<number, CodePatternError> {
  const nmDir = path.join(rootDir, "node_modules");
  if (!fs.existsSync(nmDir)) return { ok: true, value: 0 };

  const SKIP_TOP = new Set([".bin", ".cache", ".pnpm", ".store"]);
  const reg = getDefaultCodePatternRegistry();
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

    const candidates: string[] = [];
    const directPkg = path.join(nmDir, entry, "package.json");
    if (fs.existsSync(directPkg)) {
      candidates.push(directPkg);
    } else if (entry.startsWith("@")) {
      try {
        const scopedEntries = fs.readdirSync(path.join(nmDir, entry));
        for (const scoped of scopedEntries) {
          const p = path.join(nmDir, entry, scoped, "package.json");
          if (fs.existsSync(p)) candidates.push(p);
        }
      } catch {
        // ignore
      }
    }

    for (const pkgPath of candidates) {
      let pkg: { taiyi?: { patterns?: unknown } };
      try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      } catch (e) {
        log.warn(`Skipping malformed package.json: ${pkgPath}`, { error: String(e) });
        continue;
      }
      const patterns = pkg.taiyi?.patterns;
      if (!Array.isArray(patterns)) continue;

      for (const def of patterns) {
        const r = reg.register(def as CodePatternDefinition, "package.json");
        if (r.ok) count++;
      }
    }
  }

  return { ok: true, value: count };
}
