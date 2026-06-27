import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { generateCode, generateCodeFromChange, type CodeGenOptions } from "../../src/core/code-gen.js";

const promptDir = path.resolve(import.meta.dirname, "../../src/templates/prompts");

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-codegen-test-"));
});

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

function makeOpts(overrides: Partial<CodeGenOptions> = {}): CodeGenOptions {
  return {
    outputDir: path.join(tmpDir, "backend", "app"),
    templatesDir: promptDir,
    manifest: [
      { id: "M1", file: "adapters/base.py", pattern: "Adapter" as const, class_name: "LLMAdapter", depends_on: [], methods: [{ name: "complete", return_type: "str", is_abstract: true }], constraints: [] },
      { id: "M2", file: "strategies/base.py", pattern: "Strategy" as const, class_name: "TranslationStrategy", depends_on: ["M1"], methods: [{ name: "format_prompt", return_type: "str", is_abstract: true }], constraints: [], prompt_style: "advanced" as const },
      { id: "M3", file: "controllers/health_controller.py", pattern: "Health" as const, class_name: "health_router", depends_on: [], methods: [{ name: "health", return_type: "dict", is_abstract: false }], constraints: [] },
      { id: "M4", file: "config/settings.py", pattern: "Config" as const, class_name: "Settings", depends_on: [], methods: [], constraints: [] },
      { id: "M5", file: "models/request.py", pattern: "Model" as const, class_name: "TranslationRequest", depends_on: [], methods: [], constraints: [] },
      { id: "M6", file: "services/translation_service.py", pattern: "Service" as const, class_name: "TranslationService", depends_on: ["M1", "M2"], methods: [{ name: "translate", return_type: "str", is_abstract: false }], constraints: [] },
      { id: "M7", file: "controllers/translation_controller.py", pattern: "Controller" as const, class_name: "router", depends_on: ["M6"], methods: [{ name: "translate", return_type: "JSONResponse", is_abstract: false }], constraints: [] },
      { id: "M8", file: "middleware/logging.py", pattern: "Middleware" as const, class_name: "LoggingMiddleware", depends_on: [], methods: [{ name: "dispatch", return_type: "Response", is_abstract: false }], constraints: [] },
      { id: "M9", file: "app/main.py", pattern: "Main" as const, class_name: "app", depends_on: ["M7", "M8", "M3"], methods: [], constraints: [] },
    ],
    style: {
      type_hints: true, docstrings: true,
      error_handling: "defensive" as const,
      logging_style: "json" as const,
      request_tracing: true,
      prompt_engineering: "advanced" as const,
    },
    extraVars: { app_name: "TestApp", api_base_url: "http://localhost:8000", tech_stack: "Python + FastAPI" },
    ...overrides,
  };
}

