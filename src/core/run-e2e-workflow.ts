import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { WorkflowEngine } from "./workflow-engine.js";
import { E2E_ARTIFACTS, E2E_PHASE_ORDER } from "./e2e-fixtures.js";
import { getPhase } from "./phase-registry.js";
import { artifactPathForPhase } from "./artifact-validator.js";
import { DEV_COMPLETE_EVIDENCE } from "./dev-complete.js";
import { TemplateEngine, type SeedVars } from "./template-engine.js";
import type { PhaseId } from "./types.js";

const PASSING_GATES = {
  quality: {
    completeness: true,
    consistency: true,
    verifiability: true,
    traceability: true,
    engineering_quality: true,
  },
  human: { approved: true, approver: "e2e-runner" },
} as const;

export function renderE2ePhaseArtifact(
  phaseId: PhaseId,
  templatesDir: string,
): string | null {
  const phase = getPhase(phaseId);
  if (phase.kind !== "markdown") return null;
  const tplPath = path.join(templatesDir, `${phaseId}.hbs`);
  if (!fs.existsSync(tplPath)) return null;

  const raw = fs.readFileSync(tplPath, "utf8");
  const artifact = E2E_ARTIFACTS[phaseId as keyof typeof E2E_ARTIFACTS];
  if (!artifact) return null;

  const vars: SeedVars = { slug: "e2e-demo", title: "E2E Demo" };
  const engine = new TemplateEngine();
  return engine.render(raw, { ...vars, ...(artifact.json as Record<string, unknown>) });
}

export function writeE2eArtifacts(changeDir: string, templatesDir?: string): void {
  for (const [phaseId, body] of Object.entries(E2E_ARTIFACTS)) {
    const phase = getPhase(phaseId as PhaseId);
    const file = path.join(changeDir, phase.artifact);

    // 模板渲染优先；无 templatesDir 或无 .hbs 文件时回退到硬编码 md
    const rendered = templatesDir
      ? renderE2ePhaseArtifact(phaseId as PhaseId, templatesDir)
      : null;
    const md = rendered ?? body.md;

    fs.writeFileSync(file, md, "utf8");
    // Write companion JSON for Zod validation (uses enriched E2E_JSON_ARTIFACTS)
    fs.writeFileSync(path.join(changeDir, `${phaseId}.json`), JSON.stringify(body.json, null, 2));
    // Write hash snap for reverse-sync
    const snapDir = path.join(changeDir, ".taiyi", "snapshots");
    fs.mkdirSync(snapDir, { recursive: true });
    const hash = crypto.createHash("sha256").update(md).digest("hex");
    fs.writeFileSync(path.join(snapDir, `${phaseId}.hash`), hash);
  }
  fs.writeFileSync(path.join(changeDir, ".dev-complete"), DEV_COMPLETE_EVIDENCE, "utf8");
}

export function runE2eWorkflow(
  engine: WorkflowEngine,
  slug: string,
  templatesDir?: string,
): { ok: boolean; error?: string; completed: PhaseId[] } {
  if (!engine.getState(slug)) {
    engine.initChange(slug, { title: "E2E Demo", templatesDir });
  }

  const changeDir = engine.changeDir(slug);
  writeE2eArtifacts(changeDir, templatesDir);

  const completed: PhaseId[] = [];
  for (const phaseId of E2E_PHASE_ORDER) {
    const state = engine.getState(slug);
    if (!state || state.currentPhase !== phaseId) {
      return {
        ok: false,
        error: `Expected current phase ${phaseId}, got ${state?.currentPhase}`,
        completed,
      };
    }

    if (phaseId === "review") {
      fs.writeFileSync(
        path.join(changeDir, "health-report.md"),
        "# Health Report\n\nE2E smoke — no blocking findings.\n",
        "utf8",
      );
      const mark = engine.markAuxiliary(slug, "taiyi-health");
      if (!mark.ok) {
        return { ok: false, error: `review: ${mark.error}`, completed };
      }
    }

    const result = engine.completePhase(slug, phaseId, PASSING_GATES, {
      allowAutoHuman: true,
      skipStepOrderCheck: true,
      skipArtifactValidation: true,
    });
    if (!result.ok) {
      const artifact = artifactPathForPhase(changeDir, phaseId);
      return {
        ok: false,
        error: `${phaseId}: ${result.error} (artifact: ${artifact})`,
        completed,
      };
    }
    completed.push(phaseId);
  }

  const final = engine.getState(slug);
  if (!final || final.completedPhases.length !== 9) {
    return {
      ok: false,
      error: `Expected 9 completed phases, got ${final?.completedPhases.length}`,
      completed,
    };
  }

  return { ok: true, completed };
}
