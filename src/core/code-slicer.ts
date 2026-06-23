/**
 * Code Slicer — extract relevant code signatures for LLM context injection.
 * Instead of feeding entire files, extracts function signatures, exports, and imports.
 */

import fs from "node:fs";
import path from "node:path";

export type CodeSlice = {
  file: string;
  exports: string[];
  imports: string[];
  complexity: number; // estimated lines
};

export type SliceContext = {
  slices: CodeSlice[];
  totalLines: number;
  summary: string;
};

/** Extract relevant code from a list of file paths. */
export function sliceFiles(repoRoot: string, filePaths: string[]): SliceContext {
  const slices: CodeSlice[] = [];
  let totalLines = 0;

  for (const relPath of filePaths) {
    const fp = path.join(repoRoot, relPath);
    if (!fs.existsSync(fp)) continue;

    const content = fs.readFileSync(fp, "utf8");
    const lines = content.split("\n");
    totalLines += lines.length;

    const exports = extractExports(content);
    const imports = extractImports(content);

    slices.push({
      file: relPath,
      exports,
      imports,
      complexity: lines.length,
    });
  }

  const summary = `${slices.length} files, ${totalLines} total lines, ` +
    `${slices.reduce((s, sc) => s + sc.exports.length, 0)} exports`;

  return { slices, totalLines, summary };
}

/** Generate a focused context string for LLM consumption. */
export function generateFocusedContext(
  slices: SliceContext,
  maxContextLines = 50,
): string {
  const lines: string[] = [
    `# Focused Context (${slices.summary})`,
    "",
    "## Relevant Files",
  ];

  for (const sc of slices.slices) {
    lines.push(`### ${sc.file} (${sc.complexity} lines)`);
    if (sc.imports.length > 0) {
      lines.push(`Imports: ${sc.imports.slice(0, 5).join(", ")}`);
    }
    if (sc.exports.length > 0) {
      lines.push(`Exports: ${sc.exports.join(", ")}`);
    } else {
      lines.push("(no exports — test or config file)");
    }
    lines.push("");
  }

  const result = lines.join("\n");
  // Truncate if too long
  if (result.split("\n").length > maxContextLines) {
    return result.split("\n").slice(0, maxContextLines).join("\n") +
      `\n... (truncated to ${maxContextLines} lines, full context: ${slices.totalLines} lines)`;
  }
  return result;
}

function extractExports(content: string): string[] {
  const names: string[] = [];
  for (const m of content.matchAll(/export (?:async )?function (\w+)/g)) names.push(m[1]);
  for (const m of content.matchAll(/export class (\w+)/g)) names.push(m[1]);
  for (const m of content.matchAll(/export const (\w+)/g)) names.push(m[1]);
  for (const m of content.matchAll(/export type (\w+)/g)) names.push(m[1]);
  for (const m of content.matchAll(/export interface (\w+)/g)) names.push(m[1]);
  return names;
}

function extractImports(content: string): string[] {
  const names: string[] = [];
  for (const m of content.matchAll(/import \{[^}]+\} from ['"](.+)['"]/g)) names.push(m[1]);
  for (const m of content.matchAll(/import (\w+) from ['"](.+)['"]/g)) names.push(m[2]);
  return [...new Set(names)];
}

