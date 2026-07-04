/** Code generation module — reads DESIGN.md module_manifest + code_style,
 *  renders code files via prompt templates. */

import fs from "node:fs";
import path from "node:path";
import { TemplateEngine, type CodeStyleContract, type ModuleManifestEntry } from "./template-engine.js";
import { getLogger } from "./logger.js";
import { getDefaultCodePatternRegistry } from "./code-pattern-registry.js";

const log = getLogger();

/** @deprecated Use CodePatternRegistry instead. Kept as a fallback for any
 *  pattern that isn't registered (e.g. legacy code paths). The default registry
 *  is the source of truth for pattern → template mapping. */
const LEGACY_PATTERN_TO_TEMPLATE: Record<string, string> = {
  Adapter: "adapter.hbs",
  Strategy: "strategy-advanced.hbs",
  Service: "service.hbs",
  Controller: "controller.hbs",
  Middleware: "middleware.hbs",
  ResponseTimeMiddleware: "middleware-response-time.hbs",
  ErrorHandlerMiddleware: "middleware-error-handler.hbs",
  Config: "config.hbs",
  Health: "health.hbs",
  Model: "model.hbs",
  Main: "main.hbs",
  Metrics: "metrics.hbs",
  ExceptionHandler: "exception_handler.hbs",
};

export type CodeGenOptions = {
  /** Output directory root (e.g. project/backend/app) */
  outputDir: string;
  /** Source templates directory (e.g. src/templates/prompts) */
  templatesDir: string;
  /** Module manifest from DESIGN.md */
  manifest: ModuleManifestEntry[];
  /** Code style contract */
  style: CodeStyleContract;
  /** Extra template vars */
  extraVars?: Record<string, unknown>;
  /** Optional frontend output directory */
  frontendDir?: string;
};

export type CodeGenResult = {
  file: string;
  ok: boolean;
  error?: string;
}[];

/** Generate code files from module manifest. Each entry → one file. */
export function generateCode(options: CodeGenOptions): CodeGenResult {
  const engine = new TemplateEngine();
  const results: CodeGenResult = [];

  for (const mod of options.manifest) {
    // Resolve pattern → template via the default registry. Falls back to the
    // legacy hardcoded map if the registry is empty (e.g. tests without
    // setDefaultTemplatesDir called).
    const registry = getDefaultCodePatternRegistry();
    const resolved = registry.resolve(mod.pattern);
    const tplName = resolved.ok
      ? resolved.value.templateFile
      : (LEGACY_PATTERN_TO_TEMPLATE[mod.pattern] ?? undefined);
    if (!tplName) {
      results.push({ file: mod.file, ok: false, error: `unknown pattern: ${mod.pattern}` });
      continue;
    }

    const tplPath = path.join(options.templatesDir, tplName);
    if (!fs.existsSync(tplPath)) {
      results.push({ file: mod.file, ok: false, error: `template not found: ${tplName}` });
      continue;
    }

    try {
      const raw = fs.readFileSync(tplPath, "utf8");
      const vars: Record<string, unknown> = {
        ...mod,
        ...options.extraVars,
        tech_stack: options.extraVars?.tech_stack ?? "Python + FastAPI + OpenAI API",
        description: `Auto-generated ${mod.pattern} — ${mod.class_name}`,
      };
      const output = engine.render(raw, { slug: "code-gen", title: mod.class_name, ...vars });
      const outPath = path.resolve(options.outputDir, mod.file);
      // Defense: prevent path traversal outside outputDir
      if (!outPath.startsWith(path.resolve(options.outputDir))) {
        results.push({ file: mod.file, ok: false, error: `path traversal blocked: ${mod.file}` });
        continue;
      }
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, output, "utf8");
      results.push({ file: mod.file, ok: true });
    } catch (e: any) {
      results.push({ file: mod.file, ok: false, error: e?.message ?? String(e) });
    }
  }

  // Generate shared scaffold files (exceptions, logger, config)
  const sharedDir = path.join(options.outputDir, "core");
  fs.mkdirSync(sharedDir, { recursive: true });
  generateScaffold(options, results);

  return results;
}

