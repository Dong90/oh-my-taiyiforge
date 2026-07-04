import fs from "node:fs";
import path from "node:path";
import type { ChangeProfile, ChangeState, GateInput, PhaseId, QualityScores } from "./types.js";
import { clearRuntimeForSlug } from "./runtime/orphan-runtime.js";
import { evaluateHumanGate } from "./gates/human-gate.js";
import { rejectAutomatedHumanApproval, requiresHumanGate } from "./gates/human-gate-config.js";
import { isKnownAuxiliarySkill, KNOWN_AUXILIARY_SKILLS } from "./routing/auxiliary-skills.js";
import {
  auxiliaryArtifactSatisfied,
  AUXILIARY_ARTIFACTS,
} from "./auxiliary-artifacts.js";
import { formatChangeNotFound, formatWrongPhaseError } from "./cli-hints.js";
import { assertValidSlug, validateSlug } from "./slug.js";
import { evaluateQualityGate } from "./gates/quality-gate.js";
import { safeWriteFileSync } from "./file-writer.js";
import { canEnterPhase, getNextPhase, getPhase, listPhases } from "./phase-registry.js";
import { skippedPhasesForProfile, isPhaseSkipped, changeHasUiSignals } from "./profile.js";
import { loadProjectConfig } from "./project-config.js";
import { assessComplexity, type ComplexitySignals } from "./routing/complexity.js";
import { inferComplexitySignals } from "./routing/infer-complexity.js";
import { resolveChangeDir } from "./taiyi-archive.js";
import { resetChangeArtifacts } from "./change-artifact-reset.js";
import { seedChangeTemplates, seedPhaseTemplate } from "./template-seed.js";
import type { CodeStyleContract, ModuleManifestEntry, SeedVars } from "./template-engine.js";
import {
  artifactPathForPhase,
  validateArtifactFile,
  ZOD_PHASES,
} from "./artifact-validator.js";
import { autoSyncLocalEdits } from "./reverse-sync.js";
import { resolveHbsTemplatesDir } from "./package-root.js";
import { syncMarkdownFromJsonIfStale } from "./artifact-sync.js";
import {
  enforceAutoHarnessBeforeComplete,
  runPostCompleteShellHooks,
} from "./harness-runner.js";
import { enforceTokenBudgetBeforeComplete } from "./token-runner.js";
import { expectedPhaseCount, isChangeAborted, isWorkflowCompleted } from "./change-status.js";
import { normalizeState } from "./normalize-state.js";
import { deliveryGateEnabled, evaluateDeliveryGate, evaluateProductionReadiness } from "./gates/delivery-gate.js";
import { auditChange, crossChangeFindings } from "./workflow-audit.js";
import { auditTaskPlan, formatPlanAudit, type PlanAuditResult } from "./plan-audit.js";
import { resolveArchTemplateForChange } from "./profile.js";
import { evaluateArchitecture } from "./review-arch-check.js";
import { syncRootChangelog } from "./sync-root-changelog.js";
import { syncChangeState } from "./state-sync.js";
import {
  detectEarlyCodeChanges,
  earlyCodeBlockOnContinue,
} from "./dev-phase-guard.js";
import { getLogger } from "./logger.js";
import { ChangeLock } from "./change-lock.js";
import { logActivity } from "./activity-log.js";
import { appendPhaseToContext, generateGraphPhaseContext } from "./phase-context.js";

export type InitChangeOptions = {
  title?: string;
  /** 一句话变更描述（渲染到 CHANGE.md 的「一句话」行和 Problem Statement） */
  motivation?: string;
  /** 较长的变更背景描述（motivation 的第二 fallback） */
  description?: string;
  templatesDir?: string;
  /** `null` disables canonical json+hbs seed (legacy .md only). */
  hbsTemplatesDir?: string | null;
  profile?: ChangeProfile;
  strictDev?: boolean;
  autoHarness?: boolean;
  /** Reinitialize even when state.json already exists (resets progress). */
  force?: boolean;
  /** 架构设计模式列表 */
  architecture_patterns?: string[];
  /** 技术栈偏好 */
  tech_stack_preferences?: SeedVars["tech_stack_preferences"];
  /** 代码质量契约 */
  code_style?: CodeStyleContract;
  /** 模块清单 */
  module_manifest?: ModuleManifestEntry[];
};

