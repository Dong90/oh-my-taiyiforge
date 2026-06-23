import fs from "node:fs";
import path from "node:path";
import type { PhaseId, QualityScores } from "./types.js";
import { getPhase } from "./phase-registry.js";
import { isDevCompleteEvidence } from "./dev-complete.js";
import { isSeedTemplate } from "./seed-marker.js";
import { RequirementSchema } from "../schemas/requirement.js";
import { DesignSchema } from "../schemas/design.js";
import { ChangeSchema } from "../schemas/change.js";
import { UiDesignSchema } from "../schemas/ui-design.js";
import { TaskSchema } from "../schemas/task.js";
import { TestSchema } from "../schemas/test.js";
import { ReviewSchema } from "../schemas/review.js";
import { IntegrationSchema } from "../schemas/integration.js";
import { ChangeStateSchema } from "../schemas/state.js";
import type { ZodSchema } from "zod";

function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "").trim();
}

/** DEV-only validation (last remaining non-Zod phase) */
export function validateArtifactContent(
  phaseId: PhaseId,
  content: string,
): { scores: QualityScores; hints: string[] } {
  const hints: string[] = [];
  const ok = isDevCompleteEvidence(stripComments(content));
  if (!ok) {
    if (!/command:\s*\S+/i.test(content)) hints.push(".dev-complete 需含 command: <npm test>");
    if (!/exit(?:Code)?:\s*0\b/i.test(content)) hints.push(".dev-complete 需含 exitCode: 0");
  }
  return {
    scores: { completeness: ok, consistency: ok, verifiability: ok, traceability: ok, engineering_quality: ok },
    hints,
  };
}

const ZOD_SCHEMAS: Record<Exclude<PhaseId, "dev">, ZodSchema> = {
  change: ChangeSchema,
  requirement: RequirementSchema,
  design: DesignSchema,
  "ui-design": UiDesignSchema,
  task: TaskSchema,
  test: TestSchema,
  review: ReviewSchema,
  integration: IntegrationSchema,
};

export const ZOD_PHASES: PhaseId[] = Object.keys(ZOD_SCHEMAS) as PhaseId[];

/**
 * Validate state.json using ChangeStateSchema.
 * Returns hints array (empty = valid, non-empty = validation failures).
 */
export function validateStateFile(statePath: string): string[] {
  if (!fs.existsSync(statePath)) return ["[Zod] 缺少 state.json"];
  try {
    const json = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    ChangeStateSchema.parse(json);
    return [];
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return [`[Zod 校验失败] state.json: ${msg}`];
  }
}

export function validateArtifactFile(
  artifactPath: string,
  phaseId: PhaseId,
): { scores: QualityScores; hints: string[] } | null {
  if (!fs.existsSync(artifactPath)) return null;
  const content = fs.readFileSync(artifactPath, "utf8");

  if (phaseId === "dev") return validateArtifactContent(phaseId, content);

  const zodSchema = ZOD_SCHEMAS[phaseId as Exclude<PhaseId, "dev">];
  if (!zodSchema) return null;

  const allFalse: QualityScores = { completeness: false, consistency: false, verifiability: false, traceability: false, engineering_quality: false };
  const jsonPath = path.join(path.dirname(artifactPath), `${phaseId}.json`);

  try {
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    zodSchema.parse(json);
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { scores: allFalse, hints: [`[Zod] 缺少 ${phaseId}.json，用 executor.generateStageData 生成`] };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { scores: allFalse, hints: [`[Zod 校验失败] ${phaseId}.json: ${msg}`] };
  }

  if (isSeedTemplate(content)) return { scores: allFalse, hints: ["仍为引擎模板占位"] };
  if (/\{\{title\}\}|\{\{slug\}\}/.test(content)) return { scores: allFalse, hints: ["仍含占位符"] };
  if (stripComments(content).length < 40) return { scores: allFalse, hints: ["MD 过短"] };

  // evidence 强校验:change/requirement/test 三阶段,success_criteria/acceptance_criteria 标 is_checked=true 时必填 evidence
  if (phaseId === "change" || phaseId === "requirement" || phaseId === "test") {
    try {
      const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const criteria = (json as { acceptance_criteria?: unknown[]; success_criteria?: unknown[] }).acceptance_criteria
        ?? (json as { success_criteria?: unknown[] }).success_criteria;
      const hasChecked = Array.isArray(criteria) && criteria.some((c: unknown) => {
        return typeof c === "object" && c !== null && (c as { is_checked?: boolean }).is_checked === true;
      });
      if (hasChecked && !json.evidence) {
        return {
          scores: allFalse,
          hints: ["[Evidence] acceptance_criteria/success_criteria 有 is_checked=true,必填 evidence{command, exitCode:0, capturedAt}"],
        };
      }
    } catch {
      /* jsonPath 已经在 try 块解析过,这里不重复 */
    }
  }

  // 内容质量门控: 占位符/空表/问题描述检测
  const qualityHints = contentQualityGate(phaseId, content);
  if (qualityHints.length > 0) {
    return { scores: allFalse, hints: qualityHints };
  }

  return { scores: { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true }, hints: [] };
}