describe("generateCode — happy path", () => {
  it("generates a file for each manifest entry", () => {
    const opts = makeOpts();
    const result = generateCode(opts);
    expect(result.filter((r) => r.ok).length).toBeGreaterThanOrEqual(9);
    expect(result.filter((r) => !r.ok).length).toBe(0);
  });

  it("writes actual files to outputDir", () => {
    const opts = makeOpts();
    generateCode(opts);
    expect(fs.existsSync(path.join(opts.outputDir, "adapters", "base.py"))).toBe(true);
    expect(fs.existsSync(path.join(opts.outputDir, "strategies", "base.py"))).toBe(true);
    expect(fs.existsSync(path.join(opts.outputDir, "config", "settings.py"))).toBe(true);
    expect(fs.existsSync(path.join(opts.outputDir, "controllers", "health_controller.py"))).toBe(true);
  });

  it("generated file contains expected class and imports", () => {
    const opts = makeOpts();
    generateCode(opts);
    const adapter = fs.readFileSync(path.join(opts.outputDir, "adapters", "base.py"), "utf8");
    expect(adapter).toContain("class LLMAdapter");
    expect(adapter).toContain("async def complete");
    expect(adapter).toContain("from typing import AsyncIterator");
  });

  it("generated strategy file contains XML tag prompt pattern", () => {
    const opts = makeOpts();
    generateCode(opts);
    const strategy = fs.readFileSync(path.join(opts.outputDir, "strategies", "base.py"), "utf8");
    expect(strategy).toContain("class TranslationStrategy");
    expect(strategy).toContain("<角色>");
    expect(strategy).toContain("<规则限制>");
  });

  it("generates scaffold files: exceptions, logger, conftest, code-style.yaml", () => {
    const opts = makeOpts();
    const result = generateCode(opts);
    const scaffoldFiles = result.map((r) => r.file);
    expect(scaffoldFiles).toContain("core/exceptions.py");
    expect(scaffoldFiles).toContain("core/logger.py");
    expect(scaffoldFiles).toContain("tests/conftest.py");
    expect(scaffoldFiles).toContain(".taiyi/code-style.yaml");
  });

  it("generated config contains pydantic-settings BaseSettings", () => {
    const opts = makeOpts();
    generateCode(opts);
    const cfg = fs.readFileSync(path.join(opts.outputDir, "config", "settings.py"), "utf8");
    expect(cfg).toContain("class Settings(BaseSettings)");
    expect(cfg).toContain("openai_api_key");
    expect(cfg).toContain("pydantic-settings");
  });

  it("generates frontend files when frontendDir is provided", () => {
    const opts = makeOpts({ frontendDir: path.join(tmpDir, "frontend") });
    const result = generateCode(opts);
    const scaffoldFiles = result.map((r) => r.file);
    expect(scaffoldFiles).toContain("frontend/index.html");
    expect(scaffoldFiles).toContain("frontend/app.js");
    expect(scaffoldFiles).toContain("frontend/style.css");
    expect(fs.existsSync(path.join(tmpDir, "frontend", "index.html"))).toBe(true);
  });

  it("frontend app.js contains API client functions", () => {
    const opts = makeOpts({ frontendDir: path.join(tmpDir, "frontend") });
    generateCode(opts);
    const appJs = fs.readFileSync(path.join(tmpDir, "frontend", "app.js"), "utf8");
    expect(appJs).toContain("API_BASE_URL");
    expect(appJs).toContain("async function apiPost");
    expect(appJs).toContain("async function apiPostStream");
    expect(appJs).toContain("onChunk");
    expect(appJs).toContain("[DONE]");
  });
});

describe("generateCode — error paths", () => {
  it("returns error for unknown pattern", () => {
    const opts = makeOpts({
      manifest: [{ id: "M99", file: "unknown.py", pattern: "UnknownPattern" as any, class_name: "X", depends_on: [], methods: [], constraints: [] }],
    });
    const result = generateCode(opts);
    expect(result[0].ok).toBe(false);
    expect(result[0].error).toContain("unknown pattern");
  });

  it("returns error when template file is missing", () => {
    const opts = makeOpts({
      outputDir: path.join(tmpDir, "out"),
      templatesDir: "/nonexistent/dir",
    });
    const result = generateCode(opts);
    // All files should be errors (template not found)
    const errors = result.filter((r) => !r.ok);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].error).toContain("template not found");
  });

  it("handles empty manifest gracefully", () => {
    const opts = makeOpts({ manifest: [] });
    const result = generateCode(opts);
    // No generation errors (empty input), but scaffold still runs
    expect(result.every((r) => r.ok)).toBe(true);
  });
});

