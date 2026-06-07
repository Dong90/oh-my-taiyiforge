import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

export const TAIYI_MCP_SERVER_KEY = "taiyi-forge";

export type McpConfigFile = {
  mcpServers?: Record<
    string,
    { command?: string; args?: string[]; env?: Record<string, string> }
  >;
};

export function buildProjectMcpServerEntry(cwd: string): { command: string; args: string[] } {
  const nm = path.join(cwd, "node_modules", "oh-my-taiyiforge", "dist", "mcp", "server.js");
  if (fs.existsSync(nm)) {
    return {
      command: "node",
      args: ["node_modules/oh-my-taiyiforge/dist/mcp/server.js"],
    };
  }
  return { command: "npx", args: ["-y", "oh-my-taiyiforge", "taiyi-mcp"] };
}

export function buildGlobalMcpServerEntry(): { command: string; args: string[] } {
  return { command: "npx", args: ["-y", "oh-my-taiyiforge", "taiyi-mcp"] };
}

export function mergeTaiyiMcpServer(
  configPath: string,
  entry: { command: string; args: string[]; env?: Record<string, string> },
): InstallResult {
  let cfg: McpConfigFile = { mcpServers: {} };
  let action: InstallResult["action"] = "created";

  if (fs.existsSync(configPath)) {
    try {
      cfg = JSON.parse(fs.readFileSync(configPath, "utf8")) as McpConfigFile;
      cfg.mcpServers ??= {};
    } catch {
      return {
        target: "cursor-mcp",
        path: configPath,
        action: "failed",
        detail: "invalid JSON in existing mcp config",
      };
    }
    if (cfg.mcpServers[TAIYI_MCP_SERVER_KEY]) {
      return {
        target: "cursor-mcp",
        path: configPath,
        action: "skipped",
        detail: `${TAIYI_MCP_SERVER_KEY} already configured`,
      };
    }
    action = "updated";
  }

  cfg.mcpServers![TAIYI_MCP_SERVER_KEY] = entry;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");

  return {
    target: "cursor-mcp",
    path: configPath,
    action,
    detail: "taiyi-forge MCP template",
  };
}
