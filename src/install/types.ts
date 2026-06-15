export type InstallTarget = "opencode" | "claude" | "codex" | "cursor";

export const ALL_INSTALL_TARGETS: InstallTarget[] = [
  "opencode",
  "claude",
  "codex",
  "cursor",
];

export type InstallResult = {
  target:
    | InstallTarget
    | "opencode-config"
    | "codex-agents"
    | "codex-config"
    | "codex-prompts"
    | "claude-commands"
    | "opencode-commands"
    | "cursor-commands"
    | "cursor-hooks"
    | "claude-hooks"
    | "cursor-mcp"
    | "codex-mcp"
    | "claude-mcp"
    | "claude-md"
    | "openspec"
    | "gstack"
    | "superpowers"
    | "web-quality-skills"
    | "project-wrapper";
  path: string;
  action: "created" | "updated" | "skipped" | "failed";
  detail?: string;
};

export const PLUGIN_NAME = "oh-my-taiyiforge";
