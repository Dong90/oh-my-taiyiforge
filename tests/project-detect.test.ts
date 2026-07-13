import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  detectProjectTechStack,
  resetProjectTechCache,
} from "../src/integrations/project-detect.js";

describe("project-detect", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-detect-"));
    resetProjectTechCache();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("detects TypeScript project", () => {
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("typescript");
  });

  it("detects Go project", () => {
    fs.writeFileSync(path.join(dir, "go.mod"), "module test");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("go");
  });

  it("detects Python via pyproject.toml", () => {
    fs.writeFileSync(path.join(dir, "pyproject.toml"), "[project]\nname='test'");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("python");
  });

  it("detects Python via requirements.txt", () => {
    fs.writeFileSync(path.join(dir, "requirements.txt"), "flask==2.0");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("python");
  });

  it("detects Rust project", () => {
    fs.writeFileSync(path.join(dir, "Cargo.toml"), "[package]\nname='test'");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("rust");
  });

  it("detects Java via pom.xml", () => {
    fs.writeFileSync(path.join(dir, "pom.xml"), "<project></project>");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("java");
  });

  it("detects Kotlin via build.gradle.kts", () => {
    fs.writeFileSync(path.join(dir, "build.gradle.kts"), "");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("kotlin");
  });

  it("detects C# via .csproj", () => {
    fs.writeFileSync(path.join(dir, "test.csproj"), "");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("csharp");
  });

  it("detects Haskell via stack.yaml", () => {
    fs.writeFileSync(path.join(dir, "stack.yaml"), "");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("haskell");
  });

  it("detects Terraform via .tf files", () => {
    fs.mkdirSync(path.join(dir, "infra"), { recursive: true });
    fs.writeFileSync(path.join(dir, "infra", "main.tf"), "");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("terraform");
  });

  it("detects JavaScript via package.json (no tsconfig)", () => {
    fs.writeFileSync(path.join(dir, "package.json"), '{"name":"test"}');
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("javascript");
    expect(tech.languages).not.toContain("typescript");
  });

  it("detects TypeScript over JavaScript when both present", () => {
    fs.writeFileSync(path.join(dir, "package.json"), '{"name":"test"}');
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toContain("typescript");
    expect(tech.languages).not.toContain("javascript");
  });

  it("detects multiple languages", () => {
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    fs.writeFileSync(path.join(dir, "go.mod"), "module test");
    fs.writeFileSync(path.join(dir, "pyproject.toml"), "[project]");
    const tech = detectProjectTechStack(dir);
    expect(tech.languages.length).toBeGreaterThanOrEqual(3);
    expect(tech.languages).toContain("typescript");
    expect(tech.languages).toContain("go");
    expect(tech.languages).toContain("python");
  });

  it("detects no languages for empty directory", () => {
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toEqual([]);
    expect(tech.allTags).toEqual([]);
  });

  it("manual override via TAIYI_LANGUAGES", () => {
    process.env.TAIYI_LANGUAGES = "go,python";
    resetProjectTechCache();
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toEqual(["go", "python"]);
    delete process.env.TAIYI_LANGUAGES;
  });

  it("manual override ignores invalid values", () => {
    process.env.TAIYI_LANGUAGES = "go,foobar,python";
    resetProjectTechCache();
    const tech = detectProjectTechStack(dir);
    expect(tech.languages).toEqual(["go", "python"]);
    delete process.env.TAIYI_LANGUAGES;
  });

  it("detects Docker", () => {
    fs.writeFileSync(path.join(dir, "Dockerfile"), "FROM node:22");
    const tech = detectProjectTechStack(dir);
    expect(tech.infra).toContain("docker");
  });

  it("detects docker-compose", () => {
    fs.writeFileSync(path.join(dir, "docker-compose.yml"), "");
    const tech = detectProjectTechStack(dir);
    expect(tech.infra).toContain("docker");
  });

  it("detects GitHub Actions", () => {
    fs.mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".github", "workflows", "ci.yml"), "");
    const tech = detectProjectTechStack(dir);
    expect(tech.infra).toContain("github-actions");
  });

  it("detects Vitest", () => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "test",
      devDependencies: { vitest: "^1.0.0" },
    }));
    const tech = detectProjectTechStack(dir);
    expect(tech.tests).toContain("vitest");
  });

  it("detects Prisma", () => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "test",
      dependencies: { "@prisma/client": "^5.0.0", prisma: "^5.0.0" },
    }));
    const tech = detectProjectTechStack(dir);
    expect(tech.databases).toContain("prisma");
  });

  it("detects React framework", () => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "test",
      dependencies: { react: "^18.0.0" },
    }));
    const tech = detectProjectTechStack(dir);
    expect(tech.frameworks).toContain("react");
  });

  it("cache is isolated by directory", () => {
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-detect2-"));
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    fs.writeFileSync(path.join(dir2, "go.mod"), "module test");
    resetProjectTechCache();
    const t1 = detectProjectTechStack(dir);
    const t2 = detectProjectTechStack(dir2);
    expect(t1.languages).toContain("typescript");
    expect(t2.languages).toContain("go");
    fs.rmSync(dir2, { recursive: true, force: true });
  });

  it("allTags combines all dimensions", () => {
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    fs.writeFileSync(path.join(dir, "Dockerfile"), "FROM node:22");
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "test",
      dependencies: { react: "^18.0.0" },
      devDependencies: { vitest: "^1.0.0" },
    }));
    resetProjectTechCache();
    const tech = detectProjectTechStack(dir);
    expect(tech.allTags).toContain("typescript");
    expect(tech.allTags).toContain("react");
    expect(tech.allTags).toContain("docker");
    expect(tech.allTags).toContain("vitest");
    expect(tech.allTags.length).toBe(4);
  });
});
