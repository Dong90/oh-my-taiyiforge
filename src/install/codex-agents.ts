import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

const MARKER_START = "<!-- TAIYI-FORGE:AGENTS:START -->";
const MARKER_END = "<!-- TAIYI-FORGE:AGENTS:END -->";

export function mergeCodexAgentsBlock(agentsMdPath: string, block: string): InstallResult {
  const wrapped = `${MARKER_START}\n${block.trim()}\n${MARKER_END}\n`;

  if (!fs.existsSync(agentsMdPath)) {
    fs.mkdirSync(path.dirname(agentsMdPath), { recursive: true });
    fs.writeFileSync(agentsMdPath, `# TaiyiForge\n\n${wrapped}`, "utf8");
    return { target: "codex-agents", path: agentsMdPath, action: "created" };
  }

  const raw = fs.readFileSync(agentsMdPath, "utf8");
  if (raw.includes(MARKER_START) && raw.includes(MARKER_END)) {
    const next = raw.replace(
      new RegExp(`${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}\\n?`),
      wrapped
    );
    fs.writeFileSync(agentsMdPath, next, "utf8");
    return { target: "codex-agents", path: agentsMdPath, action: "updated" };
  }

  fs.writeFileSync(agentsMdPath, `${raw.trimEnd()}\n\n${wrapped}`, "utf8");
  return { target: "codex-agents", path: agentsMdPath, action: "updated" };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function installCodexAgents(pkgRoot: string, codexDir: string): InstallResult {
  const source = path.join(pkgRoot, "AGENTS.md");
  const block = fs.existsSync(source)
    ? fs.readFileSync(source, "utf8")
    : "Load taiyi-* skills from ~/.codex/skills for the nine-phase TaiyiForge workflow.";
  const dest = path.join(codexDir, "AGENTS.md");
  return mergeCodexAgentsBlock(dest, block);
}
