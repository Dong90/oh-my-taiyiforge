import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";
import { buildProjectMcpServerEntry, mergeTaiyiMcpServer } from "./mcp-config.js";

/** 向消费方项目写入 `.cursor/mcp.json` 模板（不覆盖已有 taiyi-forge 条目） */
export function installCursorMcpConfig(cwd: string, _pkgRoot: string): InstallResult {
  const mcpJson = path.join(cwd, ".cursor", "mcp.json");

  if (process.env.TAIYI_FORGE_SKIP_MCP === "1") {
    return {
      target: "cursor-mcp",
      path: mcpJson,
      action: "skipped",
      detail: "TAIYI_FORGE_SKIP_MCP=1",
    };
  }

  const hasTaiyi = fs.existsSync(path.join(cwd, ".taiyi"));
  const hasPkg = fs.existsSync(path.join(cwd, "package.json"));
  if (!hasTaiyi && !hasPkg) {
    return {
      target: "cursor-mcp",
      path: mcpJson,
      action: "skipped",
      detail: "无 .taiyi/ 或 package.json",
    };
  }

  const { command, args } = buildProjectMcpServerEntry(cwd);
  const r = mergeTaiyiMcpServer(mcpJson, {
    command,
    args,
    env: { TAIYI_WORKSPACE: "${workspaceFolder}" },
  });
  return {
    ...r,
    target: "cursor-mcp",
    detail: "taiyi-forge MCP template（见 docs/taiyi/mcp-setup.md）",
  };
}