function generateScaffold(options: CodeGenOptions, results: CodeGenResult): void {
  const scaffoldDir = path.join(options.templatesDir);
  const sharedDir = path.join(options.outputDir, "core");
  const configDir = path.join(options.outputDir, "config");

  // Skip scaffold files that already exist in manifest
  const hasConfig = options.manifest.some((m) => m.pattern === "Config");

  // exceptions.py (always generated)
  const excTpl = path.join(scaffoldDir, "exceptions.hbs");
  if (fs.existsSync(excTpl)) {
    const output = new TemplateEngine().render(fs.readFileSync(excTpl, "utf8"), { slug: "scaffold", title: "exceptions" });
    const outPath = path.join(sharedDir, "exceptions.py");
    if (!fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, output, "utf8");
      results.push({ file: "core/exceptions.py", ok: true });
    }
  }

  // logger.py (always generated — JSON structured logging)
  const logTpl = path.join(scaffoldDir, "logger.hbs");
  if (fs.existsSync(logTpl)) {
    const output = new TemplateEngine().render(fs.readFileSync(logTpl, "utf8"), { slug: "scaffold", title: "logger" });
    const outPath = path.join(sharedDir, "logger.py");
    if (!fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, output, "utf8");
      results.push({ file: "core/logger.py", ok: true });
    }
  }

  // config/settings.py
  if (!hasConfig) {
    const cfgTpl = path.join(scaffoldDir, "config.hbs");
    if (fs.existsSync(cfgTpl)) {
      fs.mkdirSync(configDir, { recursive: true });
      const output = new TemplateEngine().render(fs.readFileSync(cfgTpl, "utf8"), { slug: "scaffold", title: "Settings" });
      const outPath = path.join(configDir, "settings.py");
      if (!fs.existsSync(outPath)) {
        fs.writeFileSync(outPath, output, "utf8");
        results.push({ file: "config/settings.py", ok: true });
      }
    }
  }

  // conftest.py — pytest test infrastructure
  const testDir = path.join(options.outputDir, "..", "tests");
  const conftestTpl = path.join(scaffoldDir, "conftest.hbs");
  if (fs.existsSync(conftestTpl)) {
    fs.mkdirSync(testDir, { recursive: true });
    const cftVars: Record<string, unknown> = {
      test_layers: ["unit", "integration"],
      app_import: { module: "app.main", name: "app" },
    };
    const output = new TemplateEngine().render(fs.readFileSync(conftestTpl, "utf8"), { slug: "tests", title: "conftest", ...cftVars });
    const outPath = path.join(testDir, "conftest.py");
    if (!fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, output, "utf8");
      results.push({ file: "tests/conftest.py", ok: true });
    }
  }

  // Frontend scaffold (app.js + style.css)
  const frontendDir = options.frontendDir ?? path.join(path.dirname(options.outputDir), "frontend");
  const feVars = { app_name: options.extraVars?.app_name ?? "App", api_base_url: options.extraVars?.api_base_url ?? "http://localhost:8000" };
  const feFiles: [string, string][] = [
    ["frontend-index.hbs", "index.html"],
    ["frontend-app.hbs", "app.js"],
    ["frontend-style.hbs", "style.css"],
    ["frontend-metrics.hbs", "metrics.html"],
    ["frontend-metrics-js.hbs", "metrics.js"],
    ["frontend-metrics-css.hbs", "metrics.css"],
  ];
  for (const [tplName, fileName] of feFiles) {
    const fPath = path.join(scaffoldDir, tplName);
    if (fs.existsSync(fPath)) {
      fs.mkdirSync(frontendDir, { recursive: true });
      const out = new TemplateEngine().render(fs.readFileSync(fPath, "utf8"), { slug: "frontend", title: fileName, ...feVars });
      const outPath = path.join(frontendDir, fileName);
      if (!fs.existsSync(outPath)) {
        fs.writeFileSync(outPath, out, "utf8");
        results.push({ file: "frontend/" + fileName, ok: true });
      }
    }
  }

  // __init__.py files for every package directory
  const packageDirs = new Set<string>();
  packageDirs.add(options.outputDir);  // app/__init__.py
  for (const mod of options.manifest) {
    const dir = path.dirname(path.join(options.outputDir, mod.file));
    packageDirs.add(dir);
  }
  // Also add scaffold directories
  packageDirs.add(path.join(options.outputDir, "core"));
  packageDirs.add(path.join(options.outputDir, "..", "tests"));
  for (const pd of packageDirs) {
    const initPath = path.join(pd, "__init__.py");
    if (!fs.existsSync(initPath)) { fs.mkdirSync(pd, { recursive: true }); fs.writeFileSync(initPath, "", "utf8"); results.push({ file: path.relative(options.outputDir, initPath), ok: true }); }
  }

  // LICENSE + QUICK_START.md + frontend README
  const rootDir = path.dirname(options.outputDir);
  fs.mkdirSync(rootDir, { recursive: true });
  const licensePath = path.join(rootDir, "LICENSE");
  if (!fs.existsSync(licensePath)) { fs.writeFileSync(licensePath, "MIT License\n\nCopyright (c) " + new Date().getFullYear() + " TaiyiForge\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n", "utf8"); results.push({ file: "LICENSE", ok: true }); }
  const quickStartPath = path.join(rootDir, "QUICK_START.md");
  if (!fs.existsSync(quickStartPath)) { fs.writeFileSync(quickStartPath, "# Quick Start\n\n## 1. Install\n```bash\ncd backend && pip install -r requirements.txt\n```\n\n## 2. Configure\n```bash\nexport OPENAI_API_KEY=your-key-here\n```\n\n## 3. Run Backend\n```bash\ncd backend && uvicorn app.main:app --reload --port 8000\n```\n\n## 4. Open Frontend\nOpen `frontend/index.html` in your browser, or run:\n```bash\ncd frontend && python -m http.server 8080\n```\n\n## View Metrics\nOpen `frontend/metrics.html` for the real-time dashboard.\n", "utf8"); results.push({ file: "QUICK_START.md", ok: true }); }
  const frontendReadmePath = path.join(frontendDir, "README.md");
  if (!fs.existsSync(frontendReadmePath)) { fs.mkdirSync(frontendDir, { recursive: true }); fs.writeFileSync(frontendReadmePath, "# Frontend\n\nOpen `index.html` in your browser or use:\n```bash\ncd frontend && python -m http.server 8080\n```\n## Pages\n- `index.html` — Main application\n- `metrics.html` — Real-time metrics dashboard\n\n## Configure API URL\nEdit `app.js` to change `API_BASE_URL` to match your backend.\n", "utf8"); results.push({ file: "frontend/README.md", ok: true }); }

  // package.json + requirements.txt — project root
  const scaffoldFiles: [string, string, Record<string, unknown>][] = [
    ["package.hbs", "package.json", { app_name: "auto-plan-app", version: "1.0.0" }],
    ["requirements.hbs", "requirements.txt", {}],
  ];
  for (const [tplName, fileName, vars] of scaffoldFiles) {
    const tpl = path.join(scaffoldDir, tplName);
    if (fs.existsSync(tpl)) {
      const out = new TemplateEngine().render(fs.readFileSync(tpl, "utf8"), { slug: "root", title: fileName, ...vars });
      const outPath = path.join(rootDir, fileName);
      if (!fs.existsSync(outPath)) { fs.writeFileSync(outPath, out, "utf8"); results.push({ file: fileName, ok: true }); }
    }
  }

  // Save code_style.yaml for reference
  const yamlOut = path.join(options.outputDir, "..", ".taiyi", "code-style.yaml");
  fs.mkdirSync(path.dirname(yamlOut), { recursive: true });
  const yaml = [
    `project:`,
    `  language: python`,
    `  min_version: "3.10"`,
    ``,
    `type_safety:`,
    `  type_hints: ${options.style.type_hints}`,
    `  docstrings: ${options.style.docstrings}`,
    ``,
    `error_handling:`,
    `  level: ${options.style.error_handling}`,
    `  custom_exceptions: true`,
    `  error_codes: true`,
    `  input_validation: true`,
    ``,
    `logging:`,
    `  style: ${options.style.logging_style}`,
    `  request_tracing: ${options.style.request_tracing}`,
    ``,
    `prompt_engineering:`,
    `  style: ${options.style.prompt_engineering}`,
    ``,
    `testing:`,
    `  framework: pytest`,
    `  coverage_target: 85`,
    `  layers: [unit, integration]`,
  ].join("\n");
  fs.writeFileSync(yamlOut, yaml + "\n", "utf8");
  results.push({ file: ".taiyi/code-style.yaml", ok: true });

  log.info("Code generation complete", { files: results.filter((r) => r.ok).length, errors: results.filter((r) => !r.ok).length });
}

