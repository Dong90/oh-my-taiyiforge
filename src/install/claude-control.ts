import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

const MARKER_START = "<!-- TAIYI-FORGE:CLAUDE:START -->";
const MARKER_END = "<!-- TAIYI-FORGE:CLAUDE:END -->";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mergeClaudeControlBlock(claudeMdPath: string, block: string): InstallResult {
  const wrapped = `${MARKER_START}\n${block.trim()}\n${MARKER_END}\n`;

  if (!fs.existsSync(claudeMdPath)) {
    fs.mkdirSync(path.dirname(claudeMdPath), { recursive: true });
    fs.writeFileSync(claudeMdPath, `# Claude Code\n\n${wrapped}`, "utf8");
    return { target: "claude-md", path: claudeMdPath, action: "created" };
  }

  const raw = fs.readFileSync(claudeMdPath, "utf8");
  if (raw.includes(MARKER_START) && raw.includes(MARKER_END)) {
    const next = raw.replace(
      new RegExp(`${escapeRegExp(MARKER_START)}[\\s\\S]*?${escapeRegExp(MARKER_END)}\\n?`),
      wrapped,
    );
    fs.writeFileSync(claudeMdPath, next, "utf8");
    return { target: "claude-md", path: claudeMdPath, action: "updated" };
  }

  fs.writeFileSync(claudeMdPath, `${raw.trimEnd()}\n\n${wrapped}`, "utf8");
  return { target: "claude-md", path: claudeMdPath, action: "updated" };
}

export function claudeControlBlock(): string {
  return `## TaiyiForge（OMX 风格）

- **引擎**：加载 Skill \`taiyi-forge\`，用户说 **/taiyi:new**、**/taiyi:continue**、**/taiyi:apply**、**/taiyi:archive**，你用 Bash 代跑 \`scripts/taiyi-forge.sh\`。
- **写工件**：\`taiyi-change\` … \`taiyi-integration\`；**编排**：\`taiyi-orchestrator\`（\`--auto\`）。
- **铁三角**：Superpowers / gstack 在对话内加载。
- 详见 \`docs/taiyi/control-plane.md\` 与 \`docs/taiyi/invoke.yaml\`。`;
}

export function installClaudeControlPlane(claudeDir: string): InstallResult {
  const dest = path.join(claudeDir, "CLAUDE.md");
  return mergeClaudeControlBlock(dest, claudeControlBlock());
}
