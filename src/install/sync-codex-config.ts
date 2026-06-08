import fs from "node:fs";
import path from "node:path";
import { codexDeveloperInstructions } from "./control-plane-markdown.js";
import type { InstallResult } from "./types.js";

const MARKER_START = "# TAIYI-FORGE:DEVELOPER-INSTRUCTIONS:START";
const MARKER_END = "# TAIYI-FORGE:DEVELOPER-INSTRUCTIONS:END";

function escapeTomlTriple(text: string): string {
  return text.replace(/"""/g, '\\"""');
}

function buildDeveloperInstructionsBlock(instructions: string): string {
  const body = escapeTomlTriple(instructions.trim());
  return `${MARKER_START}
developer_instructions = """
${body}
"""
${MARKER_END}`;
}

const MARKER_BLOCK_RE = new RegExp(
  `${MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
);

/** Merge TaiyiForge developer_instructions into ~/.codex/config.toml */
export function installCodexDeveloperInstructions(configPath: string): InstallResult {
  const block = buildDeveloperInstructionsBlock(codexDeveloperInstructions());
  const dir = path.dirname(configPath);

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      configPath,
      `# TaiyiForge — Codex default session loop ($taiyi-preflight)\n\n${block}\n`,
      "utf8",
    );
    return {
      target: "codex-config",
      path: configPath,
      action: "created",
      detail: "developer_instructions → $taiyi-preflight",
    };
  }

  const raw = fs.readFileSync(configPath, "utf8");
  let next: string;
  let detail = "developer_instructions → $taiyi-preflight";

  if (raw.includes(MARKER_START) && raw.includes(MARKER_END)) {
    next = raw.replace(MARKER_BLOCK_RE, `${block}\n`);
  } else if (/^developer_instructions\s*=/m.test(raw)) {
    const stripped = raw
      .replace(/^developer_instructions\s*=\s*"""[\s\S]*?"""\s*\n?/m, "")
      .replace(/^developer_instructions\s*=\s*'''[\s\S]*?'''\s*\n?/m, "")
      .replace(/^developer_instructions\s*=\s*"[\s\S]*?"\s*\n?/m, "")
      .replace(/^developer_instructions\s*=\s*'[\s\S]*?'\s*\n?/m, "")
      .trimEnd();
    next = `${stripped}\n\n${block}\n`;
    detail = "replaced legacy developer_instructions with marked TaiyiForge block";
  } else {
    next = `${raw.trimEnd()}\n\n${block}\n`;
  }

  fs.writeFileSync(configPath, next, "utf8");
  return {
    target: "codex-config",
    path: configPath,
    action: "updated",
    detail,
  };
}
