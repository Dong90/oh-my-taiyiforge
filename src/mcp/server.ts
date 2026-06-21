#!/usr/bin/env node
/**
 * TaiyiForge MCP server — state_get_status 风格控制面（设计参考 OMC，非集成）。
 * Cursor: docs/taiyi/mcp-setup.md
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  resolveWorkspaceDir,
  taiyiStateGetStatus,
  taiyiStateHandoff,
  taiyiStateCancel,
  taiyiStateListActive,
  taiyiStateRead,
  taiyiModeStep,
  taiyiModeStop,
  taiyiModeList,
  taiyiProjectRemember,
  taiyiDetectKeyword,
  taiyiRunWorkflow,
  taiyiDoctorCompact,
  taiyiAuditCompact,
} from "./state-tools.js";
import {
  taiyiLspDiagnostics,
  taiyiLspFindReferences,
  taiyiLspGotoDefinition,
} from "./lsp-tools.js";

const server = new Server(
  { name: "taiyi-forge", version: "0.22.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "taiyi_state_get_status",
      description:
        "Read TaiyiForge engine truth for a change (current phase, blockers, next action). Omit slug when only one active change. Prefer this over guessing from chat memory.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Change slug under .taiyi/changes/" },
          workspace: {
            type: "string",
            description: "Project root (default: TAIYI_WORKSPACE or cwd)",
          },
        },
      },
    },
    {
      name: "taiyi_state_list_active",
      description:
        "List all changes and which are active (not completed/aborted). Use before continue/status when slug is unknown.",
      inputSchema: {
        type: "object",
        properties: {
          workspace: { type: "string", description: "Project root" },
        },
      },
    },
    {
      name: "taiyi_state_read",
      description:
        "Read raw .taiyi/changes/<slug>/state.json (engine file). Read-only; use taiyi_state_get_status for interpreted engineTruth.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Change slug under .taiyi/changes/" },
          workspace: { type: "string", description: "Project root" },
        },
      },
    },
    {
      name: "taiyi_state_handoff",
      description:
        "Write HANDOFF.md for cross-session resume (does not complete any phase). Optional note for next agent.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          note: { type: "string", description: "Session context for next agent" },
          workspace: { type: "string" },
        },
      },
    },
    {
      name: "taiyi_state_cancel",
      description:
        "Abort active change (workflowStatus=aborted). Keeps .taiyi/changes/<slug>/ on disk. Aligns with /taiyi:cancel.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Change slug; omit when only one active change" },
          workspace: { type: "string" },
        },
      },
    },
    {
      name: "taiyi_mode_step",
      description:
        "OMC-style single runtime step (ralph verify, autopilot continue, harness). Prefer over chat memory when modes are active.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          mode: {
            type: "string",
            description: "ralph | autopilot | ultraqa | ultrawork | team | ralplan | plan",
          },
          workspace: { type: "string" },
        },
      },
    },
    {
      name: "taiyi_mode_stop",
      description: "Cancel active runtime modes. Aligns with /taiyi:stop-mode and stopomc keyword.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          force: { type: "boolean" },
          workspace: { type: "string" },
        },
      },
    },
    {
      name: "taiyi_mode_list",
      description: "List active .taiyi/runtime modes. Aligns with /taiyi:modes.",
      inputSchema: {
        type: "object",
        properties: {
          workspace: { type: "string" },
        },
      },
    },
    {
      name: "taiyi_remember",
      description: "Read/write .taiyi/project-memory.json. Optional note appends a fact. Aligns with /taiyi:remember and OpenCode taiyi_remember.",
      inputSchema: {
        type: "object",
        properties: {
          note: { type: "string" },
          workspace: { type: "string" },
        },
      },
    },
    {
      name: "taiyi_keyword",
      description: "Detect OMC-compatible keywords (ralph, autopilot, team, ccg, deslop, ultrathink, deepsearch). Aligns with OpenCode taiyi_keyword.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "User message to scan" },
          workspace: { type: "string" },
        },
        required: ["prompt"],
      },
    },
    {
      name: "taiyi_workflow",
      description:
        "Run workflow skill guide: plan, ralplan, ultraqa, ccg, sciomc, deepinit, external-context, ai-slop-cleaner, ecomode.",
      inputSchema: {
        type: "object",
        properties: {
          skill: { type: "string" },
          slug: { type: "string" },
          workspace: { type: "string" },
        },
        required: ["skill"],
      },
    },
    {
      name: "taiyi_doctor",
      description:
        "Install + workspace workflow health (slim JSON). Aligns with doctor --json --compact. Prefer over full doctor dump.",
      inputSchema: {
        type: "object",
        properties: {
          strictWorkspace: {
            type: "boolean",
            description: "Treat workspace blockers as FAIL (CI gate)",
          },
          workspace: { type: "string", description: "Project root" },
        },
      },
    },
    {
      name: "taiyi_audit",
      description:
        "Workflow/delivery audit (slim JSON, high findings only). Aligns with audit --json --compact.",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Change slug; omit for all changes" },
          workspace: { type: "string", description: "Project root" },
        },
      },
    },
    {
      name: "taiyi_lsp_diagnostics",
      description: "Lightweight diagnostics via npm typecheck/lint/tsc (OMC lsp_diagnostics parity). Set TAIYI_LSP=off to skip.",
      inputSchema: {
        type: "object",
        properties: {
          workspace: { type: "string" },
        },
      },
    },
    {
      name: "taiyi_lsp_goto_definition",
      description: "Text search for symbol definition candidates (OMC lsp_goto_definition fallback).",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          file: { type: "string", description: "Optional path substring filter" },
          workspace: { type: "string" },
        },
        required: ["symbol"],
      },
    },
    {
      name: "taiyi_lsp_find_references",
      description: "Text search for symbol references (OMC lsp_find_references fallback).",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          workspace: { type: "string" },
        },
        required: ["symbol"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as {
    slug?: string;
    note?: string;
    workspace?: string;
    mode?: string;
    force?: boolean;
    strictWorkspace?: boolean;
    prompt?: string;
    skill?: string;
    symbol?: string;
    file?: string;
  };
  const workspace = resolveWorkspaceDir(args.workspace);

  try {
    if (req.params.name === "taiyi_state_list_active") {
      const r = taiyiStateListActive(workspace);
      return {
        content: [{ type: "text", text: JSON.stringify(r, null, 2) }],
      };
    }

    if (req.params.name === "taiyi_state_get_status") {
      const r = taiyiStateGetStatus(workspace, args.slug);
      if (!r.ok) {
        return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: r.error }) }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { ok: true, slug: r.slug, statusLine: r.statusLine, engineTruth: r.engineTruth },
              null,
              2,
            ),
          },
        ],
      };
    }

    if (req.params.name === "taiyi_state_read") {
      const r = taiyiStateRead(workspace, args.slug);
      if (!r.ok) {
        return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: r.error }) }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: true, slug: r.slug, path: r.path, state: r.state }, null, 2),
          },
        ],
      };
    }

    if (req.params.name === "taiyi_state_handoff") {
      const r = taiyiStateHandoff(workspace, args.slug, args.note);
      if (!r.ok) {
        return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: r.error }) }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { ok: true, slug: r.slug, path: r.path, engineTruth: r.engineTruth },
              null,
              2,
            ),
          },
        ],
      };
    }

    if (req.params.name === "taiyi_state_cancel") {
      const r = taiyiStateCancel(workspace, args.slug);
      if (!r.ok) {
        return { content: [{ type: "text", text: JSON.stringify({ ok: false, error: r.error }) }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { ok: true, slug: r.slug, workflowStatus: r.workflowStatus },
              null,
              2,
            ),
          },
        ],
      };
    }

    if (req.params.name === "taiyi_mode_step") {
      const r = taiyiModeStep(workspace, args.slug, args.mode);
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: r.ok, text: r.text, step: r.step }, null, 2) }],
        isError: !r.ok,
      };
    }

    if (req.params.name === "taiyi_mode_stop") {
      const r = taiyiModeStop(workspace, { slug: args.slug, force: args.force });
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: r.ok, text: r.text, result: r.result }, null, 2) }],
        isError: !r.ok,
      };
    }

    if (req.params.name === "taiyi_mode_list") {
      const r = taiyiModeList(workspace);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: r.ok, text: r.text, active: r.active }, null, 2),
          },
        ],
      };
    }

    if (req.params.name === "taiyi_remember") {
      const r = taiyiProjectRemember(workspace, args.note);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: r.ok, text: r.text, memory: r.memory }, null, 2),
          },
        ],
      };
    }

    if (req.params.name === "taiyi_keyword") {
      if (!args.prompt?.trim()) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: "prompt required" }) }],
          isError: true,
        };
      }
      const r = taiyiDetectKeyword(workspace, args.prompt);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: r.ok, text: r.text, detected: r.detected }, null, 2),
          },
        ],
        isError: !r.ok,
      };
    }

    if (req.params.name === "taiyi_workflow") {
      if (!args.skill?.trim()) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: "skill required" }) }],
          isError: true,
        };
      }
      const r = taiyiRunWorkflow(workspace, args.skill, args.slug);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: r.ok, text: r.text, result: r.result, step: r.step }, null, 2),
          },
        ],
        isError: !r.ok,
      };
    }

    if (req.params.name === "taiyi_doctor") {
      const strictWorkspace = args.strictWorkspace === true;
      const compact = taiyiDoctorCompact(workspace, { strictWorkspace });
      return {
        content: [{ type: "text", text: JSON.stringify(compact, null, 2) }],
        isError: !compact.ok,
      };
    }

    if (req.params.name === "taiyi_audit") {
      const compact = taiyiAuditCompact(workspace, args.slug);
      return {
        content: [{ type: "text", text: JSON.stringify(compact, null, 2) }],
        isError: !compact.ok,
      };
    }

    if (req.params.name === "taiyi_lsp_diagnostics") {
      const r = taiyiLspDiagnostics(workspace);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: r.ok, text: r.text, source: r.source }, null, 2),
          },
        ],
        isError: !r.ok,
      };
    }

    if (req.params.name === "taiyi_lsp_goto_definition") {
      if (!args.symbol?.trim()) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: "symbol required" }) }],
          isError: true,
        };
      }
      const r = taiyiLspGotoDefinition(workspace, args.symbol, args.file);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: r.ok, text: r.text, matches: r.matches }, null, 2),
          },
        ],
        isError: !r.ok,
      };
    }

    if (req.params.name === "taiyi_lsp_find_references") {
      if (!args.symbol?.trim()) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: "symbol required" }) }],
          isError: true,
        };
      }
      const r = taiyiLspFindReferences(workspace, args.symbol);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: r.ok, text: r.text, matches: r.matches }, null, 2),
          },
        ],
        isError: !r.ok,
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }],
      isError: true,
    };
  } catch (e) {
    return {
      content: [
        {
          type: "text",
          text: e instanceof Error ? e.message : String(e),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
