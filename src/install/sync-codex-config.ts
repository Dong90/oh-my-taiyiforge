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

const LEGACY_DEVELOPER_INSTRUCTIONS_RE =
  /^developer_instructions\s*=\s*(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"[\s\S]*?"|'[\s\S]*?')\s*\n?/m;

/** First `[section]` header — developer_instructions must stay above this (top-level TOML). */
const FIRST_SECTION_RE = /^\[[^\]]+\]/m;

function stripDeveloperInstructions(raw: string): string {
  return raw.replace(MARKER_BLOCK_RE, "").replace(LEGACY_DEVELOPER_INSTRUCTIONS_RE, "").trimEnd();
}

/** Insert block before the first TOML table header so it is not parsed under `[features]` etc. */
function insertDeveloperInstructionsBlock(raw: string, block: string): string {
  const stripped = stripDeveloperInstructions(raw);
  const sectionMatch = FIRST_SECTION_RE.exec(stripped);
  if (!sectionMatch || sectionMatch.index === undefined) {
    return stripped.length > 0 ? `${stripped}\n\n${block}\n` : `${block}\n`;
  }
  const head = stripped.slice(0, sectionMatch.index).trimEnd();
  const tail = stripped.slice(sectionMatch.index).trimStart();
  if (head.length === 0) {
    return `${block}\n\n${tail}\n`;
  }
  return `${head}\n\n${block}\n\n${tail}\n`;
}

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
  let detail = "developer_instructions → $taiyi-preflight";

  const hadMarker = raw.includes(MARKER_START) && raw.includes(MARKER_END);
  const hadLegacy = LEGACY_DEVELOPER_INSTRUCTIONS_RE.test(raw);
  if (hadLegacy && !hadMarker) {
    detail = "replaced legacy developer_instructions with marked TaiyiForge block";
  } else if (hadMarker && /^\[[^\]]+\][\s\S]*developer_instructions/m.test(raw)) {
    detail = "moved developer_instructions out of nested TOML section";
  }

  const next = insertDeveloperInstructionsBlock(raw, block);

  fs.writeFileSync(configPath, next, "utf8");
  return {
    target: "codex-config",
    path: configPath,
    action: "updated",
    detail,
  };
}
