import fs from "node:fs";
import path from "node:path";
import type { ComplexitySignals } from "./complexity.js";

function readIfExists(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

/** Infer complexity signals from CHANGE / REQUIREMENT when assess has no explicit input. */
export function inferComplexitySignals(changeDir: string): ComplexitySignals {
  const changeRaw = readIfExists(path.join(changeDir, "CHANGE.md"));
  const reqRaw = readIfExists(path.join(changeDir, "REQUIREMENT.md"));
  const change = changeRaw.toLowerCase();
  const req = reqRaw.toLowerCase();

  const scopeMatch = changeRaw.match(/##\s*scope[\s\S]*?(?=##\s|\Z)/i);
  const scopeText = (scopeMatch?.[0] ?? changeRaw.slice(0, 1200)).toLowerCase();
  const combined = `${scopeText}\n${req.slice(0, 800)}`;

  const noUiExplicit =
    /(no ui|无 ui|无界面|无 ui 变更|纯 api|纯后端|backend only|cli 冒烟|命令.*测试|无前端)/i.test(
      `${changeRaw}\n${reqRaw}`,
    );

  const hasUi =
    !noUiExplicit &&
    !/(无|no)\s*ui\b/i.test(combined) &&
    /\bui\b|frontend|front-end|页面|组件|css|react|vue|svelte|figma|无障碍|a11y/.test(combined);

  const tooling =
    /\b(cli|smoke|斜杠|命令全量|taiyi-forge|npm test|doctor|verify)\b/i.test(combined) &&
    !/\b(微服务|多模块|database|migration)\b/i.test(combined);

  const moduleHints =
    (combined.match(/\b(src\/|lib\/|api\/|模块|service)\b/gi) || []).length +
    Math.min(6, (combined.match(/^-\s+/gm) || []).length) +
    (tooling ? 1 : Math.floor(scopeText.length / 800));

  const touchedModules = tooling ? Math.min(6, Math.max(2, moduleHints)) : Math.min(20, Math.max(2, moduleHints));

  let testLevels = 1;
  if (/e2e|集成测试|integration test/.test(combined)) testLevels += 2;
  if (/单元测试|unit test|vitest|jest|pytest|冒烟|smoke/.test(combined)) testLevels += 1;
  if (/回归|regression|qa/.test(combined)) testLevels += 1;
  if (tooling) testLevels = Math.min(testLevels, 2);

  return { touchedModules, hasUi, testLevels };
}
