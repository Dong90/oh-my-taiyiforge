import fs from "node:fs";
import path from "node:path";
import type { PhaseId, QualityScores } from "./types.js";
import { getPhase } from "./phase-registry.js";
import { evaluateMachineReview } from "./review-gate.js";
import { isDevCompleteEvidence } from "./dev-complete.js";
import { isSeedTemplate } from "./seed-marker.js";
import { RequirementSchema } from "../schemas/requirement.js";
import { DesignSchema } from "../schemas/design.js";
import type { ZodSchema } from "zod";

type SectionRule = { heading: string; minChars?: number };

/** Legacy section rules — only for non-Zod phases */
const PHASE_SECTIONS: Partial<Record<PhaseId, SectionRule[]>> = {
  change: [
    { heading: "## Motivation", minChars: 8 },
    { heading: "## Scope", minChars: 4 },
    { heading: "## Success Criteria", minChars: 8 },
  ],
  "ui-design": [
    { heading: "## Scope", minChars: 4 },
    { heading: "## Links", minChars: 4 },
  ],
  task: [
    { heading: "## Slices", minChars: 8 },
    { heading: "## Checklist per slice", minChars: 4 },
  ],
  test: [{ heading: "## Test Plan", minChars: 8 }],
  review: [{ heading: "## Verdict", minChars: 4 }],
  integration: [{ heading: "## Added", minChars: 2 }],
};

function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "").trim();
}

function hasPendingLanguage(text: string): boolean {
  return /TODO|TBD|待补|占位/i.test(text);
}

function taskHasTddPlan(content: string): boolean {
  const body = content;
  if (/测试先行|RED|先写.*测试|test[- ]first/i.test(body)) return true;
  const rows = content.match(/^\|[^|\n]+\|[^|\n]+\|/gm) ?? [];
  return rows.some((row) => /test|npm test|vitest|jest|pytest/i.test(row));
}

