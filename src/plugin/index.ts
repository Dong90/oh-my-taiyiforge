import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin/tool";
import {
  taiyiAssess,
  taiyiComplete,
  taiyiInit,
  taiyiPhases,
  taiyiStatus,
} from "./handlers.js";

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
        },
        async execute(args, ctx) {
          const r = taiyiInit(ctx.directory, args.slug, args.title);
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
            .describe("Human gate approver id (OMO)"),
        },
        async execute(args, ctx) {
          const r = taiyiComplete(ctx.directory, args.slug, args.phase, {
            human: {
              approved: true,
              approver: args.approver ?? "opencode-user",
            },
          });
          return JSON.stringify(r, null, 2);
        },
      }),
      taiyi_assess: tool({
        description:
          "Assess change complexity and recommend auxiliary taiyi-* skills (architect, health, ...).",
        args: {
          slug: tool.schema.string(),
          touchedModules: tool.schema.number().optional(),
          hasUi: tool.schema.boolean().optional(),
          testLevels: tool.schema.number().optional(),
        },
        async execute(args, ctx) {
          const r = taiyiAssess(ctx.directory, args.slug, {
            touchedModules: args.touchedModules ?? 0,
            hasUi: args.hasUi ?? false,
            testLevels: args.testLevels ?? 1,
          });
          return JSON.stringify(r, null, 2);
        },
      }),
    },
  };
};

export { TaiyiForgePlugin };
export default TaiyiForgePlugin;