/** Generate code from a change directory (reads DESIGN.md + state for manifest). */
export function generateCodeFromChange(
  changeDir: string,
  templatesDir: string,
  outputDir: string,
): CodeGenResult {
  // Read DESIGN.md json companion for module_manifest and code_style
  const jsonPath = path.join(changeDir, "design.json");
  if (!fs.existsSync(jsonPath)) {
    return [{ file: "", ok: false, error: "design.json not found — run DESIGN phase first" }];
  }

  let design: any;
  try {
    design = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch {
    return [{ file: "", ok: false, error: "design.json parse error" }];
  }

  const manifest: ModuleManifestEntry[] = design?.module_manifest ?? [];
  const style: CodeStyleContract = design?.code_style ?? {
    type_hints: true,
    docstrings: true,
    error_handling: "basic",
    logging_style: "simple",
    request_tracing: false,
    prompt_engineering: "basic",
  };

  if (manifest.length === 0) {
    return [{ file: "", ok: false, error: "module_manifest is empty — add it in DESIGN.md Step 13" }];
  }

  const promptTemplateDir = path.join(templatesDir, "prompts");
  if (!fs.existsSync(promptTemplateDir)) {
    return [{ file: "", ok: false, error: "prompt templates not found: " + promptTemplateDir }];
  }

  return generateCode({
    outputDir,
    templatesDir: promptTemplateDir,
    manifest,
    style,
    extraVars: {
      tech_stack: design?.techStack?.selected ?? "Python + FastAPI",
    },
  });
}
