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

const PHASE_SECTIONS: Partial<Record<PhaseId, SectionRule[]>> = {
  change: [
    { heading: "## Motivation", minChars: 8 },
    { heading: "## Scope", minChars: 4 },
    { heading: "## Success Criteria", minChars: 8 },
  ],
  requirement: [
    { heading: "## User Stories", minChars: 8 },
    { heading: "## Acceptance Criteria", minChars: 8 },
  ],
  design: [
    { heading: "## Options", minChars: 8 },
    { heading: "## Decision", minChars: 8 },
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

function stripSection(text: string, heading: string): string {
  const idx = text.indexOf(heading);
  if (idx < 0) return text;
  const rest = text.slice(idx + heading.length);
  const next = rest.search(/\n## /);
  if (next < 0) return text.slice(0, idx);
  return text.slice(0, idx) + rest.slice(next);
}

function hasPendingLanguage(text: string): boolean {
  const withoutOutOfScope = stripSection(text, "## Out of Scope");
  return /TODO|TBD|待补|占位/i.test(withoutOutOfScope);
}

const ELLIPSIS = /…|\.\.\.(?!\w)/;

function cellSubstantive(text: string, min = 3): boolean {
  const t = text.replace(/\*\*/g, "").trim();
  return t.length >= min && !ELLIPSIS.test(t) && !/^x$/i.test(t);
}

function requirementHasFilledStories(content: string): boolean {
  const rows = content.match(/^\| US-\d+ \|[^|\n]+\|[^|\n]+\|[^|\n]+\|/gm) ?? [];
  return rows.some((row) => {
    const cells = row
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    return cells.length >= 4 && cells.slice(1).every((c) => cellSubstantive(c, 3));
  });
}

function requirementHasFilledGwt(content: string): boolean {
  const lines = content.split("\n");
  const keys = ["Given", "When", "Then"] as const;
  const found: Record<string, boolean> = { Given: false, When: false, Then: false };
  for (const line of lines) {
    for (const key of keys) {
      const m = line.match(new RegExp(`^\\s*-\\s*\\*\\*${key}\\*\\*\\s*(.+)$`, "i"));
      if (m && cellSubstantive(m[1] ?? "", 8)) found[key] = true;
    }
  }
  return found.Given && found.When && found.Then;
}

function designHasRealOptions(content: string): boolean {
  const body = sectionBody(content, "## Options");
  const rows = body.match(/^\| [AB] \|[^|\n]+\|/gm) ?? [];
  return (
    rows.length >= 2 &&
    rows.every((row) => {
      const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
      return cells.length >= 2 && cellSubstantive(cells[1] ?? "", 4);
    })
  );
}

function designHasRealDecision(content: string): boolean {
  const body = sectionBody(content, "## Decision");
  const chosen = body.match(/\*\*Chosen:\*\*\s*(.+)/i)?.[1] ?? "";
  const reason = body.match(/\*\*Reason:\*\*\s*(.+)/i)?.[1] ?? "";
  return (
    cellSubstantive(chosen, 6) &&
    !/^Option\s*[….]{1,3}\s*$/i.test(chosen.trim()) &&
    cellSubstantive(reason, 8)
  );
}

function taskHasTddPlan(content: string): boolean {
  const body = `${sectionBody(content, "## Slices")}\n${sectionBody(content, "## Checklist per slice")}`;
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

export function validateArtifactContent(
  phaseId: PhaseId,
  content: string,
): { scores: QualityScores; hints: string[] } {
  const hints: string[] = [];
  if (isSeedTemplate(content)) {
    hints.push("仍为引擎模板占位（含 taiyi:seed-template），请按当前阶段 Skill 填写后再 continue");
    return {
      scores: {
        completeness: false,
        consistency: false,
        verifiability: false,
        traceability: false,
        engineering_quality: false,
      },
      hints,
    };
  }

  const text = stripComments(content);

  if (phaseId === "dev") {
    const ok = isDevCompleteEvidence(text);
    if (!ok) {
      if (!/command:\s*\S+/i.test(text)) {
        hints.push(".dev-complete 需含 command: <npm test 等可验证命令>");
      }
      if (!/exit(?:Code)?:\s*0\b/i.test(text)) {
        hints.push(".dev-complete 需含 exitCode: 0（测试通过证据）");
      }
      const trimmed = text.trim();
      const hasMarker =
        trimmed.length >= 8 &&
        (/complete|done|dev/i.test(trimmed) ||
          trimmed.split("\n").some((l) => l.trim().length >= 4));
      if (!hasMarker) {
        hints.push("创建 .dev-complete 标记（≥8 字符，含 complete/done/dev 或有效说明行）");
      }
    }
    return {
      scores: {
        completeness: ok,
        consistency: ok,
        verifiability: ok,
        traceability: ok,
        engineering_quality: ok,
      },
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
    const need = rule.minChars ?? 4;
    if (body.length < need) {
      sectionsOk = false;
      hints.push(`缺少或未填写: ${rule.heading}`);
    }
  }

  completeness = completeness && sectionsOk;

  const hasPlaceholderOnly = /\{\{title\}\}|\{\{slug\}\}/.test(content);
  const consistency = !hasPlaceholderOnly;
  if (hasPlaceholderOnly) hints.push("仍含 {{title}} / {{slug}} 占位符");

  let placeholderContent = false;
  if (phaseId === "requirement") {
    if (!requirementHasFilledStories(content)) {
      placeholderContent = true;
      hints.push("User Stories 表格须填写完整（非空单元格、非 … 占位）");
    }
    if (!requirementHasFilledGwt(content)) {
      placeholderContent = true;
      hints.push("Acceptance Criteria 须含实质 Given/When/Then（各 ≥8 字符）");
    }
  }
  if (phaseId === "task") {
    if (!taskHasTddPlan(content)) {
      placeholderContent = true;
      hints.push("TASK 须注明测试先行（RED/测试文件/ Done when 含 test 命令）");
    }
  }
  if (phaseId === "design") {
    if (!designHasRealOptions(content)) {
      placeholderContent = true;
      hints.push("Options 须为 markdown 表格行（| A | … | 与 | B | … |），勿用 ### Option A 标题");
    }
    if (!designHasRealDecision(content)) {
      placeholderContent = true;
      hints.push("Decision 须写明 Chosen 与 Reason（非 Option … 占位）");
    }
  }

  let verifiability =
    phaseId === "change"
      ? /Success Criteria|验收|可验证|\[ \]|\[x\]/i.test(content)
      : phaseId === "requirement"
        ? requirementHasFilledGwt(content)
        : text.length >= minTotal;

  if (placeholderContent) {
    completeness = false;
    verifiability = false;
  }

  if (phaseId === "ui-design") {
    const scope = sectionBody(content, "## Scope");
    const isNa =
      /n\/a|无 ui|无界面|no ui|backend only|纯后端|纯 api/i.test(scope) ||
      /n\/a|无 ui|无界面/i.test(text);
    verifiability = isNa
      ? scope.length >= 4
      : /## States/i.test(content) &&
        /Accessibility|无障碍/i.test(content) &&
        text.length >= minTotal;
    if (!verifiability) {
      hints.push(
        isNa
          ? "无 UI：Scope 写 N/A 并说明验证方式"
          : "有 UI：需 States 节 + Accessibility checklist",
      );
    }
  } else if (!verifiability) {
    hints.push("缺少可验证表述（AC / Given-When-Then / checklist）");
  }

  const traceability =
    phaseId === "requirement"
      ? /Traceability|CHANGE/i.test(content)
      : phaseId !== "change";
  if (!traceability && phaseId === "requirement") {
    hints.push("REQUIREMENT 应包含 Traceability 或指向 CHANGE");
  }

  const hasPendingLanguageFlag = hasPendingLanguage(text);
  let engineering_quality: boolean =
    phaseId === "review"
      ? !hasPendingLanguageFlag
      : !hasPendingLanguageFlag || text.length > 120;
  if (placeholderContent) engineering_quality = false;
  if (!engineering_quality && hasPendingLanguageFlag) hints.push("含 TODO/TBD/待补 等待定用语");

  let machineReviewOk = true;
  if (phaseId === "review") {
    const machine = evaluateMachineReview(content);
    machineReviewOk = machine.passed;
    if (!machine.passed) {
      hints.push(...machine.hints);
      engineering_quality = false;
      verifiability = false;
    }
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

/** Phases that have Zod schemas and companion JSON files */
export const ZOD_PHASES: PhaseId[] = Object.keys(ZOD_SCHEMAS) as PhaseId[];

export function validateArtifactFile(
  artifactPath: string,
  phaseId: PhaseId,
): { scores: QualityScores; hints: string[] } | null {
  if (!fs.existsSync(artifactPath)) return null;
  const content = fs.readFileSync(artifactPath, "utf8");
  const result = validateArtifactContent(phaseId, content);

  // Zod integration: validate companion JSON if schema exists
  const zodSchema = ZOD_SCHEMAS[phaseId];
  if (zodSchema) {
    const jsonPath = path.join(path.dirname(artifactPath), `${phaseId}.json`);
    if (fs.existsSync(jsonPath)) {
      try {
        const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        zodSchema.parse(json);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        result.hints.push(`[Zod 校验失败] ${phaseId}.json 数据不合法: ${msg}`);
        result.scores.completeness = false;
        result.scores.consistency = false;
      }
    }
  }

  return result;
}

export function artifactPathForPhase(changeDir: string, phaseId: PhaseId): string {
  const phase = getPhase(phaseId);
  if (phase.kind === "code") {
    return path.join(changeDir, ".dev-complete");
  }
  return path.join(changeDir, phase.artifact);
}
