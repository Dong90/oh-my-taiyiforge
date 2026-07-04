/** Auto-sync test_plan[i].status from a vitest run output.
 *  Used by /taiyi:test, can also be called from CLI:
 *   node --import tsx src/cli/taiyi.ts updateTestPlanStatus <slug>
 *  or programmatically via this module.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { TestSchema } from "../schemas/test.js";
import { resolveChangeDir } from "./taiyi-archive.js";

export type UpdateTestPlanOptions = {
  /** slug → testPlan id mapping by description prefix; default uses 1:1 by order */
  cwd?: string;
  /** Skip actually running tests; just clear `pending` if forces are provided */
  dryRun?: boolean;
};

/** Run vitest for a change and parse results to update test.json test_plan status. */
export function updateTestPlanStatus(
  taiyiRoot: string,
  slug: string,
  _options?: UpdateTestPlanOptions,
): { updated: boolean; passed: number; failed: number; skipped: number; errors: string[] } {
  const changeDir = resolveChangeDir(taiyiRoot, slug);
  if (!changeDir) return { updated: false, passed: 0, failed: 0, skipped: 0, errors: ["change not found"] };
  const jsonPath = path.join(changeDir, "test.json");
  if (!fs.existsSync(jsonPath)) return { updated: false, passed: 0, failed: 0, skipped: 0, errors: ["test.json missing"] };

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (e) {
    return { updated: false, passed: 0, failed: 0, skipped: 0, errors: [`test.json parse: ${(e as Error).message}`] };
  }
  const parsed = TestSchema.safeParse(raw);
  if (!parsed.success) {
    return { updated: false, passed: 0, failed: 0, skipped: 0, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const testPlan = parsed.data.test_plan ?? [];

  // Auto-detection: find test files for the change and run vitest
  const cwd = _options?.cwd ?? changeDir;
  if (!_options?.dryRun) {
    let stdout = "";
    try {
      stdout = execFileSync("npx", ["vitest", "run", "--reporter=default", "--json"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
        shell: false,
      }).toString();
    } catch (e) {
      const err = e as { stdout?: string };
      stdout = err.stdout ?? "";
    }
    // 解析 vitest json reporter stdout（--json 输出到 stdout）
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    try {
      const json = JSON.parse(stdout) as {
        numPassedTests?: number;
        numFailedTests?: number;
        numPendingTests?: number;
      };
      passed = json.numPassedTests ?? 0;
      failed = json.numFailedTests ?? 0;
      skipped = json.numPendingTests ?? 0;
    } catch {
      return { updated: false, passed: 0, failed: 0, skipped: 0, errors: ["vitest --json 不可解析"] };
    }

    // 启发式：全过 → 全 test_plan passed；有失败 → 第一个 pending/failed
    const newStatus: "passed" | "failed" | "pending" =
      failed > 0 ? "failed" : passed > 0 ? "passed" : "pending";
    const next = testPlan.map((p, i) => ({ ...p, status: i === 0 ? newStatus : (p.status ?? "pending") }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { safeWriteFileSync } = require("./file-writer.js") as typeof import("./file-writer.js");
    safeWriteFileSync(jsonPath, JSON.stringify({ ...parsed.data, test_plan: next }, null, 2) + "\n", { skipRedact: true });
    return { updated: true, passed, failed, skipped, errors: [] };
  }

  return { updated: false, passed: 0, failed: 0, skipped: 0, errors: [] };
}
