import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import { formatArchivePlain, formatSyncOpenspecPlain } from "../core/format-integration.js";
import {
  taiyiArchive,
  taiyiSyncOpenspec,
  taiyiAssess,
  taiyiComplete,
  taiyiDoctor,
  taiyiGuide,
  taiyiInit,
  taiyiNew,
  taiyiList,
  taiyiMarkAux,
  taiyiNext,
  taiyiPhases,
  taiyiStatus,
  taiyiWalkthrough,
  taiyiHarness,
  taiyiHarnessCheck,
  taiyiCiVerify,
  taiyiCiPlatform,
  taiyiContinue,
  taiyiLoop,
  taiyiApply,
  taiyiToken,
  taiyiReviewCheck,
  taiyiReviewLoop,
  taiyiRalph,
  taiyiAutopilot,
  taiyiTeam,
  taiyiUltrawork,
  taiyiAgent,
  taiyiAudit,
  taiyiHealth,
  taiyiHandoff,
  taiyiCancel,
  taiyiCommitTrailers,
  taiyiStep,
  taiyiStopMode,
  taiyiModes,
  taiyiKeyword,
  taiyiRemember,
  taiyiWorkflowSkill,
} from "./handlers.js";
import { resolvePackageRoot } from "../core/package-root.js";

/**
 * OpenCode 插件入口 — 在 opencode.json 的 plugin 数组中加入 "oh-my-taiyiforge" 即可加载。
 * 与 Claude / Codex 共用 skills/taiyi-*（postinstall 会同步到 OpenCode skills 目录）。
 */
