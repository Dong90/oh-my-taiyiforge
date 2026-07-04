import fs from "node:fs";
import path from "node:path";
import type { PhaseId, QualityScores } from "./types.js";
import { getPhase } from "./phase-registry.js";
import { isDevCompleteEvidence } from "./dev-complete.js";
import { isSeedTemplate } from "./seed-marker.js";
import { hasPlaceholders, countPlaceholders } from "./placeholder-check.js";
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

type JsonParseResult =
  | { ok: true; data: unknown }
  | { ok: false; code: string; error: string };

function readAndParseJson(jsonPath: string, schema: ZodSchema): JsonParseResult {
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    schema.parse(data);
    return { ok: true, data };
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return { ok: false, code: "ENOENT", error: "file not found" };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, code: "PARSE_ERR", error: msg };
  }
}

/** DEV-only validation (last remaining non-Zod phase) */
export function validateArtifactContent(
  phaseId: PhaseId,
  content: string,
): { scores: QualityScores; hints: string[] } {
  const hints: string[] = [];
  const hasMarker = /complete|done|dev/i.test(content);
  const cmdOk = /command:\s*\S+/i.test(content);
  const exitOk = /exit(?:Code)?:\s*0\b/i.test(content);
  const allOk = hasMarker && cmdOk && exitOk;
  if (!cmdOk) hints.push(".dev-complete 需含 command: <npm test>");
  if (!exitOk) hints.push(".dev-complete 需含 exitCode: 0");
  return {
    scores: {
      completeness: hasMarker,
      consistency: cmdOk && exitOk,
      verifiability: exitOk,
      traceability: cmdOk,
      engineering_quality: allOk,
    },
    hints,
  };
}

export const ZOD_SCHEMAS: Record<Exclude<PhaseId, "dev">, ZodSchema> = {
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

  const jsonPath = path.join(path.dirname(artifactPath), `${phaseId}.json`);
  const strippedLen = stripComments(content).length;
  const hints: string[] = [];
  let scores: QualityScores = { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true };

  const parsed = readAndParseJson(jsonPath, zodSchema);
  if (!parsed.ok) {
    scores.consistency = false;
    if (parsed.code === "ENOENT") {
      hints.push(`[Zod] 缺少 ${phaseId}.json，用 executor.generateStageData 生成`);
      scores.completeness = false;
    } else {
      hints.push(`[Zod 校验失败] ${phaseId}.json: ${parsed.error}`);
    }
  }

  if (isSeedTemplate(content)) {
    scores.completeness = false;
    hints.push("仍为引擎模板占位");
  }
  const cleanedContent = stripComments(content);
  if (hasPlaceholders(cleanedContent)) {
    const count = countPlaceholders(cleanedContent);
    scores.completeness = false;
    if (!hints.some((h) => h.includes("占位")) && !isSeedTemplate(content)) {
      const show = count.slice(0, 8);
      hints.push(`含 ${count.length} 个未填写占位符（${show.join(", ")}${count.length > 8 ? ` …等 ${count.length - 8} 个` : ""}）`);
    }
  }
  if (/\{\{title\}\}|\{\{slug\}\}/.test(content)) {
    scores.completeness = false;
    if (!hints.some((h) => h.includes("占位"))) hints.push("仍含占位符");
  }
  if (strippedLen < 40) {
    scores.completeness = false;
    if (!hints.some((h) => h.includes("MD 过短"))) hints.push("MD 过短");
  }

  if (parsed.ok && (phaseId === "change" || phaseId === "requirement" || phaseId === "test")) {
    const raw = parsed.data as Record<string, unknown>;
    const criteria: unknown =
      (raw.acceptance_criteria as unknown[]) ?? (raw.success_criteria as unknown[]);
    const hasChecked =
      Array.isArray(criteria) &&
      criteria.some(
        (c: unknown) =>
          typeof c === "object" && c !== null && (c as { is_checked?: boolean }).is_checked === true,
      );
    if (hasChecked && !raw.evidence) {
      scores.verifiability = false;
      hints.push(
        "[Evidence] acceptance_criteria/success_criteria 有 is_checked=true,必填 evidence{command, exitCode:0, capturedAt}",
      );
    }
  }

  // Phase-specific content checks
  if (phaseId === "requirement") {
    // US 三段式缺失 hint（seed marker + placeholder 可兜底，此处仅提醒）
    const hasUserStory = /as a(n?)\s+\S[\s\S]{1,80}i\s+(?:want|need|would like|must|should|cannot)\s+\S/i.test(content) ||
      /\|\s*US[-_\d]+\s*\|[^|]+\|[^|]+\|[^|]+\|/i.test(content);
    if (!hasUserStory) {
      hints.push("[建议] REQUIREMENT.md 可补充 User Story 三段式 (As a / I want / So that)");
    }
    // Domain Language table hint (不阻塞 — 模板生成的 E2E fixture 跳过条件)
    if (!/domain\s*language|术语表|domain\s*term/i.test(content)) {
      hints.push("[建议] 可补充 Domain Language / 术语表（hbs 模板 ## Domain Language 章节）");
    }
  }

  if (phaseId === "task") {
    // T0.1-T0.7 pre-flight hint (不阻塞 — 模板生成的 fixture 跳过)
    if (!/\bT0\.[1-7]\b/i.test(content) && !/pre[_ ]?flight/i.test(content)) {
      hints.push("[建议] 可补充 T0.1-T0.7 pre-flight 检查（check_uncommitted / scan LESSONS 等）");
    }
  }

  const qualityHints = contentQualityGate(phaseId, content);
  if (qualityHints.length > 0) {
    scores.engineering_quality = false;
    hints.push(...qualityHints);
  }

  if (!scores.completeness || !scores.consistency) {
    scores.traceability = false;
  }

  return { scores, hints };
}

/** 内容质量门控 — 检测空表/问题描述错误（占位符检测已移入 placeholder-check.ts） */
export function contentQualityGate(phaseId: PhaseId, content: string): string[] {
  const issues: string[] = [];

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
