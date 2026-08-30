import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { CodePatternRegistry } from "../src/core/code-pattern-registry.js";

describe("CodePatternRegistry: multi-language support", () => {
  let workspace: string;
  let templatesDir: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-cp-"));
    templatesDir = path.join(workspace, "templates");
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, "py-adapter.hbs"), "# py");
    fs.writeFileSync(path.join(templatesDir, "ts-adapter.hbs"), "// ts");
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("legacy outputExtension field still works (backward compat)", () => {
    const reg = new CodePatternRegistry({ templatesDir });
    const r = reg.register(
      {
        pattern: "MyLegacyAdapter",
        templateFile: "py-adapter.hbs",
        outputExtension: ".py",
        builtin: false,
      },
      "yaml",
    );
    expect(r.ok).toBe(true);
    const got = reg.resolve("MyLegacyAdapter");
    expect(got.ok).toBe(true);
    if (got.ok) {
      expect(got.value.outputExtension).toBe(".py");
    }
  });

  it("registers pattern with outputExtensionMap (multi-lang)", () => {
    const reg = new CodePatternRegistry({ templatesDir });
    const r = reg.register(
      {
        pattern: "MyMultiAdapter",
        templateFile: "ts-adapter.hbs",
        outputExtensionMap: {
          typescript: { templateFile: "ts-adapter.hbs", outputExtension: ".ts" },
          python: { templateFile: "py-adapter.hbs", outputExtension: ".py" },
        },
        languages: ["typescript", "python"],
        builtin: false,
      },
      "yaml",
    );
    expect(r.ok).toBe(true);
  });

  it("resolves pattern with explicit language", () => {
    const reg = new CodePatternRegistry({ templatesDir });
    reg.register(
      {
        pattern: "MyMultiAdapter",
        templateFile: "ts-adapter.hbs",
        outputExtensionMap: {
          typescript: { templateFile: "ts-adapter.hbs", outputExtension: ".ts" },
          python: { templateFile: "py-adapter.hbs", outputExtension: ".py" },
        },
        languages: ["typescript", "python"],
        builtin: false,
      },
      "yaml",
    );
    const got = reg.resolve("MyMultiAdapter", "typescript");
    expect(got.ok).toBe(true);
    if (got.ok) {
      expect(got.value.outputExtension).toBe(".ts");
      expect(got.value.templateFile).toBe("ts-adapter.hbs");
    }
  });

  it("resolves pattern with python language", () => {
    const reg = new CodePatternRegistry({ templatesDir });
    reg.register(
      {
        pattern: "MyMultiAdapter",
        templateFile: "ts-adapter.hbs",
        outputExtensionMap: {
          typescript: { templateFile: "ts-adapter.hbs", outputExtension: ".ts" },
          python: { templateFile: "py-adapter.hbs", outputExtension: ".py" },
        },
        languages: ["typescript", "python"],
        builtin: false,
      },
      "yaml",
    );
    const got = reg.resolve("MyMultiAdapter", "python");
    expect(got.ok).toBe(true);
    if (got.ok) {
      expect(got.value.outputExtension).toBe(".py");
      expect(got.value.templateFile).toBe("py-adapter.hbs");
    }
  });

  it("returns NOT_FOUND when language not in outputExtensionMap", () => {
    const reg = new CodePatternRegistry({ templatesDir });
    reg.register(
      {
        pattern: "MyMultiAdapter",
        templateFile: "ts-adapter.hbs",
        outputExtensionMap: {
          typescript: { templateFile: "ts-adapter.hbs", outputExtension: ".ts" },
        },
        languages: ["typescript"],
        builtin: false,
      },
      "yaml",
    );
    const got = reg.resolve("MyMultiAdapter", "rust");
    expect(got.ok).toBe(false);
    if (!got.ok) {
      expect(got.error.code).toBe("NOT_FOUND");
      expect(got.error.message).toMatch(/rust/);
    }
  });

  it("falls back to outputExtension when language not specified", () => {
    const reg = new CodePatternRegistry({ templatesDir });
    reg.register(
      {
        pattern: "MyMultiAdapter",
        templateFile: "py-adapter.hbs",
        outputExtension: ".py",
        builtin: false,
      },
      "yaml",
    );
    const got = reg.resolve("MyMultiAdapter");
    expect(got.ok).toBe(true);
    if (got.ok) {
      expect(got.value.outputExtension).toBe(".py");
    }
  });

  it("rejects outputExtensionMap with wrong value shape (schema validation)", () => {
    // Schema requires each map value to be { templateFile, outputExtension },
    // not a bare string. A malformed value should fail with VALIDATION.
    const reg = new CodePatternRegistry({ templatesDir });
    const r = reg.register(
      {
        pattern: "MyMultiAdapter",
        templateFile: "ts-adapter.hbs",
        outputExtensionMap: {
          // @ts-expect-error intentionally wrong shape for negative test
          typescript: "nonexistent.hbs",
        },
        builtin: false,
      },
      "yaml",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION");
    }
  });

  it("accepts outputExtensionMap with correct value shape", () => {
    // Sibling test that the same registry *does* accept the right shape,
    // so we know the prior rejection is shape-driven (not random).
    const reg = new CodePatternRegistry({ templatesDir });
    fs.writeFileSync(path.join(templatesDir, "rust-adapter.hbs"), "");
    const r = reg.register(
      {
        pattern: "MyMultiAdapter",
        templateFile: "ts-adapter.hbs",
        outputExtensionMap: {
          rust: { templateFile: "rust-adapter.hbs", outputExtension: ".rs" },
        },
        languages: ["rust"],
        builtin: false,
      },
      "yaml",
    );
    expect(r.ok).toBe(true);
  });
});