function sectionBody(content: string, heading: string): string {
  const idx = content.indexOf(heading);
  if (idx < 0) return "";
  const rest = content.slice(idx + heading.length);
  const next = rest.search(/\n## /);
  const body = next < 0 ? rest : rest.slice(0, next);
  return stripComments(body).trim();
}

/** Generic heuristic validation for non-Zod phases only */
export function validateArtifactContent(
  phaseId: PhaseId,
  content: string,
): { scores: QualityScores; hints: string[] } {
  const hints: string[] = [];
  if (isSeedTemplate(content)) {
    hints.push("仍为引擎模板占位（含 taiyi:seed-template），请按当前阶段 Skill 填写后再 continue");
    return {
      scores: { completeness: false, consistency: false, verifiability: false, traceability: false, engineering_quality: false },
      hints,
    };
  }

  const text = stripComments(content);

  if (phaseId === "dev") {
    const ok = isDevCompleteEvidence(text);
    if (!ok) {
      if (!/command:\s*\S+/i.test(text)) hints.push(".dev-complete 需含 command: <npm test 等可验证命令>");
      if (!/exit(?:Code)?:\s*0\b/i.test(text)) hints.push(".dev-complete 需含 exitCode: 0（测试通过证据）");
    }
    return {
      scores: { completeness: ok, consistency: ok, verifiability: ok, traceability: ok, engineering_quality: ok },
      hints,
    };
  }

  const minTotal = phaseId === "ui-design" ? 40 : 60;
  let completeness = text.length >= minTotal;
  if (!completeness) hints.push(`工件过短（至少 ${minTotal} 字符有效内容）`);

  const rules = PHASE_SECTIONS[phaseId] ?? [];
  let sectionsOk = true;
  for (const rule of rules) {
    const body = sectionBody(content, rule.heading);
    if (body.length < (rule.minChars ?? 4)) {
      sectionsOk = false;
      hints.push(`缺少或未填写: ${rule.heading}`);
    }
  }
  completeness = completeness && sectionsOk;

  const consistency = !/\{\{title\}\}|\{\{slug\}\}/.test(content);
  if (!consistency) hints.push("仍含 {{title}} / {{slug}} 占位符");

  let placeholderContent = false;
  if (phaseId === "task" && !taskHasTddPlan(content)) {
    placeholderContent = true;
    hints.push("TASK 须注明测试先行（RED/测试文件/ Done when 含 test 命令）");
  }

  let verifiability = text.length >= minTotal;
  if (phaseId === "change") {
    verifiability = /Success Criteria|验收|可验证|\[ \]|\[x\]/i.test(content);
  } else if (phaseId === "ui-design") {
    const scope = sectionBody(content, "## Scope");
    const isNa = /n\/a|无 ui|无界面|no ui|backend only|纯后端|纯 api/i.test(scope) || /n\/a|无 ui|无界面/i.test(text);
    verifiability = isNa
      ? scope.length >= 4
      : /## States/i.test(content) && /Accessibility|无障碍/i.test(content) && text.length >= minTotal;
    if (!verifiability) {
      hints.push(isNa ? "无 UI：Scope 写 N/A 并说明验证方式" : "有 UI：需 States 节 + Accessibility checklist");
    }
  }

  if (placeholderContent) { completeness = false; verifiability = false; }
  if (!verifiability && phaseId !== "ui-design") hints.push("缺少可验证表述（AC / Given-When-Then / checklist）");

  const traceability = phaseId !== "change";
  const hasPending = hasPendingLanguage(text);
  let engineering_quality: boolean = phaseId === "review" ? !hasPending : !hasPending || text.length > 120;
  if (placeholderContent) engineering_quality = false;
  if (!engineering_quality && hasPending) hints.push("含 TODO/TBD/待补 等待定用语");

  let machineReviewOk = true;
  if (phaseId === "review") {
    const machine = evaluateMachineReview(content);
    machineReviewOk = machine.passed;
    if (!machine.passed) { hints.push(...machine.hints); engineering_quality = false; verifiability = false; }
  }

  return {
    scores: {
      completeness,
      consistency,
      verifiability: phaseId === "review" ? machineReviewOk && verifiability : verifiability,
      traceability: phaseId === "change" ? true : traceability,
      engineering_quality,
    },
    hints,
  };
}

const ZOD_SCHEMAS: Partial<Record<PhaseId, ZodSchema>> = {
  requirement: RequirementSchema,
  design: DesignSchema,
};

export const ZOD_PHASES: PhaseId[] = Object.keys(ZOD_SCHEMAS) as PhaseId[];

export function validateArtifactFile(
  artifactPath: string,
  phaseId: PhaseId,
): { scores: QualityScores; hints: string[] } | null {
  if (!fs.existsSync(artifactPath)) return null;
  const content = fs.readFileSync(artifactPath, "utf8");

  const zodSchema = ZOD_SCHEMAS[phaseId];
  if (!zodSchema) {
    return validateArtifactContent(phaseId, content);
  }

  // ── Zod-mandatory path ──
  const allFalse: QualityScores = { completeness: false, consistency: false, verifiability: false, traceability: false, engineering_quality: false };
  const jsonPath = path.join(path.dirname(artifactPath), `${phaseId}.json`);

  if (!fs.existsSync(jsonPath)) {
    return { scores: allFalse, hints: [`[Zod 必检] 缺少 ${phaseId}.json，请用 executor.generateStageData 生成结构化数据`] };
  }

  try {
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    zodSchema.parse(json);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { scores: allFalse, hints: [`[Zod 校验失败] ${phaseId}.json 数据不合法: ${msg}`] };
  }

  // Zod passed → secondary MD checks
  if (isSeedTemplate(content)) {
    return { scores: allFalse, hints: ["仍为引擎模板占位，请用 executor.generateStageData 填写内容"] };
  }
  if (/\{\{title\}\}|\{\{slug\}\}/.test(content)) {
    return { scores: allFalse, hints: ["仍含 {{title}} / {{slug}} 占位符"] };
  }
  if (stripComments(content).length < 40) {
    return { scores: allFalse, hints: ["MD 内容过短，请用 executor.generateStageData 生成"] };
  }

  return { scores: { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true }, hints: [] };
}

export function artifactPathForPhase(changeDir: string, phaseId: PhaseId): string {
  const phase = getPhase(phaseId);
  if (phase.kind === "code") return path.join(changeDir, ".dev-complete");
  return path.join(changeDir, phase.artifact);
}
