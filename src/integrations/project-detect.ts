import fs from "node:fs";
import path from "node:path";

// ── types ──

export type DetectedLanguage =
  | "typescript" | "javascript" | "go" | "python" | "rust"
  | "java" | "kotlin" | "scala" | "csharp"
  | "ruby" | "php" | "swift" | "dart"
  | "elixir" | "haskell" | "zig" | "lua"
  | "cpp" | "terraform" | "shell";

export type DetectedFramework =
  | "react" | "vue" | "angular" | "nextjs" | "svelte" | "nuxt"
  | "express" | "fastapi" | "django" | "flask"
  | "gin" | "spring" | "rails" | "laravel"
  | "remix" | "astro";

export type DetectedInfra =
  | "docker" | "kubernetes" | "github-actions" | "gitlab-ci";

export type DetectedDb =
  | "prisma" | "typeorm" | "drizzle" | "alembic" | "django-orm" | "sqlalchemy" | "gorm";

export type DetectedTest =
  | "vitest" | "jest" | "playwright" | "cypress" | "pytest" | "junit";

export type ProjectTech = {
  languages: DetectedLanguage[];
  frameworks: DetectedFramework[];
  infra: DetectedInfra[];
  databases: DetectedDb[];
  tests: DetectedTest[];
  allTags: string[];
};

// ── dependency-based detection ──

function readPkgJson(workspaceDir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(workspaceDir, "package.json"), "utf8"));
  } catch { return null; }
}

function readPyproject(workspaceDir: string): string {
  try { return fs.readFileSync(path.join(workspaceDir, "pyproject.toml"), "utf8"); } catch { return ""; }
}

function readGoMod(workspaceDir: string): string {
  try { return fs.readFileSync(path.join(workspaceDir, "go.mod"), "utf8"); } catch { return ""; }
}

function readGradle(workspaceDir: string): string {
  for (const f of ["build.gradle", "build.gradle.kts"]) {
    try { return fs.readFileSync(path.join(workspaceDir, f), "utf8"); } catch { continue; }
  }
  return "";
}

function readGemfile(workspaceDir: string): string {
  try { return fs.readFileSync(path.join(workspaceDir, "Gemfile"), "utf8"); } catch { return ""; }
}

function readComposer(workspaceDir: string): Record<string, unknown> | null {
  try { return JSON.parse(fs.readFileSync(path.join(workspaceDir, "composer.json"), "utf8")); } catch { return null; }
}

function hasDep(pkg: Record<string, unknown> | null, ...names: string[]): boolean {
  if (!pkg) return false;
  const deps = { ...(pkg.dependencies as object ?? {}), ...(pkg.devDependencies as object ?? {}) };
  return names.some((n) => n in deps);
}

// ── language detection ──

type Detector = { file: string; language: DetectedLanguage };

const LANG_DETECTORS: Detector[] = [
  { file: "go.mod", language: "go" },
  { file: "tsconfig.json", language: "typescript" },
  { file: "pyproject.toml", language: "python" },
  { file: "requirements.txt", language: "python" },
  { file: "Cargo.toml", language: "rust" },
  { file: "pom.xml", language: "java" },
  { file: "build.sbt", language: "scala" },
  { file: "Gemfile", language: "ruby" },
  { file: "composer.json", language: "php" },
  { file: "Package.swift", language: "swift" },
  { file: "pubspec.yaml", language: "dart" },
  { file: "mix.exs", language: "elixir" },
  { file: "build.zig", language: "zig" },
  { file: "CMakeLists.txt", language: "cpp" },
  { file: ".luarc.json", language: "lua" },
  { file: "Makefile", language: "shell" },
];

function detectKotlin(dir: string): boolean {
  try { return ["build.gradle.kts", "settings.gradle.kts"].some((f) => fs.existsSync(path.join(dir, f))); } catch { return false; }
}

function detectCsharp(dir: string): boolean {
  try { return fs.readdirSync(dir).some((e) => e.endsWith(".csproj") || e.endsWith(".sln")); } catch { return false; }
}

function detectHaskell(dir: string): boolean {
  try {
    if (fs.existsSync(path.join(dir, "stack.yaml"))) return true;
    return fs.readdirSync(dir).some((e) => e.endsWith(".cabal"));
  } catch { return false; }
}

function detectTerraform(dir: string): boolean {
  try {
    const walk = (d: string, depth: number): boolean => {
      if (depth <= 0) return false;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isFile() && e.name.endsWith(".tf")) return true;
        if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules") {
          if (walk(path.join(d, e.name), depth - 1)) return true;
        }
      }
      return false;
    };
    return walk(dir, 3);
  } catch { return false; }
}

// ── framework detection ──

