import fs from "node:fs";
import path from "node:path";

export interface AcCoverageEntry {
  ac_id: string;
  test_case_ids: string[];
}

export function scanTestFilesForAcCoverage(
  testFiles: string[],
  workspaceDir: string,
): AcCoverageEntry[] {
  const acToFiles = new Map<string, Set<string>>();

  for (const file of testFiles) {
    const filePath = path.join(workspaceDir, file);
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const matches = content.matchAll(/\b(AC-\d+(?:\.\d+)?)\b/gi);
      for (const m of matches) {
        const acId = m[1].toUpperCase();
        if (!acToFiles.has(acId)) acToFiles.set(acId, new Set());
        acToFiles.get(acId)!.add(file);
      }
    } catch { /* skip unreadable */ }
  }

  return Array.from(acToFiles.entries()).map(([ac_id, files]) => ({
    ac_id,
    test_case_ids: Array.from(files),
  }));
}
