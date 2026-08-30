import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { detectProjectLanguage } from "../src/core/language-detect.js";
import {
  CodePatternRegistry,
  type CodePatternDefinition,
} from "../src/core/code-pattern-registry.js";
import { ExtractorRegistry } from "../src/core/extractor-registry.js";
import { ProfileRegistry } from "../src/core/profile-registry.js";
import { RunnerPolicyRegistry } from "../src/core/runner-policy-registry.js";

/** E2E: For each supported language, given a project directory with the right
 *  marker file, the full by-language machinery should:
 *    1. detectProjectLanguage → correct primary + high confidence
 *    2. CodePatternRegistry.resolve(pattern, language) → correct extension
 *    3. ExtractorRegistry.list(language) → respect language filter
 *    4. ProfileRegistry.list(language) → respect language filter
 *    5. RunnerPolicyRegistry.list(language) → respect language filter
 */

type LangFixture = {
  language: string;
  marker: string;
  ext: string;
};

const FIXTURES: LangFixture[] = [
  { language: "typescript", marker: "tsconfig.json", ext: ".ts" },
  { language: "python", marker: "pyproject.toml", ext: ".py" },
  { language: "go", marker: "go.mod", ext: ".go" },
  { language: "rust", marker: "Cargo.toml", ext: ".rs" },
  { language: "java", marker: "pom.xml", ext: ".java" },
];

function makePattern(lang: string, ext: string): CodePatternDefinition {
  return {
    pattern: "MyLangAdapter",
    templateFile: `${lang}-adapter.hbs`,
    outputExtensionMap: {
      [lang]: { templateFile: `${lang}-adapter.hbs`, outputExtension: ext },
    },
    languages: [lang],
    builtin: false,
  };
}

