import os from "node:os";
import path from "node:path";

export function homeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || os.homedir();
}

export function skillSourceRoot(pkgRoot: string): string {
  return path.join(pkgRoot, "skills");
}

export function defaultSkillTargets(): Record<
  "opencode" | "claude" | "codex" | "cursor",
  string
> {
  const home = homeDir();
  return {
    opencode: process.env.OPENCODE_SKILLS_DIR || path.join(home, ".config", "opencode", "skills"),
    claude: process.env.CLAUDE_SKILLS_DIR || path.join(home, ".claude", "skills"),
    codex: process.env.CODEX_SKILLS_DIR || path.join(home, ".codex", "skills"),
    cursor: process.env.CURSOR_SKILLS_DIR || path.join(home, ".cursor", "skills"),
  };
}

/** Global OpenCode config candidates (same order as oh-my-openagent). */
export function opencodeConfigCandidates(cwd = process.cwd()): string[] {
  const home = homeDir();
  return [
    path.join(cwd, ".opencode", "opencode.json"),
    path.join(cwd, "opencode.json"),
    path.join(home, ".config", "opencode", "opencode.json"),
    path.join(home, ".config", "opencode", ".opencode.json"),
    path.join(home, ".opencode.json"),
  ];
}

export function opencodeConfigDir(): string {
  return path.join(homeDir(), ".config", "opencode");
}

export function codexPromptsDir(): string {
  return process.env.CODEX_PROMPTS_DIR || path.join(homeDir(), ".codex", "prompts");
}

export function codexConfigPath(): string {
  return process.env.CODEX_CONFIG_PATH || path.join(homeDir(), ".codex", "config.toml");
}

export function claudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(homeDir(), ".claude");
}