export type StateLookup =
  | { status: "ok"; state: ChangeState }
  | { status: "missing" }
  | { status: "corrupt"; error: string };

export { normalizeState } from "./normalize-state.js";

export class WorkflowEngine {
  private locks = new Map<string, ChangeLock>();
  private log = getLogger();
  /** Cache phases already plan-audited per slug to avoid re-reading TASK.md */
  private _auditedPhases = new Set<string>();

  constructor(
    private readonly workspaceRoot: string,
    private readonly templatesDir?: string,
  ) {}

  private changesDir(): string {
    return path.join(this.workspaceRoot, "changes");
  }

  private statePath(slug: string): string {
    const dir = resolveChangeDir(this.workspaceRoot, slug) ?? path.join(this.changesDir(), slug);
    return path.join(dir, "state.json");
  }

  changeDir(slug: string): string {
    return resolveChangeDir(this.workspaceRoot, slug) ?? path.join(this.changesDir(), slug);
  }

  /** `.taiyi` 根目录 */
  get taiyiRoot(): string {
    return this.workspaceRoot;
  }

  initChange(slug: string, options?: InitChangeOptions): ChangeState & { seeded: string[] } {
    assertValidSlug(slug);
    const dir = this.changeDir(slug);
    const existing = this.statePath(slug);
    if (fs.existsSync(existing) && !options?.force) {
      throw new Error(`Change already exists: ${slug}. Use --force to reinitialize.`);
    }
    fs.mkdirSync(dir, { recursive: true });
    if (options?.force && fs.existsSync(dir)) {
      resetChangeArtifacts(dir);
      clearRuntimeForSlug(this.workspaceRoot, slug);
    }
    const profile = options?.profile ?? "full";
    const skippedPhases = skippedPhasesForProfile(profile);
    const templatesDir = options?.templatesDir ?? this.templatesDir;
    const seeded =
      templatesDir != null && !skippedPhases.includes("change")
        ? seedChangeTemplates(dir, templatesDir, {
            slug,
            title: options?.title,
            motivation: options?.motivation,
            description: options?.description,
            architecture_patterns: options?.architecture_patterns,
            tech_stack_preferences: options?.tech_stack_preferences,
            code_style: options?.code_style,
            module_manifest: options?.module_manifest,
          }, { hbsTemplatesDir: options?.hbsTemplatesDir })
        : [];

    let initialPhase: PhaseId = "change";
    if (skippedPhases.includes("change")) {
      const all = listPhases().sort((a, b) => a.order - b.order);
      initialPhase = all.find((p) => !skippedPhases.includes(p.id))?.id ?? "dev";
    }

    const now = new Date().toISOString();
    const signals = inferComplexitySignals(dir);
    const complexity = assessComplexity(signals);

    const autoHarness =
      options?.autoHarness ??
      (process.env.TAIYI_AUTO_HARNESS === "1" || process.env.TAIYI_AUTO_HARNESS === "true");

    const state: ChangeState = {
      slug,
      currentPhase: initialPhase,
      completedPhases: [],
      profile,
      skippedPhases,
      strictDev: options?.strictDev ?? false,
      autoHarness,
      complexity,
      auxiliaryCompleted: [],
      workflowStatus: "active",
      createdAt: now,
      updatedAt: now,
    };
    this.writeState(state);
    this.log.info("Initiated change", { slug, profile: options?.profile ?? "full", initialPhase });
    logActivity(this.taiyiRoot, { event: "change:created", slug, profile: options?.profile ?? "full" });
    return { ...state, seeded };
  }

