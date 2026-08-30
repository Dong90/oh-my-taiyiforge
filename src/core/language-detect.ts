import fs from "node:fs";
import path from "node:path";

export type ProjectLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "go"
  | "java"
  | "rust"
  | "unknown";

export type LanguageConfidence = "high" | "medium" | "low";

export type LanguageSource =
  | "tsconfig"
  | "pyproject"
  | "go.mod"
  | "Cargo.toml"
  | "pom.xml"
  | "package.json"
  | "fallback";

export type DetectedLanguage = {
  primary: ProjectLanguage;
  confidence: LanguageConfidence;
  source: LanguageSource;
};

function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readJsonSafe(p: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function detectFromPackageJson(workspaceDir: string): DetectedLanguage | null {
  const pkgPath = path.join(workspaceDir, "package.json");
  if (!fileExists(pkgPath)) return null;
  const pkg = readJsonSafe(pkgPath);
  if (!pkg) return null;
  const deps = {
    ...(pkg.dependencies as Record<string, unknown> | undefined),
    ...(pkg.devDependencies as Record<string, unknown> | undefined),
  };
  if (deps?.typescript) {
    return { primary: "typescript", confidence: "high", source: "package.json" };
  }
  return { primary: "javascript", confidence: "high", source: "package.json" };
}

export function detectProjectLanguage(workspaceDir: string): DetectedLanguage {
  // Strong signals: project config files
  if (fileExists(path.join(workspaceDir, "tsconfig.json"))) {
    return { primary: "typescript", confidence: "high", source: "tsconfig" };
  }
  if (
    fileExists(path.join(workspaceDir, "pyproject.toml")) ||
    fileExists(path.join(workspaceDir, "requirements.txt"))
  ) {
    return { primary: "python", confidence: "high", source: "pyproject" };
  }
  if (fileExists(path.join(workspaceDir, "go.mod"))) {
    return { primary: "go", confidence: "high", source: "go.mod" };
  }
  if (fileExists(path.join(workspaceDir, "Cargo.toml"))) {
    return { primary: "rust", confidence: "high", source: "Cargo.toml" };
  }
  if (
    fileExists(path.join(workspaceDir, "pom.xml")) ||
    fileExists(path.join(workspaceDir, "build.gradle"))
  ) {
    return { primary: "java", confidence: "high", source: "pom.xml" };
  }
  // Medium signal: package.json inference
  const fromPkg = detectFromPackageJson(workspaceDir);
  if (fromPkg) return fromPkg;
  // Fallback
  return { primary: "unknown", confidence: "low", source: "fallback" };
}
