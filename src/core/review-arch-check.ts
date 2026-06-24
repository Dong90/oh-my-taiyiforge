import fs from "node:fs";
import path from "node:path";
import type { ArchitectureTemplate } from "./types.js";

export type ArchCheckFinding = {
  label: string;
  passed: boolean;
  actual?: number;
  expected?: number;
  detail?: string;
};

export type ArchCheckResult = {
  passed: boolean;
  findings: ArchCheckFinding[];
};

/** Recursively list all files in a directory, excluding node_modules and hidden dirs. */
function listSourceFiles(dir: string, exts: string[]): string[] {
  const result: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "__pycache__") {
          result.push(...listSourceFiles(full, exts));
        }
      } else if (exts.some((e) => entry.name.endsWith(e))) {
        result.push(full);
      }
    }
  } catch {
    /* permission denied or missing — skip */
  }
  return result;
}

/** Check dirs under project root match expected prefixes. */
function checkExpectedDirs(projectDir: string, expectedDirs: string[], sourceFiles: string[]): ArchCheckFinding[] {
  if (expectedDirs.length === 0) return [];

  const found: string[] = [];
  for (const dirRel of expectedDirs) {
    const abs = path.join(projectDir, dirRel);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      found.push(dirRel);
    }
  }

  const missing = expectedDirs.filter((d) => !found.includes(d));
  if (missing.length > 0) {
    return [
      {
        label: "预期架构目录",
        passed: found.length >= expectedDirs.length * 0.5,
        detail: missing.length > 0
          ? `缺少目录: ${missing.join(", ")} (发现 ${found.length}/${expectedDirs.length})`
          : undefined,
      },
    ];
  }
  return [];
}

/** Grep source files for expected patterns. */
function checkExpectedPatterns(projectDir: string, templates: ArchitectureTemplate): ArchCheckFinding[] {
  if (templates.expectedPatterns.length === 0) return [];

  const findings: ArchCheckFinding[] = [];
  for (const p of templates.expectedPatterns) {
    const searchDir = p.path ? path.join(projectDir, p.path) : projectDir;
    if (!fs.existsSync(searchDir)) {
      findings.push({
        label: p.label,
        passed: false,
        detail: `搜索路径不存在: ${p.path}`,
      });
      continue;
    }
    const files = listSourceFiles(searchDir, [".ts", ".js", ".tsx", ".jsx", ".py"]);
    const match = files.some((f) => {
      const content = fs.readFileSync(f, "utf8");
      return new RegExp(p.grep, "i").test(content);
    });
    findings.push({
      label: p.label,
      passed: match,
      detail: match ? undefined : `未在 ${p.path ?? "项目文件"} 中匹配模式: /${p.grep}/`,
    });
  }
  return findings;
}

/** Check error handling: look for try-catch, .catch(), or Result type usage. */
function checkErrorHandling(projectDir: string, sourceFiles: string[]): ArchCheckFinding {
  const serverFiles = sourceFiles.filter(
    (f) => !f.includes("test") && !f.includes("spec") && !f.includes(".test.") && !f.includes(".spec."),
  );
  if (serverFiles.length === 0) {
    return { label: "错误处理", passed: true, detail: "无非测试源文件需检查" };
  }
  const catchPattern = /\btry\b[\s\S]*?\bcatch\b|\bcatch\s*\(|\.catch\s*\(/;
  const errorHandlerPattern = /\berror|Error\b.*\breturn|errorHandler|error_handler|ErrorBoundary/;
  const hasCatch = serverFiles.some((f) => {
    const content = fs.readFileSync(f, "utf8");
    return catchPattern.test(content) || errorHandlerPattern.test(content);
  });
  return {
    label: "错误处理",
    passed: hasCatch,
    detail: hasCatch ? undefined : "源文件中未发现 try-catch 或错误处理中间件",
  };
}

/** Main entry: run architecture checks against a project workspace using the given template. */
export function evaluateArchitecture(
  projectDir: string,
  archTemplate: ArchitectureTemplate,
): ArchCheckResult {
  const findings: ArchCheckFinding[] = [];
  const srcDir = path.join(projectDir, "src");
  const appDir = path.join(projectDir, "app");

  // Determine source code root
  const codeRoot = fs.existsSync(srcDir) ? srcDir : fs.existsSync(appDir) ? appDir : projectDir;
  const sourceFiles = listSourceFiles(codeRoot, [".ts", ".js", ".tsx", ".jsx", ".py"]);

  // File count check
  findings.push({
    label: "源文件数",
    passed: sourceFiles.length >= archTemplate.minSourceFiles,
    actual: sourceFiles.length,
    expected: archTemplate.minSourceFiles,
    detail: sourceFiles.length < archTemplate.minSourceFiles
      ? `源文件 ${sourceFiles.length} < 最低要求 ${archTemplate.minSourceFiles}`
      : undefined,
  });

  // Test file count check
  const testFiles = listSourceFiles(projectDir, [".test.ts", ".test.js", ".test.tsx", ".spec.ts", ".spec.js", ".test.py"]);
  findings.push({
    label: "测试文件数",
    passed: testFiles.length >= archTemplate.minTestFiles,
    actual: testFiles.length,
    expected: archTemplate.minTestFiles,
    detail: testFiles.length < archTemplate.minTestFiles
      ? `测试文件 ${testFiles.length} < 最低要求 ${archTemplate.minTestFiles}`
      : undefined,
  });

  // Expected directories check
  findings.push(...checkExpectedDirs(projectDir, archTemplate.expectedDirs, sourceFiles));

  // Expected patterns check
  findings.push(...checkExpectedPatterns(projectDir, archTemplate));

  // Error handling check
  if (archTemplate.minSourceFiles > 1) {
    findings.push(checkErrorHandling(projectDir, sourceFiles));
  }

  const passed = findings.every((f) => f.passed);
  return { passed, findings };
}
