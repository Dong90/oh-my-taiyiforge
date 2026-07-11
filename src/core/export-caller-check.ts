import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export interface ExportCallerFinding {
  symbol: string;
  file: string;
  callers: number;
  severity: "critical" | "warning";
  message: string;
}

export function checkExportCallers(
  workspaceDir: string,
): ExportCallerFinding[] {
  const findings: ExportCallerFinding[] = [];

  let changedFiles: string[] = [];
  try {
    const baseBranch = process.env.TAIYI_BASE_BRANCH ?? "main";
    const mergeBase = execSync(`git merge-base HEAD ${baseBranch}`, {
      cwd: workspaceDir, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    const diffOut = execSync(`git diff --name-only ${mergeBase}`, {
      cwd: workspaceDir, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    changedFiles = diffOut ? diffOut.split("\n").filter(Boolean) : [];
  } catch { return findings; }

  for (const file of changedFiles) {
    const fp = path.join(workspaceDir, file);
    if (!fs.existsSync(fp) || !/\.(ts|tsx|js|jsx)$/.test(file)) continue;

    let content: string;
    try { content = fs.readFileSync(fp, "utf8"); } catch { continue; }

    const exportMatches = content.matchAll(
      /export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g,
    );
    for (const m of exportMatches) {
      const symbol = m[1];
      if (content.includes("export default")) continue;

      let callerCount = 0;
      try {
        const grepOut = execSync(
          `grep -r "${symbol}" --include="*.ts" --include="*.tsx" --include="*.js" --exclude-dir=node_modules --exclude-dir=.taiyi "${workspaceDir}" 2>/dev/null | grep -v "^${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:" | wc -l`,
          { cwd: workspaceDir, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] },
        ).trim();
        callerCount = parseInt(grepOut) || 0;
      } catch { callerCount = 0; }

      if (callerCount === 0) {
        findings.push({
          symbol, file, callers: 0, severity: "critical",
          message: `export "${symbol}" in ${file} has zero callers — potential dead code or missing integration`,
        });
      }
    }
  }

  return findings;
}
