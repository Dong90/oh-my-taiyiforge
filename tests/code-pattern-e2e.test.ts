import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { generateCode } from "../src/core/code-gen.js";
import {
  setDefaultTemplatesDir,
  resetDefaultCodePatternRegistry,
  registerCodePattern,
  getDefaultCodePatternRegistry,
} from "../src/core/code-pattern-registry.js";

let tmpDir: string;
let templatesDir: string;
let outputDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-pattern-e2e-"));
  templatesDir = path.join(tmpDir, "templates");
  outputDir = path.join(tmpDir, "out");
  fs.mkdirSync(templatesDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  // Reset registry and point it at the test templates dir
  resetDefaultCodePatternRegistry();
  setDefaultTemplatesDir(templatesDir);
  // Write a stub .hbs file for a custom pattern
  fs.writeFileSync(
    path.join(templatesDir, "my-domain.hbs"),
    `# {{class_name}} auto-generated\n# pattern: {{pattern}}\n`,
    "utf8",
  );
  // Write a builtin .hbs file (Adapter)
  fs.writeFileSync(
    path.join(templatesDir, "adapter.hbs"),
    `# {{class_name}} builtin adapter\n`,
    "utf8",
  );
});

describe("code-pattern-registry: end-to-end with code-gen.ts", () => {
  it("generateCode uses registry to resolve builtin pattern (Adapter)", () => {
    const r = generateCode({
      outputDir,
      templatesDir,
      manifest: [
        {
          id: "M1",
          file: "adapter.py",
          pattern: "Adapter",
          class_name: "MyAdapter",
          depends_on: [],
          methods: [],
          constraints: [],
        },
      ],
      style: {
        type_hints: true,
        docstrings: true,
        error_handling: "basic",
        logging_style: "simple",
        request_tracing: false,
        prompt_engineering: "basic",
      },
    });
    expect(r.length).toBeGreaterThan(0);
    const result = r[0];
    if (result) {
      expect(result.file).toBe("adapter.py");
    }
    const out = path.join(outputDir, "adapter.py");
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.readFileSync(out, "utf8")).toContain("MyAdapter");
  });

  it("generateCode uses registry to resolve custom pattern (MyDomain)", () => {
    registerCodePattern({
      pattern: "MyDomain",
      templateFile: "my-domain.hbs",
      outputExtension: ".py",
    });
    const r = generateCode({
      outputDir,
      templatesDir,
      manifest: [
        {
          id: "M2",
          file: "domain.py",
          pattern: "MyDomain",
          class_name: "MyDomainService",
          depends_on: [],
          methods: [],
          constraints: [],
        },
      ],
      style: {
        type_hints: true,
        docstrings: true,
        error_handling: "basic",
        logging_style: "simple",
        request_tracing: false,
        prompt_engineering: "basic",
      },
    });
    const result = r[0];
    if (result) expect(result.file).toBe("domain.py");
    const out = path.join(outputDir, "domain.py");
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.readFileSync(out, "utf8")).toContain("MyDomainService");
  });

  it("generateCode returns ok:false for unknown pattern", () => {
    const r = generateCode({
      outputDir,
      templatesDir,
      manifest: [
        {
          id: "M3",
          file: "x.py",
          pattern: "TotallyUnknown",
          class_name: "X",
          depends_on: [],
          methods: [],
          constraints: [],
        },
      ],
      style: {
        type_hints: true,
        docstrings: true,
        error_handling: "basic",
        logging_style: "simple",
        request_tracing: false,
        prompt_engineering: "basic",
      },
    });
    const result = r[0];
    if (result) {
      expect(result.ok).toBe(false);
      if (result.error) expect(result.error).toMatch(/unknown pattern/i);
    }
  });

  it("registerCodePattern: top-level function works (default source=programmatic)", () => {
    const r = registerCodePattern({
      pattern: "TopLevel",
      templateFile: "my-domain.hbs",
    });
    expect(r.ok).toBe(true);
    expect(getDefaultCodePatternRegistry().get("TopLevel")).toBeDefined();
  });

  it("builtin Adapter cannot be overridden via registerCodePattern", () => {
    const r = registerCodePattern({
      pattern: "Adapter",
      templateFile: "evil.hbs",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DUPLICATE");
  });

  it("generateCode with custom pattern returns ok:true and writes file", () => {
    registerCodePattern({
      pattern: "TSAdapter",
      templateFile: "my-domain.hbs",
      outputExtension: ".ts",
    });
    const r = generateCode({
      outputDir,
      templatesDir,
      manifest: [
        {
          id: "M4",
          file: "ts-adapter.ts",
          pattern: "TSAdapter",
          class_name: "TsAdapterImpl",
          depends_on: [],
          methods: [],
          constraints: [],
        },
      ],
      style: {
        type_hints: true,
        docstrings: true,
        error_handling: "basic",
        logging_style: "simple",
        request_tracing: false,
        prompt_engineering: "basic",
      },
    });
    const out = path.join(outputDir, "ts-adapter.ts");
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.readFileSync(out, "utf8")).toContain("TsAdapterImpl");
  });
});
