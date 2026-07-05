import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import { ZOD_PHASES } from "./artifact-validator.js";
import { getTemplateEngine, type SeedVars } from "./template-engine.js";
import { isSeedTemplate, wrapSeedTemplate } from "./seed-marker.js";
import { getHash } from "./state-manager.js";
import { getPhase } from "./phase-registry.js";
import {
  COMPLEXITY_MEDIUM_THRESHOLD,
  COMPLEXITY_HIGH_THRESHOLD,
} from "./routing/complexity.js";

function resolveTitle(vars: SeedVars): string {
  return vars.title ?? vars.slug.replace(/-/g, " ");
}

/** Zod-valid minimal seed JSON per phase (semantic source of truth). */
export function buildSeedJson(
  phaseId: PhaseId,
  vars: SeedVars,
): Record<string, unknown> {
  const title = resolveTitle(vars);
  const cScore = vars.complexity?.score ?? 0;
  const isMediumPlus = cScore >= COMPLEXITY_MEDIUM_THRESHOLD;
  const isHigh = cScore >= COMPLEXITY_HIGH_THRESHOLD;

  switch (phaseId) {
    case "change":
      return {
        title,
        motivation: vars.motivation ?? "",
        scope: { includes: [], excludes: [] },
        success_criteria: [
          { id: "SC-01", description: "", is_checked: false },
        ],
        ...(isMediumPlus ? {
          do_nothing_cost: "",
          impact_map: [{ area: "", impact: "" }],
          dream_state: { current: "", this_change: "", ideal: "" },
          innovation_tokens: [],
          premise_redefine: "",
          premise_cost: "",
          premise_existing: "",
          premise_scrap: "",
        } : {}),
        ...(isHigh ? {
          target_state: "",
        } : {}),
      };
    case "requirement":
      return {
        title,
        one_liner: "",
        user_stories: [
          { as_a: "", i_want: "", so_that: "", priority: "P0" },
        ],
        scope_v1: [""],
        scope_v2: [""],
        scope_out: [""],
        functional_requirements: [
          { module: "", items: [{ id: "FR-01", description: "" }] },
        ],
        non_functional: {
          performance: [{ id: "NFR-P01", description: "" }],
          security: [{ id: "NFR-S01", description: "" }],
          ...(isMediumPlus ? { availability: [{ id: "NFR-A01", description: "" }] } : {}),
        },
        acceptance_criteria: [
          { id: "AC-01", description: "", is_checked: false },
        ],
        ...(isMediumPlus ? {
          error_rescue_map: [
            { error: "", trigger: "", catch: "", user_sees: "", recovery: "" },
          ],
          shadow_paths: [
            { flow: "", happy_input: "", happy_expected: "", nil_input: "", nil_expected: "", empty_input: "", empty_expected: "", upstream_input: "", upstream_expected: "" },
          ],
          non_happy_path_cases: [
            { scenario: "", behavior: "" },
          ],
          dependencies: [
            { dependency: "", type: "", status: "", risk: "" },
          ],
        } : {}),
      };
    case "design":
      return {
        title,
        techStack: { selected: "", reason: "" },
        existingArchitecture: { touchedModules: [], newModules: [] },
        modules: [],
        options: [
          { id: "A", name: "Option A", pros: [], cons: [] },
          { id: "B", name: "Option B", pros: [], cons: [] },
        ],
        decision: { chosen: "A", reason: "" },
        current_state: "",
        data_model: "",
        api_changes: "",
        key_flow: "",
        security_threats: [],
        blast_radius: [],
        tradeoffs: [],
        dependency_sandbox: [],
        rollout_steps: [],
        evolutionSuggestions: [],
      };
    case "ui-design":
      return {
        title,
        scope: "",
        styling_contract: {
          scheme: "",
          no_inline_styles: true,
          theme_var_only: true,
        },
        is_cli_only: false,
        component_name: "",
        states: [],
        accessibility: [],
        links: [],
      };
    case "task":
      return {
        title,
        slices: [
          { id: "S1", label: "", description: "", time_estimate: "", read_files: [], write_files: [], dependencies: "", parallelizable: false },
        ],
        waves: [],
        slice_risks: [],
        slice_rollbacks: [],
      };
    case "test":
      return {
        title,
        test_plan: [{ id: "T-01", description: "", status: "pending" }],
        test_rounds: [
          { round: "Round 1 · 功能", scope: "全部 AC", status: "✅", skip_reason: "—" },
          { round: "Round 2 · 性能", scope: "Lighthouse / k6 / bundle", status: "⚠️", skip_reason: "性能无退化风险可跳过" },
          { round: "Round 3 · 安全", scope: "依赖审计 / SAST / OWASP", status: "⚠️", skip_reason: "无新增攻击面可跳过" },
          { round: "Round 4 · 兼容", scope: "浏览器 / 视口 / 数据迁移", status: "⚠️", skip_reason: "纯逻辑变更可跳过" },
          { round: "Round 5 · 可观测", scope: "日志 / 指标 / 告警", status: "⚠️", skip_reason: "无新运维面可跳过" },
        ],
        edge_cases: [],
        performance_tests: [],
        security_checks: [],
        regression_items: [],
        mocking_boundaries: [],
      };
    case "review":
      return {
        title,
        verdict: "unreviewable",
        overall_score: "",
        findings_acknowledged: true,
        code_quality: [
          { dimension: "功能正确性", score: "N/A", note: "" },
          { dimension: "架构一致性", score: "N/A", note: "" },
          { dimension: "测试覆盖", score: "N/A", note: "" },
          { dimension: "文档完整性", score: "N/A", note: "" },
          { dimension: "可维护性", score: "N/A", note: "" },
        ],
        test_coverage: [],
        findings: [
          { severity: "Low", description: "" },
        ],
        blocking_items: [],
        suggestion_items: [],
        security_audit: [],
        performance_audit: [],
        summary: "",
      };
    case "integration":
      return {
        title,
        changelog_entries: [{ type: "chore", description: "" }],
        breaking_changes: [],
        alerts: [],
        monitoring: [],
      };
    default:
      return { title };
  }
}

