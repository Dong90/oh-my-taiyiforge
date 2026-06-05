import fs from "node:fs";
import path from "node:path";
import type { PhaseId, QualityScores } from "./types.js";
import { getPhase } from "./phase-registry.js";

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
  task: [{ heading: "## Slices", minChars: 8 }],
  test: [{ heading: "## Test Plan", minChars: 8 }],
  review: [{ heading: "## Verdict", minChars: 4 }],
  integration: [{ heading: "## Added", minChars: 2 }],
};

function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "").trim();
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
  const text = stripComments(content);

  if (phaseId === "dev") {
    const trimmed = text.trim();
    const hasMarker =
      trimmed.length >= 8 &&
      (/complete|done|dev/i.test(trimmed) || trimmed.split("\n").some((l) => l.trim().length >= 4));
    if (!hasMarker) {
      hints.push("创建 .dev-complete 标记（≥8 字符，含 complete/done/dev 或有效说明行）");
    }

    const strict = /strict:\s*true/i.test(text);
    let strictOk = true;
    if (strict) {
      const exitOk = /exit(?:Code)?:\s*0\b/i.test(text);
      const cmdOk = /command:\s*\S+/i.test(text);
      strictOk = exitOk && cmdOk;
      if (!exitOk) hints.push("strict dev：.dev-complete 需含 exitCode: 0");
      if (!cmdOk) hints.push("strict dev：.dev-complete 需含 command: <npm test 等>");
    }

    const ok = hasMarker && strictOk;
    return {
      scores: {
        completeness: ok,
        consistency: ok,
        verifiability: strictOk,
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

  let verifiability =
    phaseId === "change"
      ? /Success Criteria|验收|可验证|\[ \]|\[x\]/i.test(content)
      : phaseId === "requirement"
        ? /Given|When|Then/i.test(content)
        : text.length >= minTotal;

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

  const hasPendingLanguage = /TODO|TBD|待补|占位/i.test(text);
  const engineering_quality =
    phaseId === "review"
      ? !hasPendingLanguage
      : !hasPendingLanguage || text.length > 120;
  if (!engineering_quality) hints.push("含 TODO/TBD/待补 等待定用语");

  return {
    scores: {
      completeness,
      consistency,
      verifiability,
      traceability: phaseId === "change" ? true : traceability,
      engineering_quality,
    },
    hints,
  };
}

export function validateArtifactFile(
  artifactPath: string,
  phaseId: PhaseId,
): { scores: QualityScores; hints: string[] } | null {
  if (!fs.existsSync(artifactPath)) return null;
  const content = fs.readFileSync(artifactPath, "utf8");
  return validateArtifactContent(phaseId, content);
}

export function artifactPathForPhase(changeDir: string, phaseId: PhaseId): string {
  const phase = getPhase(phaseId);
  if (phase.kind === "code") {
    return path.join(changeDir, ".dev-complete");
  }
  return path.join(changeDir, phase.artifact);
}