function detectFrameworks(dir: string): DetectedFramework[] {
  const found: DetectedFramework[] = [];
  const seen = new Set<string>();

  const pkg = readPkgJson(dir);
  if (pkg) {
    if (hasDep(pkg, "react")) { found.push("react"); seen.add("react"); }
    if (pkg.dependencies && "next" in (pkg.dependencies as object)) { found.push("nextjs"); seen.add("nextjs"); }
    if (hasDep(pkg, "vue")) { found.push("vue"); seen.add("vue"); }
    if (hasDep(pkg, "nuxt")) { found.push("nuxt"); seen.add("nuxt"); }
    if (hasDep(pkg, "@angular/core")) { found.push("angular"); seen.add("angular"); }
    if (hasDep(pkg, "svelte")) { found.push("svelte"); seen.add("svelte"); }
    if (hasDep(pkg, "express")) { found.push("express"); seen.add("express"); }
    if (hasDep(pkg, "@remix-run/react")) { found.push("remix"); seen.add("remix"); }
    if (hasDep(pkg, "astro")) { found.push("astro"); seen.add("astro"); }
  }

  const py = readPyproject(dir);
  if (py.includes("django")) { found.push("django"); seen.add("django"); }
  if (py.includes("fastapi")) { found.push("fastapi"); seen.add("fastapi"); }
  if (py.includes("flask")) { found.push("flask"); seen.add("flask"); }

  const gomod = readGoMod(dir);
  if (gomod.includes("gin-gonic")) { found.push("gin"); seen.add("gin"); }

  const gradle = readGradle(dir);
  if (gradle.includes("spring")) { found.push("spring"); seen.add("spring"); }

  const gem = readGemfile(dir);
  if (gem.includes("rails")) { found.push("rails"); seen.add("rails"); }

  const composer = readComposer(dir);
  if (composer?.require && "laravel/framework" in (composer.require as object)) {
    found.push("laravel"); seen.add("laravel");
  }

  return found;
}

// ── infra detection ──

function detectInfra(dir: string): DetectedInfra[] {
  const found: DetectedInfra[] = [];
  if (fs.existsSync(path.join(dir, "Dockerfile")) || fs.existsSync(path.join(dir, "docker-compose.yml")) || fs.existsSync(path.join(dir, "docker-compose.yaml"))) {
    found.push("docker");
  }
  try {
    const k8s = fs.readdirSync(dir).some((e) => e.endsWith(".yaml") || e.endsWith(".yml"));
    if (k8s) {
      for (const f of fs.readdirSync(dir)) {
        if (/^(deployment|service|ingress|configmap|kustomization)\.ya?ml$/.test(f)) {
          found.push("kubernetes"); break;
        }
      }
    }
  } catch { /* ok */ }
  if (fs.existsSync(path.join(dir, ".github", "workflows"))) found.push("github-actions");
  if (fs.existsSync(path.join(dir, ".gitlab-ci.yml"))) found.push("gitlab-ci");
  return found;
}

// ── database detection ──

function detectDatabases(dir: string): DetectedDb[] {
  const found: DetectedDb[] = [];
  const pkg = readPkgJson(dir);
  if (pkg) {
    if (hasDep(pkg, "prisma", "@prisma/client")) found.push("prisma");
    if (hasDep(pkg, "typeorm")) found.push("typeorm");
    if (hasDep(pkg, "drizzle-orm")) found.push("drizzle");
  }
  if (fs.existsSync(path.join(dir, "alembic")) || fs.existsSync(path.join(dir, "alembic.ini"))) found.push("alembic");
  const py = readPyproject(dir);
  if (py.includes("django")) found.push("django-orm");
  if (py.includes("sqlalchemy")) found.push("sqlalchemy");
  const gomod = readGoMod(dir);
  if (gomod.includes("gorm.io")) found.push("gorm");
  return found;
}

// ── test detection ──

function detectTests(dir: string): DetectedTest[] {
  const found: DetectedTest[] = [];
  const pkg = readPkgJson(dir);
  if (pkg) {
    if (hasDep(pkg, "vitest")) found.push("vitest");
    if (hasDep(pkg, "jest")) found.push("jest");
    if (hasDep(pkg, "@playwright/test")) found.push("playwright");
    if (hasDep(pkg, "cypress")) found.push("cypress");
  }
  const py = readPyproject(dir);
  if (py.includes("pytest")) found.push("pytest");
  if (fs.existsSync(path.join(dir, "pom.xml"))) found.push("junit");
  return found;
}

// ── unified detection ──

const cacheMap = new Map<string, ProjectTech>();

export function detectProjectTechStack(workspaceDir: string): ProjectTech {
  const resolved = path.resolve(workspaceDir);
  if (cacheMap.has(resolved)) return cacheMap.get(resolved)!;

  const manual = process.env.TAIYI_LANGUAGES;
  let languages: DetectedLanguage[];

  if (manual) {
    const valid = new Set<string>(["go", "typescript", "javascript", "python", "rust", "java", "kotlin", "scala", "csharp", "ruby", "php", "swift", "dart", "elixir", "haskell", "zig", "lua", "cpp", "terraform", "shell"]);
    languages = manual.split(",").map((s) => s.trim().toLowerCase()).filter((s) => valid.has(s)) as DetectedLanguage[];
  } else {
    languages = [];
    const seen = new Set<string>();
    for (const { file, language } of LANG_DETECTORS) {
      if (seen.has(language)) continue;
      if (fs.existsSync(path.join(workspaceDir, file))) {
        languages.push(language); seen.add(language);
      }
    }
    for (const [fn, lang] of [
      [detectKotlin, "kotlin" as const], [detectCsharp, "csharp" as const],
      [detectHaskell, "haskell" as const], [detectTerraform, "terraform" as const],
    ] as const) {
      if (!seen.has(lang) && fn(workspaceDir)) { languages.push(lang); seen.add(lang); }
    }
    if (!seen.has("typescript") && !seen.has("javascript") && fs.existsSync(path.join(workspaceDir, "package.json"))) {
      languages.push("javascript");
    }
  }

  const frameworks = detectFrameworks(workspaceDir);
  const infra = detectInfra(workspaceDir);
  const databases = detectDatabases(workspaceDir);
  const tests = detectTests(workspaceDir);

  const allTags = [
    ...languages,
    ...frameworks,
    ...infra,
    ...databases,
    ...tests,
  ];

  const result = { languages, frameworks, infra, databases, tests, allTags };
  cacheMap.set(resolved, result);
  return result;
}

export function resetProjectTechCache(): void { cacheMap.clear(); }
