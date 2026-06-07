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
} from "./state-tools.js";

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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as {
    slug?: string;
    note?: string;
    workspace?: string;
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
  process.exit(1);
});
