import path from "node:path";
import type { InstallResult } from "./types.js";
import { claudeConfigDir, codexPromptsDir } from "./paths.js";
import {
  buildGlobalMcpServerEntry,
  mergeTaiyiMcpServer,
} from "./mcp-config.js";

function installGlobalMcp(
  configPath: string,
  target: InstallResult["target"],
  detail: string,
): InstallResult {
  if (process.env.TAIYI_FORGE_SKIP_MCP === "1") {
    return { target, path: configPath, action: "skipped", detail: "TAIYI_FORGE_SKIP_MCP=1" };
  }
  const { command, args } = buildGlobalMcpServerEntry();
  const r = mergeTaiyiMcpServer(configPath, {
    command,
    args,
    env: { TAIYI_WORKSPACE: "" },
  });
  return { ...r, target, detail: `${detail} · ${r.detail ?? r.action}` };
}

/** ~/.codex/mcp.json — Codex Desktop 若支持 MCP，可直接读状态 */
export function installCodexMcpConfig(): InstallResult {
  const configPath = path.join(path.dirname(codexPromptsDir()), "mcp.json");
  return installGlobalMcp(configPath, "codex-mcp", "Codex MCP（须在项目根启动 Agent 或设 TAIYI_WORKSPACE）");
}

/** ~/.claude/mcp.json — Claude Code / Desktop MCP 模板 */
export function installClaudeMcpConfig(): InstallResult {
  const configPath = path.join(claudeConfigDir(), "mcp.json");
  return installGlobalMcp(configPath, "claude-mcp", "Claude MCP（须在项目根启动 Agent 或设 TAIYI_WORKSPACE）");
}