describe("E2E: by-language pipeline (5 languages × 5 stages)", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-e2e-"));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  for (const fx of FIXTURES) {
    describe(`Project language: ${fx.language}`, () => {
      it("detects project language from marker file", () => {
        fs.writeFileSync(path.join(workspace, fx.marker), "");
        const detected = detectProjectLanguage(workspace);
        expect(detected.primary).toBe(fx.language);
        expect(detected.confidence).toBe("high");
      });

      it("CodePatternRegistry resolves to language-correct extension", () => {
        fs.writeFileSync(path.join(workspace, fx.marker), "");
        const templatesDir = path.join(workspace, "templates");
        fs.mkdirSync(templatesDir, { recursive: true });
        for (const f of FIXTURES) {
          fs.writeFileSync(path.join(templatesDir, `${f.language}-adapter.hbs`), "");
        }
        fs.writeFileSync(path.join(workspace, fx.marker), "");

        const reg = new CodePatternRegistry({ templatesDir });
        const r = reg.register(
          makePattern(fx.language, fx.ext),
          "yaml",
        );
        expect(r.ok).toBe(true);

        const got = reg.resolve("MyLangAdapter", fx.language);
        expect(got.ok).toBe(true);
        if (got.ok) {
          expect(got.value.outputExtension).toBe(fx.ext);
          expect(got.value.templateFile).toBe(`${fx.language}-adapter.hbs`);
        }
      });

      it("ExtractorRegistry.list filters by language", () => {
        const reg = new ExtractorRegistry();
        reg.reset();
        reg.register(
          {
            phase: "change",
            name: "universal",
            extract: () => [],
          },
          "yaml",
        );
        reg.register(
          {
            phase: "change",
            name: `${fx.language}-scoped`,
            languages: [fx.language],
            extract: () => [],
          },
          "yaml",
        );

        // Register an extractor scoped to a different language to verify the
        // filter actually excludes non-matching entries (not a no-op).
        const otherLanguages = ["typescript", "python", "go", "rust", "java"]
          .filter((l) => l !== fx.language);
        const otherLang = otherLanguages[0]!;
        reg.register(
          {
            phase: "change",
            name: `${otherLang}-only-extractor`,
            languages: [otherLang],
            extract: () => [],
          },
          "yaml",
        );

        const hits = reg.list(fx.language).map((e) => e.name);
        expect(hits).toContain("universal");
        expect(hits).toContain(`${fx.language}-scoped`);
        expect(hits).not.toContain(`${otherLang}-only-extractor`);
      });

      it("ProfileRegistry.list filters by language", () => {
        const reg = new ProfileRegistry();
        reg.reset();
        // A profile scoped to the project's language
        reg.register(
          {
            id: `${fx.language}-profile`,
            skipPhases: [],
            arch: "auto",
            languages: [fx.language],
          },
          "yaml",
        );
        // A profile scoped to a DIFFERENT language — used to verify the filter
        // actually excludes non-matching language-scoped profiles (not a no-op).
        const otherLanguages = ["typescript", "python", "go", "rust", "java"]
          .filter((l) => l !== fx.language);
        const otherLang = otherLanguages[0]!;
        reg.register(
          {
            id: `${otherLang}-only-profile`,
            skipPhases: [],
            arch: "auto",
            languages: [otherLang],
          },
          "yaml",
        );
        // A universal profile — always present
        reg.register(
          {
            id: "anywhere",
            skipPhases: [],
            arch: "auto",
          },
          "yaml",
        );

        const ids = reg.list(fx.language).map((p) => p.id);
        expect(ids).toContain(`${fx.language}-profile`);
        expect(ids).toContain("anywhere");
        // Other-language-scoped profile must be filtered out by list(language).
        expect(ids).not.toContain(`${otherLang}-only-profile`);
      });

      it("RunnerPolicyRegistry.list filters by language", () => {
        const reg = new RunnerPolicyRegistry();
        reg.reset();
        reg.register(
          {
            id: `${fx.language}-policy`,
            runner: "autopilot",
            maxIterations: 100,
            maxTokens: 200000,
            autoHarness: false,
            parallelism: 1,
            verifyEachPhase: false,
            languages: [fx.language],
          },
          "yaml",
        );
        reg.register(
          {
            id: "anywhere-policy",
            runner: "autopilot",
            maxIterations: 100,
            maxTokens: 200000,
            autoHarness: false,
            parallelism: 1,
            verifyEachPhase: false,
          },
          "yaml",
        );

        const otherLanguages = ["typescript", "python", "go", "rust", "java"]
          .filter((l) => l !== fx.language);
        const otherLang = otherLanguages[0]!;
        reg.register(
          {
            id: `${otherLang}-only-policy`,
            runner: "autopilot",
            maxIterations: 100,
            maxTokens: 200000,
            autoHarness: false,
            parallelism: 1,
            verifyEachPhase: false,
            languages: [otherLang],
          },
          "yaml",
        );

        const ids = reg.list(fx.language).map((p) => p.id);
        expect(ids).toContain(`${fx.language}-policy`);
        expect(ids).toContain("anywhere-policy");
        expect(ids).not.toContain(`${otherLang}-only-policy`);
      });
    });
  }

  describe("Cross-language: non-matching language returns scoped definitions", () => {
    it("python project gets python extension, not typescript", () => {
      fs.writeFileSync(path.join(workspace, "pyproject.toml"), "");
      const templatesDir = path.join(workspace, "templates");
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(path.join(templatesDir, "python-adapter.hbs"), "");
      fs.writeFileSync(path.join(templatesDir, "typescript-adapter.hbs"), "");

      const reg = new CodePatternRegistry({ templatesDir });
      // Two separate patterns, one per language — same hash approach won't work
      // because CodePattern uses pattern name as identity.
      reg.register(
        {
          pattern: "TsAdapter",
          templateFile: "typescript-adapter.hbs",
          outputExtensionMap: {
            typescript: {
              templateFile: "typescript-adapter.hbs",
              outputExtension: ".ts",
            },
          },
          languages: ["typescript"],
          builtin: false,
        },
        "yaml",
      );
      reg.register(
        {
          pattern: "PyAdapter",
          templateFile: "python-adapter.hbs",
          outputExtensionMap: {
            python: {
              templateFile: "python-adapter.hbs",
              outputExtension: ".py",
            },
          },
          languages: ["python"],
          builtin: false,
        },
        "yaml",
      );

      // A python project resolves PyAdapter → .py
      const gotPy = reg.resolve("PyAdapter", "python");
      expect(gotPy.ok).toBe(true);
      if (gotPy.ok) {
        expect(gotPy.value.outputExtension).toBe(".py");
        expect(gotPy.value.templateFile).toBe("python-adapter.hbs");
      }

      // TsAdapter returns NOT_FOUND for python project
      const gotTs = reg.resolve("TsAdapter", "python");
      expect(gotTs.ok).toBe(false);
    });
  });
});