const TaiyiForgePlugin: Plugin = async () => {
  return {
    tool: {
      taiyi_init: tool({
        description:
          "Initialize a TaiyiForge change workspace under .taiyi/changes/<slug>. Start the 9-phase document-driven workflow.",
        args: {
          slug: tool.schema.string().describe("Change identifier, e.g. auth-timeout"),
          title: tool.schema
            .string()
            .optional()
            .describe("Human-readable change title for templates"),
          profile: tool.schema
            .enum(["full", "api", "ui", "lite"])
            .optional()
            .describe("full=9 phases; api=skip ui-design; lite=5 phases"),
          strictDev: tool.schema
            .boolean()
            .optional()
            .describe("Require exitCode:0 evidence in .dev-complete"),
          autoHarness: tool.schema
            .boolean()
            .optional()
            .describe("Full auto orchestration: iron triangle + auxiliary required before complete"),
        },
        async execute(args, ctx) {
          const r = taiyiInit(ctx.directory, args.slug, {
            title: args.title,
            profile: args.profile,
            strictDev: args.strictDev,
            autoHarness: args.autoHarness,
          });
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_new: tool({
        description:
          "Create a change from a title (daily default — aligns with /taiyi:new). Auto-generates slug; use taiyi_init for fixed slug/CI.",
        args: {
          title: tool.schema.string().describe("Human-readable change title, e.g. User login"),
          profile: tool.schema
            .enum(["full", "api", "ui", "lite"])
            .optional()
            .describe("full=9 phases; api=skip ui-design; lite=5 phases"),
          strictDev: tool.schema
            .boolean()
            .optional()
            .describe("Require exitCode:0 evidence in .dev-complete"),
          auto: tool.schema
            .boolean()
            .optional()
            .describe("Enable full auto orchestration (iron triangle + auxiliary before complete)"),
          noAuto: tool.schema.boolean().optional().describe("Force manual mode even if TAIYI_AUTO_HARNESS=1"),
          force: tool.schema.boolean().optional().describe("Re-init if slug already exists"),
        },
        async execute(args, ctx) {
          const r = taiyiNew(ctx.directory, args.title, {
            profile: args.profile,
            strictDev: args.strictDev,
            auto: args.auto,
            noAuto: args.noAuto,
            force: args.force,
          });
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_status: tool({
        description: "Get TaiyiForge workflow state for a change slug.",
        args: {
          slug: tool.schema.string(),
        },
        async execute(args, ctx) {
          const r = taiyiStatus(ctx.directory, args.slug);
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_phases: tool({
        description:
          "List TaiyiForge nine phases with taiyi-* skill ids and required artifacts.",
        args: {},
        async execute(_args, ctx) {
          void ctx;
          return JSON.stringify({ phases: taiyiPhases() }, null, 2);
        },
      }),
      taiyi_complete: tool({
        description:
          "Complete a TaiyiForge phase after artifact exists and gates pass. Advances to next phase.",
        args: {
          slug: tool.schema.string(),
          phase: tool.schema.string().describe("Phase id: change, requirement, design, ..."),
          approver: tool.schema
            .string()
            .optional()
            .describe(
              "Human gate approver id (required for change/design/review phases; blocked if omitted)",
            ),
        },
        async execute(args, ctx) {
          const human =
            args.approver?.trim()
              ? { approved: true as const, approver: args.approver.trim() }
              : undefined;
          const r = taiyiComplete(ctx.directory, args.slug, args.phase, {
            human,
          });
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_guide: tool({
        description:
          "What to do now for a change: current skill, artifact path, quality preview, and next action.",
        args: {
          slug: tool.schema.string(),
        },
        async execute(args, ctx) {
          const r = taiyiGuide(ctx.directory, args.slug);
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_sync_openspec: tool({
        description:
          "Copy TaiyiForge artifacts from .taiyi/changes/<slug>/ into openspec/changes/<slug>/ (proposal, design, tasks, specs).",
        args: {
          slug: tool.schema.string(),
          force: tool.schema.boolean().optional().describe("Overwrite existing OpenSpec files"),
          createChangeDir: tool.schema
            .boolean()
            .optional()
            .describe("Create openspec/changes/<slug>/ if missing (default true)"),
        },
        async execute(args, ctx) {
          const r = taiyiSyncOpenspec(ctx.directory, args.slug, {
            force: args.force,
            createChangeDir: args.createChangeDir,
          });
          return formatSyncOpenspecPlain(args.slug, r);
        },
      }),
      taiyi_archive: tool({
        description:
          "Run OpenSpec archive for a change slug after TaiyiForge integration phase. Requires openspec/changes/<slug>/ in the project.",
        args: {
          slug: tool.schema.string(),
          skipSpecs: tool.schema
            .boolean()
            .optional()
            .describe("Pass --skip-specs to openspec archive (doc-only changes)"),
        },
        async execute(args, ctx) {
          const r = taiyiArchive(ctx.directory, args.slug, {
            skipSpecs: args.skipSpecs,
          });
          return formatArchivePlain(args.slug, r);
        },
      }),
      taiyi_assess: tool({
        description:
          "Assess change complexity and recommend auxiliary taiyi-* skills. Infers from CHANGE.md when signals omitted.",
        args: {
          slug: tool.schema.string(),
          touchedModules: tool.schema.number().optional(),
          hasUi: tool.schema.boolean().optional(),
          testLevels: tool.schema.number().optional(),
        },
        async execute(args, ctx) {
          const hasSignals =
            args.touchedModules != null || args.hasUi != null || args.testLevels != null;
          const r = taiyiAssess(
            ctx.directory,
            args.slug,
            hasSignals
              ? {
                  touchedModules: args.touchedModules ?? 0,
                  hasUi: args.hasUi ?? false,
                  testLevels: args.testLevels ?? 1,
                }
              : undefined,
          );
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_doctor: tool({
        description:
          "Check TaiyiForge install (skills, plugin, templates) and optional workspace flow blockers.",
        args: {
          strict: tool.schema
            .boolean()
            .optional()
            .describe("Strict workspace checks (multiple active changes, etc.) — aligns with doctor --strict-workspace"),
        },
        async execute(args, ctx) {
          const r = taiyiDoctor(undefined, ctx.directory, { strictWorkspace: args.strict });
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_list: tool({
        description: "List all changes under .taiyi/changes/ with phase progress.",
        args: {},
        async execute(_args, ctx) {
          const r = taiyiList(ctx.directory);
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_next: tool({
        description: "Human-readable next step for a change (plain text + guide fields).",
        args: {
          slug: tool.schema.string(),
        },
        async execute(args, ctx) {
          const r = taiyiNext(ctx.directory, args.slug, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_mark_aux: tool({
        description:
          "Record completion of an auxiliary taiyi-* skill (e.g. taiyi-health) on this change.",
        args: {
          slug: tool.schema.string(),
          skill: tool.schema.string().describe("Auxiliary skill id, e.g. taiyi-health"),
        },
        async execute(args, ctx) {
          const r = taiyiMarkAux(ctx.directory, args.slug, args.skill);
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_harness: tool({
        description:
          "Auto orchestration plan: iron triangle hooks, auxiliary skills, main phase (for --auto mode).",
        args: {
          slug: tool.schema.string(),
        },
        async execute(args, ctx) {
          const r = taiyiHarness(ctx.directory, args.slug, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_harness_check: tool({
        description: "Mark an iron-triangle hook as completed (checkpoint for auto mode).",
        args: {
          slug: tool.schema.string(),
          hookKey: tool.schema.string().describe("e.g. superpowers/brainstorming"),
        },
        async execute(args, ctx) {
          const r = taiyiHarnessCheck(ctx.directory, args.slug, args.hookKey);
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_ci_verify: tool({
        description: "CI: verify .taiyi/changes artifacts and auto-harness gates (no LLM).",
        args: {
          slug: tool.schema.string().optional(),
          requireComplete: tool.schema.boolean().optional(),
        },
        async execute(args, ctx) {
          const r = taiyiCiVerify(ctx.directory, {
            slug: args.slug,
            requireComplete: args.requireComplete,
          });
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_ci_platform: tool({
        description: "CI: smoke-test skill sync for one platform (opencode|claude|codex|cursor).",
        args: {
          platform: tool.schema.enum(["opencode", "claude", "codex", "cursor"]),
        },
        async execute(args, _ctx) {
          void _ctx;
          const pkgRoot = resolvePackageRoot(import.meta.url);
          const r = taiyiCiPlatform(pkgRoot, args.platform, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_continue: tool({
        description:
          "Advance one phase (or xN repeats): complete current phase when artifact and gates pass.",
        args: {
          slug: tool.schema.string(),
          approver: tool.schema
            .string()
            .optional()
            .describe("Human gate approver for change/design/review"),
          times: tool.schema.number().optional().describe("Repeat continue up to N times in one call"),
        },
        async execute(args, ctx) {
          const r = taiyiContinue(ctx.directory, args.slug, {
            approver: args.approver,
            times: args.times,
            plain: true,
          });
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_loop: tool({
        description:
          "Loop continue until workflow completes or blocks (human gate / quality). Omit times for default max per round (TAIYI_LOOP_MAX, usually 20); set times=1 for a single attempt.",
        args: {
          slug: tool.schema.string(),
          times: tool.schema
            .number()
            .optional()
            .describe("Max continue attempts this round; omit=default 20, 1=single try"),
        },
        async execute(args, ctx) {
          const r = taiyiLoop(ctx.directory, args.slug, { times: args.times, plain: true });
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_apply: tool({
        description: "Show harness plan for dev/test implementation phase (/taiyi:apply).",
        args: {
          slug: tool.schema.string(),
          times: tool.schema.number().optional().describe("Repeat harness display N times"),
        },
        async execute(args, ctx) {
          const r = taiyiApply(ctx.directory, args.slug, { times: args.times, plain: true });
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_token: tool({
        description: "Token budget: status, record, scan, or compress for a change.",
        args: {
          sub: tool.schema.enum(["status", "record", "scan", "compress"]),
          slug: tool.schema.string().optional(),
          tokens: tool.schema.number().optional().describe("For record subcommand"),
          phase: tool.schema.string().optional(),
        },
        async execute(args, ctx) {
          const r = taiyiToken(ctx.directory, args.sub, {
            slug: args.slug,
            tokens: args.tokens,
            phase: args.phase as import("../core/types.js").PhaseId | undefined,
          });
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_review_check: tool({
        description:
          "Review loop gate (not complete review): no open high findings and not Request changes; Approve checkbox not required. Use complete review for strict machine gate.",
        args: {
          slug: tool.schema.string(),
        },
        async execute(args, ctx) {
          const r = taiyiReviewCheck(ctx.directory, args.slug, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_review_loop: tool({
        description:
          "Machine review loop step: check REVIEW.md; on fail stay in review and bump round (.review-loop-state.json).",
        args: {
          slug: tool.schema.string(),
        },
        async execute(args, ctx) {
          const r = taiyiReviewLoop(ctx.directory, args.slug, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_ralph: tool({
        description:
          "Ralph verify loop: run delivery/test command; on fail bump .ralph-state.json and stay until green.",
        args: {
          slug: tool.schema.string(),
        },
        async execute(args, ctx) {
          const r = taiyiRalph(ctx.directory, args.slug, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_autopilot: tool({
        description: "Nine-phase autopilot guide (native; requires autoHarness).",
        args: { slug: tool.schema.string() },
        async execute(args, ctx) {
          const r = taiyiAutopilot(ctx.directory, args.slug, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_team: tool({
        description: "Native team pipeline: plan → exec → verify → fix lane for current phase.",
        args: { slug: tool.schema.string() },
        async execute(args, ctx) {
          const r = taiyiTeam(ctx.directory, args.slug, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_ultrawork: tool({
        description: "High-throughput parallel TASK.md slices (task/dev only).",
        args: { slug: tool.schema.string() },
        async execute(args, ctx) {
          const r = taiyiUltrawork(ctx.directory, args.slug, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_agent: tool({
        description: "Load native specialist agent role protocol (29 roles; agent list for catalog).",
        args: {
          role: tool.schema.string().describe("Role id or list"),
          slug: tool.schema.string().optional(),
        },
        async execute(args, ctx) {
          const r = taiyiAgent(ctx.directory, args.role, args.slug, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_audit: tool({
        description:
          "Workflow/delivery audit: legacy state, artifact drift, ahead-of-phase files, CHANGE↔CHANGELOG, git delivery gaps.",
        args: {
          slug: tool.schema.string().optional().describe("Change slug; omit to audit all changes"),
        },
        async execute(args, ctx) {
          const r = taiyiAudit(ctx.directory, { slug: args.slug, plain: true });
          return "text" in r && r.text ? r.text : JSON.stringify(r.report ?? r, null, 2);
        },
      }),
      taiyi_health: tool({
        description:
          "Print Agent protocol for taiyi-health before review. Does NOT run checks or write health-report.md — load taiyi-health Skill in chat, then mark-aux.",
        args: {
          slug: tool.schema.string().optional().describe("Change slug; inferred when only one active change"),
        },
        async execute(args, ctx) {
          const r = taiyiHealth(ctx.directory, args.slug);
          if (!r.ok) return JSON.stringify(r, null, 2);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_verify: tool({
        description:
          "CI/PR artifact gate: quality + harness blockers without LLM (alias of ci verify).",
        args: {
          slug: tool.schema.string().optional(),
          requireComplete: tool.schema.boolean().optional(),
        },
        async execute(args, ctx) {
          const r = taiyiCiVerify(ctx.directory, {
            slug: args.slug,
            requireComplete: args.requireComplete,
            plain: true,
          });
          return "text" in r && r.text ? r.text : JSON.stringify(r.report ?? r, null, 2);
        },
      }),
      taiyi_walkthrough: tool({
        description:
          "Onboarding demo only: doctor, init demo change, show next step. Not the nine-phase E2E (see examples/minimal-project walkthrough-e2e).",
        args: {
          slug: tool.schema
            .string()
            .optional()
            .describe("Demo slug, default walkthrough-demo"),
          profile: tool.schema
            .enum(["full", "api", "lite"])
            .optional()
            .describe("Init profile, default api"),
        },
        async execute(args, ctx) {
          const r = taiyiWalkthrough(ctx.directory, {
            slug: args.slug,
            profile: args.profile,
            plain: true,
          });
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_handoff: tool({
        description:
          "Write HANDOFF.md for cross-session resume (aligns with /taiyi:handoff and MCP taiyi_state_handoff).",
        args: {
          slug: tool.schema.string().optional().describe("Change slug; inferred when only one active"),
          note: tool.schema.string().optional().describe("Optional session note for HANDOFF.md"),
        },
        async execute(args, ctx) {
          const r = taiyiHandoff(ctx.directory, args.slug, args.note);
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_cancel: tool({
        description:
          "Abort active change without deleting .taiyi/changes/<slug>/ (aligns with /taiyi:cancel).",
        args: {
          slug: tool.schema.string().optional().describe("Change slug; inferred when only one active"),
        },
        async execute(args, ctx) {
          const r = taiyiCancel(ctx.directory, args.slug);
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_commit_trailers: tool({
        description:
          "Suggest git commit message with Taiyi-Change / Taiyi-Phase trailers before integration (aligns with taiyi commit-trailers).",
        args: {
          slug: tool.schema.string().optional().describe("Change slug; inferred when only one active"),
          subject: tool.schema.string().optional().describe("Commit subject line, default feat: deliver change slice"),
        },
        async execute(args, ctx) {
          const r = taiyiCommitTrailers(ctx.directory, args.slug, args.subject);
          if (!r.ok) return JSON.stringify(r, null, 2);
          const lines = [r.suggestion];
          if (!r.check.skipped && !r.check.passed && r.check.reason) {
            lines.push("", `⚠ ${r.check.reason}`);
          }
          return lines.join("\n");
        },
      }),
      taiyi_step: tool({
        description:
          "OMC-style single mode step: ralph verify, autopilot continue, harness blockers. Agent runs one iteration; Cursor stop hook may follow up.",
        args: {
          slug: tool.schema.string().optional().describe("Change slug; inferred when only one active"),
          mode: tool.schema
            .string()
            .optional()
            .describe("Force mode: ralph | autopilot | ultraqa | ultrawork | team | ralplan | plan"),
        },
        async execute(args, ctx) {
          const r = taiyiStep(ctx.directory, args.slug, { mode: args.mode }, true);
          if (!("text" in r) || !r.text) return JSON.stringify(r, null, 2);
          return r.text;
        },
      }),
      taiyi_stop_mode: tool({
        description:
          "Cancel active runtime modes (ralph/autopilot/ultrawork/team). Aligns with /taiyi:stop-mode and OMC stopomc.",
        args: {
          slug: tool.schema.string().optional().describe("Clear modes for this slug only"),
          force: tool.schema.boolean().optional().describe("Force clear even when verify still failing"),
        },
        async execute(args, ctx) {
          const r = taiyiStopMode(ctx.directory, { slug: args.slug, force: args.force }, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_modes: tool({
        description: "List active Taiyi runtime modes (.taiyi/runtime/*-mode.json). Aligns with /taiyi:modes.",
        args: {},
        async execute(_args, ctx) {
          const r = taiyiModes(ctx.directory, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_keyword: tool({
        description:
          "Detect OMC-compatible keywords in user text (ralph, autopilot, team, ccg, deslop, stopomc). Aligns with keyword hooks.",
        args: {
          prompt: tool.schema.string().describe("User message to scan for keywords"),
        },
        async execute(args, ctx) {
          const r = taiyiKeyword(ctx.directory, args.prompt, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_remember: tool({
        description:
          "Read/write .taiyi/project-memory.json (OMC project-memory parity). Optional note appends a fact.",
        args: {
          note: tool.schema.string().optional().describe("Optional note to remember"),
        },
        async execute(args, ctx) {
          const r = taiyiRemember(ctx.directory, args.note, true);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
      taiyi_workflow: tool({
        description:
          "Run a workflow skill guide: plan, ralplan, ultraqa, ccg, sciomc, deepinit, ai-slop-cleaner, ecomode, etc.",
        args: {
          skill: tool.schema.string().describe("Workflow skill id (plan, ralplan, ccg, sciomc, deepinit, …)"),
          slug: tool.schema.string().optional().describe("Change slug; inferred when only one active"),
        },
        async execute(args, ctx) {
          const r = taiyiWorkflowSkill(ctx.directory, args.skill, args.slug, true);
          if (!r.ok) return JSON.stringify(r, null, 2);
          return "text" in r && r.text ? r.text : JSON.stringify(r, null, 2);
        },
      }),
    },
  };
};

export { TaiyiForgePlugin };
export default TaiyiForgePlugin;