describe("generateCode — scaffold behavior", () => {
  it("does not overwrite existing files", () => {
    const opts = makeOpts();
    // First pass
    generateCode(opts);
    const excPath = path.join(opts.outputDir, "core", "exceptions.py");
    expect(fs.existsSync(excPath)).toBe(true);
    const firstStat = fs.statSync(excPath);

    // Second pass with different manifest
    generateCode(opts);
    const secondStat = fs.statSync(excPath);
    // File should NOT be overwritten (same mtime)
    expect(firstStat.mtimeMs).toBe(secondStat.mtimeMs);
  });

  it("skips config generation when manifest already has Config pattern", () => {
    const opts = makeOpts({
      manifest: [
        { id: "M1", file: "config/settings.py", pattern: "Config" as const, class_name: "Settings", depends_on: [], methods: [], constraints: [] },
      ],
    });
    const result = generateCode(opts);
    const configFiles = result.filter((r) => r.file.startsWith("config/") && r.ok && !r.file.endsWith("__init__.py"));
    // Only the manifest entry (not scaffold __init__.py)
    expect(configFiles.length).toBe(1);
  });

  it("generates logger.py with JSON structured logging pattern", () => {
    const opts = makeOpts();
    generateCode(opts);
    const logger = fs.readFileSync(path.join(opts.outputDir, "core", "logger.py"), "utf8");
    expect(logger).toContain("class JSONFormatter");
    expect(logger).toContain("class StructuredLogger");
    expect(logger).toContain("contextvars");
    expect(logger).toContain("def performance(");
  });

  it("generates code-style.yaml with correct content", () => {
    const opts = makeOpts();
    generateCode(opts);
    const yamlPath = path.join(tmpDir, "backend", ".taiyi", "code-style.yaml");
    expect(fs.existsSync(yamlPath)).toBe(true);
    const yaml = fs.readFileSync(yamlPath, "utf8");
    expect(yaml).toContain("type_hints: true");
    expect(yaml).toContain("level: defensive");
    expect(yaml).toContain("framework: pytest");
  });
});

describe("generateCodeFromChange — integration", () => {
  it("reads design.json and generates code", () => {
    const changeDir = path.join(tmpDir, "change");
    fs.mkdirSync(changeDir, { recursive: true });

    const designJson = {
      title: "Test Change",
      techStack: { selected: "Python + FastAPI" },
      module_manifest: [
        { id: "M1", file: "adapters/base.py", pattern: "Adapter", class_name: "TestAdapter", depends_on: [], methods: [], constraints: [] },
        { id: "M2", file: "config/settings.py", pattern: "Config", class_name: "Settings", depends_on: [], methods: [], constraints: [] },
      ],
      code_style: { type_hints: true, docstrings: true, error_handling: "basic", logging_style: "simple", request_tracing: false, prompt_engineering: "basic" },
    };
    fs.writeFileSync(path.join(changeDir, "design.json"), JSON.stringify(designJson));

    const result = generateCodeFromChange(changeDir, path.resolve(import.meta.dirname, "../../src/templates"), tmpDir);
    expect(result.filter((r) => r.ok).length).toBeGreaterThanOrEqual(2);
    expect(result.filter((r) => !r.ok).length).toBe(0);
  });

  it("returns error when design.json is missing", () => {
    const changeDir = path.join(tmpDir, "empty-change");
    fs.mkdirSync(changeDir, { recursive: true });
    const result = generateCodeFromChange(changeDir, "/nonexistent/templates", tmpDir);
    expect(result[0].ok).toBe(false);
    expect(result[0].error).toContain("design.json not found");
  });

  it("returns error when module_manifest is empty", () => {
    const changeDir = path.join(tmpDir, "change");
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, "design.json"), JSON.stringify({ module_manifest: [], code_style: {} }));
    const result = generateCodeFromChange(changeDir, path.resolve(import.meta.dirname, "../../src/templates"), tmpDir);
    expect(result[0].ok).toBe(false);
    expect(result[0].error).toContain("module_manifest is empty");
  });

  it("returns error when design.json is malformed", () => {
    const changeDir = path.join(tmpDir, "bad-change");
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, "design.json"), "not json {");
    const result = generateCodeFromChange(changeDir, "/nonexistent/templates", tmpDir);
    expect(result[0].ok).toBe(false);
    expect(result[0].error).toContain("parse error");
  });
});