/** 内容质量门控 — 检测残留占位符/空表/问题描述错误 */
export function contentQualityGate(phaseId: PhaseId, content: string): string[] {
  const issues: string[] = [];

  // 1. 占位符模式扫描
  const PLACEHOLDER_PATTERNS: RegExp[] = [
    /\[TODO:/, /\bTODO\b/, /-- TODO/, /\[填写理由\]/, /\[Minimal\s/,
    /\[现状\]/, /\[N\]min\b/, /\[命令\]/, /\[日期\]/, /\[deployed\/pending\]/,
    /\[X人天\]/, /\[最多N\]/, /0\.0\.0/, /\[场景名\]/,
    /\[无\/CLI\/npm\/Docker\/其他\]/,
  ];
  for (const regex of PLACEHOLDER_PATTERNS) {
    if (regex.test(content)) {
      issues.push(`[质量门控] 占位符残留: ${regex}`);
      break;
    }
  }

  // 2. 空表检测: 表头下行即空或全空单元格
  const lines = content.split("\n");
  let inTable = false;
  let afterHeader = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\|.*\|$/.test(line)) {
      if (!inTable) {
        inTable = true;
        afterHeader = false;
        continue;
      }
      if (!afterHeader) {
        afterHeader = true;
        continue; // separator row
      }
      // data row — check if all cells empty
      const cells = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const allEmpty = cells.every((c) => c.trim() === "");
      if (allEmpty) {
        issues.push(`[质量门控] 空表行: 第 ${i + 1} 行 ("${line.trim().substring(0, 40)}")`);
        break;
      }
      if (/\[(?:N\/A|—)/.test(line)) {
        continue;
      }
    } else {
      inTable = false;
      afterHeader = false;
    }
  }

  // 3. Problem Statement 检测 (CHANGE.md)
  if (phaseId === "change") {
    const firstPara = stripComments(content).substring(0, 200);
    const taskVerbs = /^(验证|实现|增加|添加|构建|创建|跑|做|写|生成|执行|引入)\s/u;
    if (taskVerbs.test(firstPara)) {
      issues.push("[质量门控] Problem Statement 以任务动词开头，应以「问题描述」开头而非「任务动词」");
    }
  }

  // 4. Detailed Design TODO 检测 (DESIGN.md)
  if (phaseId === "design") {
    if (/\bTODO\b/i.test(content)) {
      issues.push("[质量门控] DESIGN.md 含 TODO 残留（Detailed Design 必须完整，N/A 项写理由）");
    }
  }

  return issues;
}

export function artifactPathForPhase(changeDir: string, phaseId: PhaseId): string {
  const phase = getPhase(phaseId);
  if (phase.kind === "code") return path.join(changeDir, ".dev-complete");
  return path.join(changeDir, phase.artifact);
}
