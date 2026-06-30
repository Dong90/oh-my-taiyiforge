import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  CodePatternRegistry,
  getDefaultCodePatternRegistry,
  resetDefaultCodePatternRegistry,
  type CodePatternDefinition,
} from "../src/core/code-pattern-registry.js";
import { BUILTIN_CODE_PATTERNS } from "../src/core/builtin-code-patterns.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-pattern-"));
  // create the templates dir + stub .hbs files
  const tplDir = path.join(tmpDir, "templates");
  fs.mkdirSync(tplDir, { recursive: true });
  for (const def of BUILTIN_CODE_PATTERNS) {
    fs.writeFileSync(path.join(tplDir, def.templateFile), `// stub ${def.pattern}\n`, "utf8");
  }
});

describe("code-pattern-registry: in-memory register/get/list", () => {
  it("registers a code pattern and retrieves via get", () => {
    const reg = new CodePatternRegistry({ templatesDir: path.join(tmpDir, "templates") });
    const r = reg.register(
      { pattern: "MyPattern", templateFile: "my.hbs", outputExtension: ".ts" },
      "programmatic",
    );
    expect(r.ok).toBe(true);
    expect(reg.get("MyPattern")?.templateFile).toBe("my.hbs");
  });

  it("lists all registered code patterns", () => {
    const reg = new CodePatternRegistry({ templatesDir: path.join(tmpDir, "templates") });
    reg.register({ pattern: "X", templateFile: "x.hbs" }, "programmatic");
    reg.register({ pattern: "Y", templateFile: "y.hbs" }, "programmatic");
    const list = reg.list();
    const custom = list.filter((d) => d.pattern === "X" || d.pattern === "Y");
    expect(custom).toHaveLength(2);
  });

  it("get returns undefined for unknown pattern", () => {
    const reg = new CodePatternRegistry({ templatesDir: path.join(tmpDir, "templates") });
    expect(reg.get("NotThere")).toBeUndefined();
  });

  it("rejects invalid pattern: missing templateFile (zod validation)", () => {
    const reg = new CodePatternRegistry({ templatesDir: path.join(tmpDir, "templates") });
    const r = reg.register(
      { pattern: "Bad" } as any,
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDATION");
  });

  it("rejects re-registering same pattern from same source", () => {
    const reg = new CodePatternRegistry({ templatesDir: path.join(tmpDir, "templates") });
    reg.register({ pattern: "Dup", templateFile: "a.hbs" }, "programmatic");
    const r = reg.register(
      { pattern: "Dup", templateFile: "b.hbs" },
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DUPLICATE");
  });

  it("resolve returns the templateFile + outputExtension for a pattern", () => {
    const reg = new CodePatternRegistry({ templatesDir: path.join(tmpDir, "templates") });
    reg.register(
      { pattern: "TSAdapter", templateFile: "ts-adapter.hbs", outputExtension: ".ts" },
      "programmatic",
    );
    const r = reg.resolve("TSAdapter");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.templateFile).toBe("ts-adapter.hbs");
      expect(r.value.outputExtension).toBe(".ts");
    }
  });

  it("builtin patterns are loaded on ensureBuiltins()", () => {
    const reg = new CodePatternRegistry({ templatesDir: path.join(tmpDir, "templates") });
    reg.ensureBuiltins();
    expect(reg.get("Adapter")).toBeDefined();
    expect(reg.get("Strategy")).toBeDefined();
    expect(reg.get("Controller")).toBeDefined();
    // 13 builtins
    const builtins = reg.list().filter((d) => d.builtin);
    expect(builtins).toHaveLength(13);
  });

  it("builtin pattern cannot be overridden by programmatic source", () => {
    const reg = new CodePatternRegistry({ templatesDir: path.join(tmpDir, "templates") });
    reg.ensureBuiltins();
    const r = reg.register(
      { pattern: "Adapter", templateFile: "evil-adapter.hbs" },
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DUPLICATE");
  });
});

describe("code-pattern-registry: default registry singleton", () => {
  it("getDefaultCodePatternRegistry returns singleton", () => {
    resetDefaultCodePatternRegistry();
    const a = getDefaultCodePatternRegistry();
    const b = getDefaultCodePatternRegistry();
    expect(a).toBe(b);
  });

  it("resetDefaultCodePatternRegistry creates fresh instance", () => {
    const a = getDefaultCodePatternRegistry();
    resetDefaultCodePatternRegistry();
    const b = getDefaultCodePatternRegistry();
    expect(a).not.toBe(b);
  });
});
