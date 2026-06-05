export type InstallTarget = "opencode" | "claude" | "codex";

export type InstallResult = {
  target: InstallTarget | "opencode-config" | "codex-agents";
  path: string;
  action: "created" | "updated" | "skipped" | "failed";
  detail?: string;
};

export const PLUGIN_NAME = "oh-my-taiyiforge";
