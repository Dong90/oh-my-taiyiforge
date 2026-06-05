import fs from "node:fs";
import path from "node:path";
import { estimateTokens } from "./estimate.js";

const ARTIFACT_GLOBS = [
  "CHANGE.md",
  "REQUIREMENT.md",
  "DESIGN.md",
  "UI-DESIGN.md",
  "TASK.md",
  "TEST.md",
  "REVIEW.md",
  "CHANGELOG.md",
  "CONTEXT.md",
  "CONTEXT-COMPACT.md",
  "health-report.md",
  "architecture-sync.md",
  "ui-restyle-tasks.md",
];

export type ArtifactTokenScan = {
  total: number;
  files: { name: string; tokens: number }[];
};

export function scanArtifactTokens(changeDir: string): ArtifactTokenScan {
  const files: { name: string; tokens: number }[] = [];
  let total = 0;

  for (const name of ARTIFACT_GLOBS) {
    const p = path.join(changeDir, name);
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) continue;
    const tokens = estimateTokens(fs.readFileSync(p, "utf8"));
    files.push({ name, tokens });
    total += tokens;
  }

  const adrDir = path.join(changeDir, "adr");
  if (fs.existsSync(adrDir) && fs.statSync(adrDir).isDirectory()) {
    for (const f of fs.readdirSync(adrDir).filter((x) => x.endsWith(".md"))) {
      const tokens = estimateTokens(fs.readFileSync(path.join(adrDir, f), "utf8"));
      files.push({ name: `adr/${f}`, tokens });
      total += tokens;
    }
  }

  return { total, files };
}
