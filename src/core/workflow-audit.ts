import fs from "node:fs";
import path from "node:path";
import type { ChangeState } from "./types.js";
import { listChanges } from "./list-changes.js";
import { buildPhaseGuide } from "./phase-guide.js";
import { buildHarnessPlan } from "./harness-runner.js";
import { normalizeState } from "./normalize-state.js";
import { deliveryGateEnabled, evaluateDeliveryGate } from "./gates/delivery-gate.js";
import { getOpenspecStatus } from "../integrations/openspec.js";
import { detectAheadArtifacts } from "./ahead-artifacts.js";

export type AuditFinding = {
  severity: "high" | "medium" | "low";
  code: string;
  message: string;
};

export type ChangeAuditReport = {
  slug: string;
  phase: string;
  workflowCompleted: boolean;
  findings: AuditFinding[];
  ok: boolean;
};

export type WorkflowAuditReport = {
  ok: boolean;
  workspaceDir: string;
  taiyiRoot: string;
  changes: ChangeAuditReport[];
  notes: string[];
};

function readRawState(changeDir: string): ChangeState | null {
  const p = path.join(changeDir, "state.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as ChangeState;
  } catch {
    return null;
  }
}

function legacyStateFindings(raw: ChangeState): AuditFinding[] {
  const out: AuditFinding[] = [];
  if (raw.currentPhase === ("complete" as ChangeState["currentPhase"])) {
    out.push({
      severity: "high",
      code: "state.legacy-phase",
      message: 'state.json 使用非法 currentPhase "complete"（应 integration + workflowStatus）',
    });
  }
  if (typeof raw.complexity === "string") {
    out.push({
      severity: "medium",
      code: "state.legacy-complexity",
      message: `complexity 为字符串 "${raw.complexity}"，应使用 { level, score, recommendedSkills }`,
    });
  }
  return out;
}

function changeCheckboxDrift(
  changeDir: string,
  integrationDone: boolean,
  preIntegrationAudit = false,
): AuditFinding[] {
  const changePath = path.join(changeDir, "CHANGE.md");
  const changelogPath = path.join(changeDir, "CHANGELOG.md");
  if (!fs.existsSync(changePath)) return [];

  const change = fs.readFileSync(changePath, "utf8");
  const openBoxes = (change.match(/- \[ \]/g) ?? []).length;
  if (openBoxes === 0) return [];

  const out: AuditFinding[] = [];
  if (integrationDone) {
    out.push({
      severity: "high",
      code: preIntegrationAudit ? "ac.open-before-integration" : "ac.open-after-integration",
      message: preIntegrationAudit
        ? `complete integration 前 CHANGE.md 仍有 ${openBoxes} 条 Success Criteria 未勾选`
        : `integration 已完成但 CHANGE.md 仍有 ${openBoxes} 条 Success Criteria 未勾选`,
    });
  }

  if (fs.existsSync(changelogPath)) {
    const changelog = fs.readFileSync(changelogPath, "utf8");
    const claimsMet =
      /Success Criteria Met|已满足|criteria met/i.test(changelog) &&
      /✅|\[x\]/i.test(changelog);
    if (claimsMet) {
      out.push({
        severity: "high",
        code: "ac.change-changelog-drift",
        message: `CHANGE.md 仍有 ${openBoxes} 条未勾选，但 CHANGELOG 声称 Success Criteria 已满足`,
      });
    }
  }
  return out;
}

function openspecFindings(workspaceDir: string, slug: string, integrationDone: boolean): AuditFinding[] {
  const status = getOpenspecStatus(workspaceDir, slug);
  if (!status.detected) return [];
  const out: AuditFinding[] = [];
  if (integrationDone && !status.changeExists) {
    out.push({
      severity: "medium",
      code: "openspec.missing-active-change",
      message: `integration 已完成但无 openspec/changes/${slug}/，archive 前需 taiyi sync-openspec`,
    });
  }
  return out;
}

export type AuditChangeOptions = {
  /** integration complete 前的预检：按 integration 已完成评估交付/勾选/OpenSpec */
  pretendIntegrationComplete?: boolean;
};

