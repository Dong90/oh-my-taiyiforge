import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { resolveTemplatesDir } from "../src/core/package-root.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MCP_SERVER = path.join(REPO, "dist/mcp/server.js");

function parseToolText(result: {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}): Record<string, unknown> {
  const block = result.content?.find((c) => c.type === "text");
  if (!block?.text) return {};
  try {
    return JSON.parse(block.text) as Record<string, unknown>;
  } catch {
    return { raw: block.text };
  }
}

describe("mcp server stdio smoke", () => {
  let workspace: string;
  let client: Client;
  let transport: StdioClientTransport;

  beforeEach(async () => {
    if (!fs.existsSync(MCP_SERVER)) {
      const { spawnSync } = await import("node:child_process");
      spawnSync("npm", ["run", "build"], { cwd: REPO, stdio: "pipe" });
    }

    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-mcp-stdio-"));
    const engine = new WorkflowEngine(
      path.join(workspace, ".taiyi"),
      resolveTemplatesDir(import.meta.url),
    );
    engine.initChange("mcp-demo", { title: "MCP smoke", profile: "lite" });

    transport = new StdioClientTransport({
      command: "node",
      args: [MCP_SERVER],
      env: {
        ...process.env,
        TAIYI_WORKSPACE: workspace,
      },
      stderr: "pipe",
    });
    client = new Client({ name: "taiyi-test", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
  }, 30_000);

  afterEach(async () => {
    await transport.close();
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("ListTools 包含 taiyi_state_* 与 taiyi_lsp_*", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("taiyi_state_get_status");
    expect(names).toContain("taiyi_state_list_active");
    expect(names).toContain("taiyi_state_handoff");
    expect(names).toContain("taiyi_mode_list");
    expect(names).toContain("taiyi_lsp_goto_definition");
    expect(names.length).toBeGreaterThanOrEqual(12);
  });

  it("CallTool taiyi_state_get_status 返回 engineTruth", async () => {
    const result = await client.callTool({
      name: "taiyi_state_get_status",
      arguments: { slug: "mcp-demo" },
    });
    expect(result.isError).toBeFalsy();
    const body = parseToolText(result);
    expect(body.ok).toBe(true);
    expect(body.slug).toBe("mcp-demo");
    expect(String(body.statusLine ?? "")).toMatch(/change|1\//i);
  });

  it("CallTool taiyi_state_handoff 写入 HANDOFF.md", async () => {
    const result = await client.callTool({
      name: "taiyi_state_handoff",
      arguments: { slug: "mcp-demo", note: "MCP stdio handoff" },
    });
    expect(result.isError).toBeFalsy();
    const body = parseToolText(result);
    expect(body.ok).toBe(true);
    const handoffPath = path.join(workspace, ".taiyi/changes/mcp-demo/HANDOFF.md");
    expect(fs.existsSync(handoffPath)).toBe(true);
    expect(fs.readFileSync(handoffPath, "utf8")).toContain("MCP stdio handoff");
  });

  it("CallTool taiyi_keyword 检测 ralph", async () => {
    const result = await client.callTool({
      name: "taiyi_keyword",
      arguments: { prompt: "ralph until tests pass" },
    });
    expect(result.isError).toBeFalsy();
    const body = parseToolText(result);
    expect(body.ok).toBe(true);
    expect(String(body.text ?? "")).toMatch(/ralph/i);
  });
});
