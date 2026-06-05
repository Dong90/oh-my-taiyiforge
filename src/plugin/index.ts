import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import {
  taiyiArchive,
  taiyiSyncOpenspec,
  taiyiAssess,
  taiyiComplete,
  taiyiDoctor,
  taiyiGuide,
  taiyiInit,
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
          return JSON.stringify(r, null, 2);
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
          return JSON.stringify(r, null, 2);
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
        description: "Check TaiyiForge install: skills on 4 platforms, OpenCode plugin, templates.",
        args: {},
        async execute(_args, ctx) {
          void ctx;
          const r = taiyiDoctor();
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
      taiyi_walkthrough: tool({
        description:
          "First-run walkthrough in the current workspace: doctor, init demo change, show next step.",
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
    },
  };
};

export { TaiyiForgePlugin };
export default TaiyiForgePlugin;