export function auditChange(
  workspaceDir: string,
  taiyiRoot: string,
  slug: string,
  options?: AuditChangeOptions,
): ChangeAuditReport | null {
  const changeDir = path.join(taiyiRoot, "changes", slug);
  const raw = readRawState(changeDir);
  if (!raw) return null;

  const findings: AuditFinding[] = [...legacyStateFindings(raw)];
  const state = normalizeState(raw);
  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
  const plan = buildHarnessPlan(workspaceDir, taiyiRoot, state);

  const preIntegrationAudit = options?.pretendIntegrationComplete === true;
  if (!preIntegrationAudit) {
    for (const b of plan.blockers) {
      findings.push({ severity: "medium", code: "harness.blocker", message: b });
    }
    if (!guide.qualityReady && !guide.workflowCompleted) {
      findings.push({
        severity: "high",
        code: "artifact.quality",
        message: `阶段 ${guide.currentPhase} 工件未通过质量校验: ${guide.qualityHints.join("; ") || "见工件"}`,
      });
    }
  }

  const integrationDone =
    options?.pretendIntegrationComplete === true ||
    state.completedPhases.includes("integration");

  for (const a of detectAheadArtifacts(changeDir, state)) {
    findings.push({
      severity:
        a.code === "artifacts.ahead-of-phase" ||
        a.code === "artifacts.missing-for-incomplete"
          ? "medium"
          : "low",
      code: a.code,
      message: a.message,
    });
  }

  findings.push(
    ...changeCheckboxDrift(changeDir, integrationDone, preIntegrationAudit),
  );
  findings.push(...openspecFindings(workspaceDir, slug, integrationDone));

  if (!state.completedPhases.includes("integration") && guide.workflowCompleted) {
    findings.push({
      severity: "high",
      code: "workflow.status-drift",
      message: "workflowCompleted 为真但 integration 不在 completedPhases",
    });
  }

  if (deliveryGateEnabled(workspaceDir)) {
    const delivery = evaluateDeliveryGate(workspaceDir);
    if (integrationDone && !delivery.passed && !delivery.skipped) {
      findings.push({
        severity: "high",
        code: "delivery.not-closed",
        message: options?.pretendIntegrationComplete
          ? `complete integration 前交付未闭环: ${delivery.reason}`
          : `integration 已过关但工程交付未闭环: ${delivery.reason}`,
      });
    }
  }

  const hasHigh = findings.some((f) => f.severity === "high");
  return {
    slug,
    phase: guide.workflowCompleted ? "completed" : guide.currentPhase,
    workflowCompleted: guide.workflowCompleted,
    findings,
    ok: !hasHigh,
  };
}

export function auditWorkspace(
  workspaceDir: string,
  taiyiRoot: string,
  options?: { slug?: string },
): WorkflowAuditReport {
  const notes = [
    "audit = 流程/交付排查（非 doctor 安装自检）",
    "对照: doctor=安装 · verify=PR工件门禁 · audit=交付闭环与工件漂移",
  ];
  const changesDir = path.join(taiyiRoot, "changes");
  if (!fs.existsSync(changesDir)) {
    return {
      ok: true,
      workspaceDir,
      taiyiRoot,
      changes: [],
      notes: [...notes, "无 .taiyi/changes/"],
    };
  }

  const slugs = options?.slug
    ? [options.slug]
    : listChanges(taiyiRoot).map((c) => c.slug);

  const changes: ChangeAuditReport[] = [];
  for (const slug of slugs) {
    const r = auditChange(workspaceDir, taiyiRoot, slug);
    if (r) changes.push(r);
  }

  if (options?.slug && changes.length === 0) {
    return {
      ok: false,
      workspaceDir,
      taiyiRoot,
      changes: [],
      notes: [...notes, `未找到 slug: ${options.slug}`],
    };
  }

  return {
    ok: changes.every((c) => c.ok),
    workspaceDir,
    taiyiRoot,
    changes,
    notes,
  };
}

export function formatAuditPlain(report: WorkflowAuditReport): string {
  const lines: string[] = [];
  lines.push(`TaiyiForge audit — ${report.ok ? "PASS" : "FAIL"}`);
  lines.push(`workspace: ${report.workspaceDir}`);
  for (const c of report.changes) {
    lines.push(`\n[${c.ok ? "✓" : "✗"}] ${c.slug}  phase=${c.phase}  completed=${c.workflowCompleted}`);
    if (c.findings.length === 0) {
      lines.push("    (no findings)");
      continue;
    }
    for (const f of c.findings) {
      lines.push(`    [${f.severity}] ${f.code}: ${f.message}`);
    }
  }
  for (const n of report.notes) lines.push(`\n${n}`);
  return lines.join("\n");
}
