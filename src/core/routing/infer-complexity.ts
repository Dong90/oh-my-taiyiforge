import fs from "node:fs";
import path from "node:path";
import type { ComplexitySignals } from "./complexity.js";

function readIfExists(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

/** Infer complexity signals from CHANGE / REQUIREMENT when assess has no explicit input. */
export function inferComplexitySignals(changeDir: string): ComplexitySignals {
  const change = readIfExists(path.join(changeDir, "CHANGE.md")).toLowerCase();
  const req = readIfExists(path.join(changeDir, "REQUIREMENT.md")).toLowerCase();
  const combined = `${change}\n${req}`;

  const hasUi =
    /\bui\b|frontend|front-end|页面|组件|css|react|vue|svelte|figma|无障碍|a11y/.test(
      combined,
    ) && !/\bno ui\b|无 ui|无界面|n\/a.*ui|纯 api|纯后端|backend only/.test(combined);

  const moduleHints =
    (combined.match(/\b(src\/|lib\/|api\/|模块|service|package)\b/gi) || []).length +
    (combined.match(/^-\s+/gm) || []).length +
    Math.floor(combined.length / 400);

  const touchedModules = Math.min(20, Math.max(2, moduleHints));

  let testLevels = 1;
  if (/e2e|集成测试|integration test/.test(combined)) testLevels += 2;
  if (/单元测试|unit test|vitest|jest|pytest/.test(combined)) testLevels += 1;
  if (/回归|regression|qa/.test(combined)) testLevels += 1;

  return { touchedModules, hasUi, testLevels };
}
