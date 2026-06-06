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
    | "codex-prompts"
    | "cursor-commands"
    | "claude-md"
    | "openspec"
    | "gstack"
    | "superpowers"
    | "web-quality-skills";
  path: string;
  action: "created" | "updated" | "skipped" | "failed";
  detail?: string;
};

export const PLUGIN_NAME = "oh-my-taiyiforge";
