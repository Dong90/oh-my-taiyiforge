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

  if (!fs.existsSync(jsonPath)) {
    return { scores: allFalse, hints: [`[Zod] 缺少 ${phaseId}.json，用 executor.generateStageData 生成`] };
  }

  try {
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    zodSchema.parse(json);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { scores: allFalse, hints: [`[Zod 校验失败] ${phaseId}.json: ${msg}`] };
  }

  if (isSeedTemplate(content)) return { scores: allFalse, hints: ["仍为引擎模板占位"] };
  if (/\{\{title\}\}|\{\{slug\}\}/.test(content)) return { scores: allFalse, hints: ["仍含占位符"] };
  if (stripComments(content).length < 40) return { scores: allFalse, hints: ["MD 过短"] };

  return { scores: { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true }, hints: [] };
}

export function artifactPathForPhase(changeDir: string, phaseId: PhaseId): string {
  const phase = getPhase(phaseId);
  if (phase.kind === "code") return path.join(changeDir, ".dev-complete");
  return path.join(changeDir, phase.artifact);
}
