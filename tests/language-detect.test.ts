import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  detectProjectLanguage,
  type DetectedLanguage,
} from "../src/core/language-detect.js";

describe("language-detect", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-lang-"));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  describe("strong signals (project files)", () => {
    it("detects TypeScript via tsconfig.json", () => {
      fs.writeFileSync(path.join(workspace, "tsconfig.json"), "{}");
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("typescript");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("tsconfig");
    });

    it("detects Python via pyproject.toml", () => {
      fs.writeFileSync(path.join(workspace, "pyproject.toml"), "");
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("python");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("pyproject");
    });

    it("detects Python via requirements.txt", () => {
      fs.writeFileSync(path.join(workspace, "requirements.txt"), "fastapi==0.100.0");
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("python");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("pyproject");
    });

    it("detects Go via go.mod", () => {
      fs.writeFileSync(path.join(workspace, "go.mod"), "module example.com/app");
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("go");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("go.mod");
    });

    it("detects Rust via Cargo.toml", () => {
      fs.writeFileSync(path.join(workspace, "Cargo.toml"), "[package]");
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("rust");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("Cargo.toml");
    });

    it("detects Java via pom.xml", () => {
      fs.writeFileSync(path.join(workspace, "pom.xml"), "<project/>");
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("java");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("pom.xml");
    });

    it("detects Java via build.gradle", () => {
      fs.writeFileSync(path.join(workspace, "build.gradle"), "");
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("java");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("pom.xml");
    });
  });

  describe("package.json inference", () => {
    it("detects TypeScript via typescript in devDependencies", () => {
      fs.writeFileSync(
        path.join(workspace, "package.json"),
        JSON.stringify({ devDependencies: { typescript: "^5.0.0" } }),
      );
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("typescript");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("package.json");
    });

    it("detects JavaScript via package.json without typescript", () => {
      fs.writeFileSync(
        path.join(workspace, "package.json"),
        JSON.stringify({ dependencies: { express: "^4.0.0" } }),
      );
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("javascript");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("package.json");
    });

    it("detects JavaScript when package.json is empty", () => {
      fs.writeFileSync(path.join(workspace, "package.json"), "{}");
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("javascript");
      expect(result.confidence).toBe("high");
      expect(result.source).toBe("package.json");
    });
  });

  describe("tsconfig takes priority over package.json", () => {
    it("uses tsconfig when both exist", () => {
      fs.writeFileSync(path.join(workspace, "tsconfig.json"), "{}");
      fs.writeFileSync(
        path.join(workspace, "package.json"),
        JSON.stringify({ devDependencies: { typescript: "^5.0.0" } }),
      );
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("typescript");
      expect(result.source).toBe("tsconfig");
    });
  });

  describe("fallback", () => {
    it("returns unknown when no project files exist", () => {
      const result = detectProjectLanguage(workspace);
      expect(result.primary).toBe("unknown");
      expect(result.confidence).toBe("low");
      expect(result.source).toBe("fallback");
    });
  });

  describe("type contract", () => {
    it("returns DetectedLanguage with required fields", () => {
      fs.writeFileSync(path.join(workspace, "tsconfig.json"), "{}");
      const result: DetectedLanguage = detectProjectLanguage(workspace);
      expect(result).toHaveProperty("primary");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("source");
    });
  });
});