  lookupState(slug: string): StateLookup {
    const slugCheck = validateSlug(slug);
    if (!slugCheck.ok) return { status: "missing" };
    const file = this.statePath(slug);
    if (!fs.existsSync(file)) return { status: "missing" };
    try {
      const raw = normalizeState(JSON.parse(fs.readFileSync(file, "utf8")) as ChangeState);
      const synced = this.applyStateSync(raw);
      return { status: "ok", state: synced.state };
    } catch (e) {
      return {
        status: "corrupt",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  /** 对齐 auxiliary / seed 标记与 state.json（status / continue 前调用）。 */
  applyStateSync(state: ChangeState): ReturnType<typeof syncChangeState> {
    const changeDir = this.changeDir(state.slug);
    const result = syncChangeState(changeDir, state);
    if (result.changed) {
      this.writeState(result.state);
    }
    return result;
  }

  getState(slug: string): ChangeState | null {
    const lookup = this.lookupState(slug);
    return lookup.status === "ok" ? lookup.state : null;
  }

  private writeState(state: ChangeState): void {
    const lock = this.lockFor(state.slug);
    lock.acquire(5000);
    try {
      const file = this.statePath(state.slug);
      fs.mkdirSync(path.dirname(file), { recursive: true });

      // OCC: read existing state version to detect concurrent writes
      let existingVersion = 0;
      try {
        const existing = JSON.parse(fs.readFileSync(file, "utf8")) as ChangeState;
        existingVersion = existing.version ?? 0;
      } catch {
        // File doesn't exist or is corrupt — first write
      }

      const incomingVersion = state.version ?? 0;
      if (incomingVersion > 0 && incomingVersion < existingVersion) {
        throw new Error(
          `stale state version for ${state.slug}: ` +
          `incoming ${incomingVersion} < disk ${existingVersion}. ` +
          `Please re-read state and retry.`,
        );
      }

      const nextState: ChangeState = { ...state, version: existingVersion + 1 };

      // Propagate version back to caller's state object for correct OCC on subsequent writes
      state.version = nextState.version;

      const tmp = `${file}.tmp.${process.pid}`;
      safeWriteFileSync(tmp, JSON.stringify(nextState, null, 2) + "\n", { skipRedact: true, skipFormat: true });
      fs.renameSync(tmp, file);
    } finally {
      lock.release();
    }
  }

  private lockFor(slug: string): ChangeLock {
    let lock = this.locks.get(slug);
    if (!lock) {
      lock = new ChangeLock(this.workspaceRoot, slug);
      this.locks.set(slug, lock);
    }
    return lock;
  }

  private artifactPath(slug: string, phaseId: PhaseId): string {
    const phase = getPhase(phaseId);
    if (phase.kind === "code") {
      return path.join(this.changeDir(slug), ".dev-complete");
    }
    return path.join(this.changeDir(slug), phase.artifact);
  }

  private hasArtifact(slug: string, phaseId: PhaseId): boolean {
    const p = this.artifactPath(slug, phaseId);
    return fs.existsSync(p) && fs.statSync(p).size > 0;
  }

  markAuxiliary(slug: string, skillId: string): { ok: boolean; error?: string } {
    const slugCheck = validateSlug(slug);
    if (!slugCheck.ok) return { ok: false, error: slugCheck.error };
    const state = this.getState(slug);
    if (!state) return { ok: false, error: formatChangeNotFound(slug) };
    if (!skillId.startsWith("taiyi-")) {
      return { ok: false, error: "skillId must be taiyi-*" };
    }
    if (!isKnownAuxiliarySkill(skillId)) {
      return {
        ok: false,
        error: `Unknown auxiliary skill: ${skillId} (known: ${[...KNOWN_AUXILIARY_SKILLS].join(", ")})`,
      };
    }
    const changeDir = this.changeDir(slug);
    if (!auxiliaryArtifactSatisfied(changeDir, skillId)) {
      const spec = AUXILIARY_ARTIFACTS[skillId];
      const expected =
        spec?.files?.join(", ") ?? spec?.dirs?.map((d) => `${d}/*.md`).join(", ") ?? "artifact";
      return {
        ok: false,
        error: `Auxiliary artifact not ready for ${skillId} (expected ${expected}, non-seed content)`,
      };
    }
    const auxiliaryCompleted = state.auxiliaryCompleted.includes(skillId)
      ? state.auxiliaryCompleted
      : [...state.auxiliaryCompleted, skillId];
    this.writeState({ ...state, auxiliaryCompleted, updatedAt: new Date().toISOString() });
    this.log.info("Marked auxiliary", { slug, skillId });
    logActivity(this.taiyiRoot, { event: "aux:completed", slug, skill: skillId });
    return { ok: true };
  }

  refreshComplexity(slug: string, signals?: ComplexitySignals) {
    const state = this.getState(slug);
    if (!state) throw new Error(`Change not found: ${slug}`);
    const inferred = signals ?? inferComplexitySignals(this.changeDir(slug));
    const complexity = assessComplexity(inferred);
    this.writeState({ ...state, complexity, updatedAt: new Date().toISOString() });
    return { signals: inferred, assessment: complexity };
  }

  private evaluatePhaseQuality(
    slug: string,
    phaseId: PhaseId,
    changeDir: string,
    qualityGateScores: QualityScores,
    state: { strictDev?: boolean },
    workingState: ChangeState,
    options?: { skipArtifactValidation?: boolean },
  ): { ok: true; qualityScores: QualityScores; qualityHints?: string[] } | { ok: false; error: string; qualityHints?: string[] } {
    let qualityScores: QualityScores = { ...qualityGateScores };
    let qualityHints: string[] | undefined;

    // ── JSON → MD：json 新于 md 时用 hbs 重渲染视图 ──
    if (!options?.skipArtifactValidation && ZOD_PHASES.includes(phaseId)) {
      const hbsTemplatesDir = resolveHbsTemplatesDir(import.meta.url);
      if (fs.existsSync(path.join(hbsTemplatesDir, `${phaseId}.hbs`))) {
        const syncMd = syncMarkdownFromJsonIfStale(
          phaseId,
          changeDir,
          hbsTemplatesDir,
          { slug },
        );
        if (syncMd.rendered) {
          qualityHints = (qualityHints ?? []).concat(
            `⚡ ${phaseId}.json → ${getPhase(phaseId).artifact} 已从 schema 重渲染`,
          );
        }
      }
    }

    // ── 反向同步：人类改 MD 后拉回 JSON ──
    if (!options?.skipArtifactValidation && ZOD_PHASES.includes(phaseId)) {
      const hbsTemplatesDir = resolveHbsTemplatesDir(import.meta.url);
      if (fs.existsSync(hbsTemplatesDir)) {
        const syncResult = autoSyncLocalEdits(phaseId, this.changeDir(slug), hbsTemplatesDir);
        if (syncResult.needsLlm) {
          qualityHints = (qualityHints ?? []).concat(syncResult.message);
        }
      }
    }

    if (!options?.skipArtifactValidation) {
      const artifactFile = artifactPathForPhase(this.changeDir(slug), phaseId);
      const inferred = validateArtifactFile(artifactFile, phaseId);
      if (inferred) {
        qualityHints = inferred.hints;
        qualityScores = {
          completeness: qualityScores.completeness && inferred.scores.completeness,
          consistency: qualityScores.consistency && inferred.scores.consistency,
          verifiability: qualityScores.verifiability && inferred.scores.verifiability,
          traceability: qualityScores.traceability && inferred.scores.traceability,
          engineering_quality: qualityScores.engineering_quality && inferred.scores.engineering_quality,
        };
      }

      if (phaseId === "dev" && state.strictDev) {
        const devPath = this.artifactPath(slug, "dev");
        const devText = fs.readFileSync(devPath, "utf8");
        if (!/strict:\s*true/i.test(devText)) {
          qualityHints = [
            ...(qualityHints ?? []),
            "init 时启用了 strictDev：.dev-complete 首行写 strict: true",
          ];
          qualityScores.verifiability = false;
          qualityScores.completeness = false;
        }
      }
    }

    if (process.env.TAIYI_SKIP_QUALITY_GATE !== "1") {
      const isLowComplexity = workingState.complexity?.level === "low";
      const isHumanGated = requiresHumanGate(phaseId);
      const quality = evaluateQualityGate(qualityScores);
      if (!quality.passed) {
        if (isLowComplexity && !isHumanGated && phaseId !== "integration") {
          // Low complexity: still require basic dimensions (completeness, consistency)
          const basicFailed = quality.failed.filter(
            (d) => d === "completeness" || d === "consistency",
          );
          if (basicFailed.length > 0) {
            const hintText = qualityHints?.length ? ` — ${qualityHints.join("; ")}` : "";
            return { ok: false, error: `Quality gate failed (basic): ${basicFailed.join(", ")}${hintText}`, qualityHints };
          }
        } else {
          const hintText = qualityHints?.length ? ` — ${qualityHints.join("; ")}` : "";
          return { ok: false, error: `Quality gate failed: ${quality.failed.join(", ")}${hintText}`, qualityHints };
        }
      }
    }

    return { ok: true, qualityScores, qualityHints };
  }

  completePhase(
    slug: string,
    phaseId: PhaseId,
    gates: GateInput,
    options?: {
      skipArtifactValidation?: boolean;
      forceHuman?: boolean;
      allowAutoHuman?: boolean;
      /** 测试/E2E 批量预写工件时跳过「超前阶段」拦截 */
      skipStepOrderCheck?: boolean;
    },
  ): { ok: boolean; error?: string; qualityHints?: string[] } {
    const slugCheck = validateSlug(slug);
    if (!slugCheck.ok) return { ok: false, error: slugCheck.error };
    const state = this.getState(slug);
    if (!state) return { ok: false, error: formatChangeNotFound(slug) };
    if (isWorkflowCompleted(state)) {
      return { ok: false, error: "Workflow already completed (九阶段已完成)" };
    }
    if (isChangeAborted(state)) {
      return { ok: false, error: "变更已取消 (aborted)。请 /taiyi:new 或指定其他 slug。" };
    }
    if (isPhaseSkipped(phaseId, state.skippedPhases)) {
      return { ok: false, error: `Phase ${phaseId} is skipped for profile ${state.profile}` };
    }
    if (state.currentPhase !== phaseId) {
      logActivity(this.taiyiRoot, { event: "phase:blocked", slug, phase: phaseId, reason: `wrong phase, expected ${state.currentPhase}` });
      return {
        ok: false,
        error: formatWrongPhaseError(slug, state.currentPhase, phaseId),
      };
    }

    const enter = canEnterPhase(phaseId, {
      completedPhases: state.completedPhases,
      skippedPhases: state.skippedPhases,
    });
    if (!enter.ok) {
      return { ok: false, error: `Missing phases: ${enter.missing.join(", ")}` };
    }

    if (!this.hasArtifact(slug, phaseId)) {
      return {
        ok: false,
        error: `Artifact missing for phase ${phaseId}`,
      };
    }

    const changeDir = this.changeDir(slug);
    const sync = syncChangeState(changeDir, state);
    if (sync.changed) {
      this.writeState(sync.state);
    }
    if (!options?.skipStepOrderCheck && sync.blockers.length > 0) {
      return {
        ok: false,
        error: `阶段顺序冲突（须按步推进，勿跳步写后续工件）:\n${sync.blockers.map((b) => `- ${b.message}`).join("\n")}`,
      };
    }
    const workingState = { ...sync.state };

    if (
      phaseId === "review" &&
      (workingState.complexity?.level === "high" ||
        workingState.complexity?.level === "medium")
    ) {
      if (!workingState.auxiliaryCompleted.includes("taiyi-health")) {
        return {
          ok: false,
          error:
            "Medium/high complexity: complete taiyi-health and run `taiyi mark-aux <slug> taiyi-health` before review",
        };
      }
      if (!auxiliaryArtifactSatisfied(changeDir, "taiyi-health")) {
        return {
          ok: false,
          error:
            "Medium/high complexity: health-report.md 未就绪（非模板占位），先 /taiyi:health 再 mark-aux",
        };
      }
    }

    const workspaceDir = path.dirname(this.workspaceRoot);

    const earlyCode = detectEarlyCodeChanges(workspaceDir, phaseId);
    if (earlyCode && earlyCodeBlockOnContinue()) {
      return { ok: false, error: earlyCode.message };
    }

    if (phaseId === "task" && !options?.skipArtifactValidation) {
      const cacheKey = `${slug}::${phaseId}`;
      if (!this._auditedPhases.has(cacheKey)) {
        const taskMdPath = path.join(changeDir, "TASK.md");
        if (!fs.existsSync(taskMdPath)) {
          return { ok: false, error: "TASK.md 不存在 — 无法进入 dev 阶段" };
        }
        const taskContent = fs.readFileSync(taskMdPath, "utf8");
        const isSeed = taskContent.includes("<!-- taiyi:seed-template -->");
        if (!isSeed) {
          const audit: PlanAuditResult = auditTaskPlan(taskMdPath);
          if (!audit.passed) {
            logActivity(this.taiyiRoot, {
              event: "plan-audit:blocked",
              slug,
              findings: audit.findings.filter(f => !f.passed).map(f => f.message),
            });
            return {
              ok: false,
              error: `TASK.md 质量审查未通过。请完善后重试。\n${formatPlanAudit(audit)}`,
            };
          }
        }
        this._auditedPhases.add(cacheKey);
      }
    }

    if (phaseId === "dev" && !options?.skipArtifactValidation) {
      const archTemplate = resolveArchTemplateForChange(workingState.profile, workspaceDir);
      const archResult = evaluateArchitecture(workspaceDir, archTemplate);
      if (!archResult.passed) {
        const failedLabels = archResult.findings
          .filter((f) => !f.passed)
          .map((f) => `${f.label}: ${f.detail ?? "未通过"}`)
          .join("; ");
        this.log.warn(`[dev] 架构检查未通过: ${failedLabels}`);
        logActivity(this.taiyiRoot, {
          event: "dev:arch-failed",
          slug,
          details: failedLabels,
        });
        return {
          ok: false,
          error: `架构检查未通过，请确保代码与架构约定一致:\n${failedLabels}`,
        };
      }
    }

    if (phaseId === "integration" && process.env.TAIYI_SKIP_INTEGRATION_AUDIT !== "1") {
      const audit = auditChange(workspaceDir, this.workspaceRoot, slug, {
        pretendIntegrationComplete: true,
      });
      if (audit) {
        const blocked = audit.findings
          .filter((f) => f.severity === "high" || f.severity === "medium")
          .map((f) => `${f.code} [${f.severity}]: ${f.message}`);
        if (blocked.length > 0) {
          logActivity(this.taiyiRoot, { event: "audit:blocked", slug, findings: blocked.length });
          return {
            ok: false,
            error: `Integration audit failed:\n${blocked.join("\n")}`,
          };
        }
      }

      // 跨变更兼容性检查：是否有其他 active 变更尚未集成？
      const crossFindings = crossChangeFindings(this.workspaceRoot, slug);
      for (const f of crossFindings) {
        this.log.warn(`[integration] ${f.code}: ${f.message}`);
        logActivity(this.taiyiRoot, {
          event: "integration:cross-change-warning",
          slug,
          code: f.code,
          message: f.message,
        });
      }

      // 架构检查：根据 profile 检测项目代码结构质量
      const archTemplate = resolveArchTemplateForChange(workingState.profile, workspaceDir);
      const archResult = evaluateArchitecture(workspaceDir, archTemplate);
      const strictIntegration = process.env.TAIYI_STRICT_INTEGRATION === "1"
        || process.env.TAIYI_STRICT_INTEGRATION === "true";
      if (!archResult.passed) {
        const failedLabels = archResult.findings
          .filter((f) => !f.passed)
          .map((f) => `${f.label}: ${f.detail ?? "未通过"}`)
          .join("; ");
        this.log.warn(`[integration] 架构检查未通过: ${failedLabels}`);
        logActivity(this.taiyiRoot, {
          event: "integration:arch-warning",
          slug,
          details: failedLabels,
        });
        if (strictIntegration) {
          return { ok: false, error: `架构检查未通过（TAIYI_STRICT_INTEGRATION）:\n${failedLabels}` };
        }
      }

      // 投产就绪检查：health endpoint / package.json scripts / CORS
      const readinessResult = evaluateProductionReadiness(workspaceDir, archTemplate);
      if (!readinessResult.passed) {
        const warnings = readinessResult.warnings.join("; ");
        this.log.warn(`[integration] 投产就绪检查警告: ${warnings}`);
        logActivity(this.taiyiRoot, {
          event: "integration:readiness-warning",
          slug,
          warnings: readinessResult.warnings,
        });
        if (strictIntegration) {
          return { ok: false, error: `投产就绪检查未通过（TAIYI_STRICT_INTEGRATION）:\n${warnings}` };
        }
      }
    }

    // 交付门禁（双重检查）：
    // 1. auditChange 已在 line 529 检查 deliveryFindings（含 audit 块内）
    // 2. 此处为独立兜底 — 当 TAIYI_SKIP_INTEGRATION_AUDIT=1 跳过 audit 块时仍生效
    if (phaseId === "integration" && deliveryGateEnabled(workspaceDir)) {
      const delivery = evaluateDeliveryGate(workspaceDir, { slug, phase: "integration" });
      if (!delivery.passed) {
        const hintText = delivery.hints?.length ? ` — ${delivery.hints.join("; ")}` : "";
        logActivity(this.taiyiRoot, { event: "gate:failed", slug, phase: phaseId, reason: delivery.reason });
        return {
          ok: false,
          error: `Delivery gate failed: ${delivery.reason}${hintText}`,
        };
      }
    }

    const autoCheck = enforceAutoHarnessBeforeComplete(
      workspaceDir,
      this.workspaceRoot,
      workingState,
    );
    if (!autoCheck.ok) {
      return { ok: false, error: autoCheck.error };
    }

    const tokenCheck = enforceTokenBudgetBeforeComplete(changeDir, slug, phaseId);
    if (!tokenCheck.ok) {
      return { ok: false, error: tokenCheck.error };
    }

    const qualityResult = this.evaluatePhaseQuality(slug, phaseId, changeDir, gates.quality, state, workingState, options);
    if (!qualityResult.ok) return qualityResult;

    const needsHuman = requiresHumanGate(phaseId) || options?.forceHuman;
    if (needsHuman) {
      const autoReject = rejectAutomatedHumanApproval(
        phaseId,
        gates.human,
        options?.allowAutoHuman,
      );
      if (!autoReject.ok) {
        logActivity(this.taiyiRoot, { event: "phase:blocked", slug, phase: phaseId, reason: autoReject.error });
        return { ok: false, error: autoReject.error };
      }
      const human = evaluateHumanGate(gates.human);
      if (!human.passed) {
        logActivity(this.taiyiRoot, { event: "phase:blocked", slug, phase: phaseId, reason: human.reason ?? "Human gate failed" });
        return { ok: false, error: human.reason ?? "Human gate failed" };
      }
    }

    const completed = [...workingState.completedPhases, phaseId];

    const dynamicSkipped = [...workingState.skippedPhases];
    const projectCfg = loadProjectConfig(workspaceDir);
    if (phaseId === "change" && !dynamicSkipped.includes("ui-design") && !changeHasUiSignals(changeDir) && projectCfg.autoSkipUiDesign) {
      dynamicSkipped.push("ui-design");
      this.log.info("Auto-skipping ui-design (no UI signals in CHANGE.md)", { slug });
    }
    const next = getNextPhase(phaseId, dynamicSkipped);

    const draft: ChangeState = {
      ...workingState,
      completedPhases: completed,
      skippedPhases: dynamicSkipped,
      currentPhase: next ?? phaseId,
      complexity:
        workingState.completedPhases.includes("change") && workingState.complexity
          ? workingState.complexity
          : assessComplexity(inferComplexitySignals(changeDir)),
      updatedAt: new Date().toISOString(),
    };
    const allDone =
      !next &&
      completed.length >= expectedPhaseCount(draft) &&
      completed.includes("integration");
    const updated: ChangeState = {
      ...draft,
      workflowStatus: allDone ? "completed" : "active",
    };
    this.writeState(updated);

    const templatesDir = this.templatesDir;
    if (next && templatesDir && !isPhaseSkipped(next, dynamicSkipped)) {
      let title: string | undefined;
      try {
        const changeMd = fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8");
        // Robust: handles Chinese colon, bold markup (**CHANGE**), H2, all phase prefixes
        const m = changeMd.match(/^#{1,2}\s*(?:\*{0,2}(?:CHANGE|DESIGN|REQUIREMENT|UI-DESIGN|TASK|TEST|REVIEW|INTEGRATION)\*{0,2})\s*[:：]\s*(.+)$/m)
          ?? changeMd.match(/^#{1,2}\s*(.+)$/m);
        title = m?.[1]?.trim();
      } catch {
        title = undefined;
      }
      seedPhaseTemplate(changeDir, templatesDir, next, { slug, title });
    }

    if (next && !isPhaseSkipped(next, dynamicSkipped)) {
      try {
        // Phase B: graph-native context generation (supersedes appendPhaseToContext)
        generateGraphPhaseContext(changeDir, slug);
        // Legacy fallback for phases without JSON files (e.g. dev)
        appendPhaseToContext(changeDir, slug, phaseId, next, updated);
      } catch { /* best-effort */ }
    }

    if (phaseId === "integration" && process.env.TAIYI_SKIP_ROOT_CHANGELOG !== "1") {
      syncRootChangelog(workspaceDir, slug);
    }

    if (workingState.autoHarness) {
      runPostCompleteShellHooks(workspaceDir, this.workspaceRoot, slug, phaseId);
    }
    this.log.info("Completed phase", { slug, phaseId });
    logActivity(this.taiyiRoot, { event: "phase:complete", slug, phase: phaseId });
    return { ok: true };
  }

  assessComplexity(slug: string, signals?: ComplexitySignals) {
    return this.refreshComplexity(slug, signals);
  }

  /** 标记变更为 aborted（不删目录，不再计入 active slug） */
  abortChange(slug: string): { ok: boolean; error?: string } {
    const slugCheck = validateSlug(slug);
    if (!slugCheck.ok) return { ok: false, error: slugCheck.error };
    const state = this.getState(slug);
    if (!state) return { ok: false, error: formatChangeNotFound(slug) };
    if (isWorkflowCompleted(state)) {
      return { ok: false, error: "已完成变更不可 cancel，请 /taiyi:archive" };
    }
    if (isChangeAborted(state)) return { ok: true };
    this.writeState({
      ...state,
      workflowStatus: "aborted",
      updatedAt: new Date().toISOString(),
    });
    this.log.info("Aborted change", { slug });
    return { ok: true };
  }
}