export function renderPhaseMarkdown(
  phaseId: PhaseId,
  data: Record<string, unknown>,
  hbsTemplatesDir: string,
  vars: SeedVars,
  options?: { wrapSeed?: boolean },
): string {
  const tplPath = path.join(hbsTemplatesDir, `${phaseId}.hbs`);
  if (!fs.existsSync(tplPath)) {
    throw new Error(`Handlebars template not found for phase "${phaseId}": ${tplPath}`);
  }
  const raw = fs.readFileSync(tplPath, "utf8");
  const rendered = getTemplateEngine().render(raw, {
    ...vars,
    ...data,
    slug: vars.slug,
    title: (data.title as string | undefined) ?? resolveTitle(vars),
  });
  return options?.wrapSeed === false ? rendered : wrapSeedTemplate(rendered);
}

export function writeRenderSnapshot(
  changeDir: string,
  phaseId: PhaseId,
  markdown: string,
): void {
  const snapshotDir = path.join(changeDir, ".taiyi", "snapshots");
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.writeFileSync(path.join(snapshotDir, `${phaseId}.hash`), getHash(markdown));
}

export type SeedPhaseArtifactsResult = {
  json: string;
  markdown: string;
};

/**
 * Seed Zod JSON + render Markdown view from hbs (canonical path).
 * Returns null if artifact already exists and is not a seed template.
 */
export function seedPhaseArtifacts(
  changeDir: string,
  hbsTemplatesDir: string,
  phaseId: PhaseId,
  vars: SeedVars,
): SeedPhaseArtifactsResult | null {
  if (!ZOD_PHASES.includes(phaseId)) return null;

  const phase = getPhase(phaseId);
  const mdPath = path.join(changeDir, phase.artifact);
  const jsonFile = `${phaseId}.json`;
  const jsonPath = path.join(changeDir, jsonFile);

  if (fs.existsSync(mdPath) && fs.statSync(mdPath).size > 0) {
    const existing = fs.readFileSync(mdPath, "utf8");
    if (!isSeedTemplate(existing)) return null;
    if (!(vars as SeedVars & { __forceOverwrite?: boolean }).__forceOverwrite) {
      return null;
    }
  }

  const seedJson = buildSeedJson(phaseId, vars);
  fs.writeFileSync(jsonPath, JSON.stringify(seedJson, null, 2), "utf8");

  const markdown = renderPhaseMarkdown(phaseId, seedJson, hbsTemplatesDir, vars);
  fs.writeFileSync(mdPath, markdown, "utf8");
  writeRenderSnapshot(changeDir, phaseId, markdown);

  return { json: jsonFile, markdown: phase.artifact };
}
