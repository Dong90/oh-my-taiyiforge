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
import { resolveChangeDir } from "./taiyi-archive.js";
import { isChangeActive } from "./change-status.js";

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
  options?: { preIntegrationAudit?: boolean; currentPhase?: string },
): AuditFinding[] {
  const changePath = path.join(changeDir, "CHANGE.md");
  const changelogPath = path.join(changeDir, "CHANGELOG.md");
  if (!fs.existsSync(changePath)) return [];

  const change = fs.readFileSync(changePath, "utf8");
  const openBoxes = (change.match(/- \[ \]/g) ?? []).length;
  if (openBoxes === 0) return [];

  const out: AuditFinding[] = [];
  const preIntegrationAudit = options?.preIntegrationAudit === true;
  const earlyPhase = ["dev", "test", "review"].includes(options?.currentPhase ?? "");

  if (integrationDone || preIntegrationAudit) {
    out.push({
      severity: preIntegrationAudit || integrationDone ? "high" : "medium",
      code: preIntegrationAudit ? "ac.open-before-integration" : "ac.open-after-integration",
      message: preIntegrationAudit
        ? `complete integration 前 CHANGE.md 仍有 ${openBoxes} 条 Success Criteria 未勾选`
        : `integration 已完成但 CHANGE.md 仍有 ${openBoxes} 条 Success Criteria 未勾选`,
    });
  } else if (earlyPhase) {
    out.push({
      severity: "medium",
      code: "ac.open-before-integration",
      message: `CHANGE.md 仍有 ${openBoxes} 条 Success Criteria 未勾选（integration 前须全部 [x]）`,
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
  if (integrationDone && !status.changeExists && !status.archivedExists) {
    out.push({
      severity: "medium",
      code: "openspec.missing-active-change",
      message: `integration 已完成但无 openspec/changes/${slug}/，archive 前需 taiyi sync-openspec`,
    });
  }
  if (integrationDone && status.archivedExists && status.changeExists) {
    out.push({
      severity: "medium",
      code: "openspec.stale-active-after-archive",
      message: `OpenSpec 已归档于 ${status.archivedPath}，但 active openspec/changes/${slug}/ 仍存在（多为 post-archive sync）；删除 active 目录或 git restore`,
    });
  }
  return out;
}

function deliveryFindings(
  workspaceDir: string,
  slug: string,
  integrationDone: boolean,
  options?: { preIntegrationAudit?: boolean },
): AuditFinding[] {
  if (!deliveryGateEnabled(workspaceDir) || !integrationDone) return [];

  const delivery = evaluateDeliveryGate(workspaceDir, { slug, phase: "integration" });
  if (delivery.passed || delivery.skipped) return [];

  const openspec = getOpenspecStatus(workspaceDir, slug);
  const dirtyWorkspace = Boolean(delivery.reason?.includes("未提交"));
  const postArchive = openspec.archivedExists && dirtyWorkspace;

  if (postArchive) {
    return [
      {
        severity: "medium",
        code: "delivery.dirty-after-archive",
        message: `Taiyi/OpenSpec 已归档，交付待 git commit：${delivery.reason}`,
      },
    ];
  }

  return [
    {
      severity: "high",
      code: "delivery.not-closed",
      message: options?.preIntegrationAudit
        ? `complete integration 前交付未闭环: ${delivery.reason}`
        : `integration 已过关但工程交付未闭环: ${delivery.reason}`,
    },
  ];
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
  const changeDir = resolveChangeDir(taiyiRoot, slug) ?? path.join(taiyiRoot, "changes", slug);
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
    ...changeCheckboxDrift(changeDir, integrationDone, {
      preIntegrationAudit,
      currentPhase: state.currentPhase,
    }),
  );
  findings.push(...openspecFindings(workspaceDir, slug, integrationDone));

  if (!state.completedPhases.includes("integration") && guide.workflowCompleted) {
    findings.push({
      severity: "high",
      code: "workflow.status-drift",
      message: "workflowCompleted 为真但 integration 不在 completedPhases",
    });
  }

  findings.push(
    ...deliveryFindings(workspaceDir, slug, integrationDone, { preIntegrationAudit }),
  );

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
  if (slugs.length === 0) {
    return {
      ok: true,
      workspaceDir,
      taiyiRoot,
      changes: [],
      notes: [...notes, "无 .taiyi/changes/"],
    };
  }
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

/**
 * 跨变更兼容性检查：当前变更 complete integration 时，
 * 检查是否有其他 active 变更尚未完成集成。
 * 返回 findings（仅 medium 级别，不阻塞过关），仅在有多变更场景报警。
 */
export function crossChangeFindings(
  taiyiRoot: string,
  currentSlug: string,
): AuditFinding[] {
  const changesDir = path.join(taiyiRoot, "changes");
  if (!fs.existsSync(changesDir)) return [];

  const others: string[] = [];
  for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (ent.name === currentSlug) continue;
    const raw = readRawState(path.join(changesDir, ent.name));
    if (raw) {
      const state = normalizeState(raw);
      if (isChangeActive(state)) {
        others.push(`${ent.name}(${state.currentPhase})`);
      }
    }
  }

  if (others.length === 0) return [];

  return [
    {
      severity: "medium",
      code: "cross-change.pending-changes",
      message: `${currentSlug} 集成完成但还有 ${others.length} 个变更正在开发中: ${others.join(", ")}。请确认兼容性后整体验证。`,
    },
  ];
}

export function formatAuditPlain(report: WorkflowAuditReport): string {
  const lines: string[] = [];
  const highCount = report.changes.reduce(
    (n, c) => n + c.findings.filter((f) => f.severity === "high").length,
    0,
  );
  const mediumCount = report.changes.reduce(
    (n, c) => n + c.findings.filter((f) => f.severity === "medium").length,
    0,
  );
  lines.push(`TaiyiForge audit — ${report.ok ? "PASS" : "FAIL"}`);
  lines.push(
    `三态: 工件 verify（用 taiyi verify）· 流程 audit（本命令）· 交付 delivery（git commit / 干净工作区）`,
  );
  if (highCount === 0 && mediumCount > 0) {
    lines.push(`提示: 仅 ${mediumCount} 条 medium（多为 post-archive 脏工作区），commit 后可再 audit`);
  }
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

/** audit --compact：摘要 + 仅 high/blocking findings */
export function formatAuditCompact(report: WorkflowAuditReport): string {
  const high: string[] = [];
  const medium: string[] = [];
  for (const c of report.changes) {
    for (const f of c.findings) {
      const line = `${c.slug}: [${f.severity}] ${f.code}`;
      if (f.severity === "high") high.push(line);
      else if (f.severity === "medium") medium.push(line);
    }
  }
  const lines = [
    `audit ${report.ok ? "PASS" : "FAIL"} · changes=${report.changes.length} · high=${high.length} · medium=${medium.length}`,
  ];
  for (const h of high.slice(0, 8)) lines.push(`  ${h}`);
  if (high.length > 8) lines.push(`  … +${high.length - 8} high`);
  if (!report.ok && high.length === 0 && medium.length) {
    lines.push(`  (medium only — often post-archive dirty workspace)`);
    for (const m of medium.slice(0, 3)) lines.push(`  ${m}`);
  }
  return lines.join("\n");
}

export type AuditJsonCompact = {
  ok: boolean;
  changes: number;
  highCount: number;
  mediumCount: number;
  findings: Array<{ slug: string; severity: "high"; code: string; message: string }>;
  notes?: string[];
};

/** audit --json --compact — Agent 读法：计数 + 仅 high findings */
export function buildAuditJsonCompact(report: WorkflowAuditReport): AuditJsonCompact {
  const findings: AuditJsonCompact["findings"] = [];
  let highCount = 0;
  let mediumCount = 0;
  for (const c of report.changes) {
    for (const f of c.findings) {
      if (f.severity === "high") {
        highCount++;
        findings.push({
          slug: c.slug,
          severity: "high",
          code: f.code,
          message: f.message,
        });
      } else if (f.severity === "medium") {
        mediumCount++;
      }
    }
  }
  return {
    ok: report.ok,
    changes: report.changes.length,
    highCount,
    mediumCount,
    findings: findings.slice(0, 12),
    notes: report.notes.length ? report.notes : undefined,
  };
}
