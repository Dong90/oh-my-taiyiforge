import fs from "node:fs";
import path from "node:path";
import { VALID_EVENTS, registerShellHook, type TaiyiEvent } from "./event-bus.js";

type HooksConfig = {
  hooks: Array<{
    event: string;
    command: string;
  }>;
};

/**
 * Read .taiyi/hooks.json and register all shell hooks.
 * Throws if an unknown event name is encountered.
 */
export function loadHooksFromConfig(taiyiRoot: string): void {
  const configPath = path.join(taiyiRoot, "hooks.json");
  if (!fs.existsSync(configPath)) return;

  const raw = fs.readFileSync(configPath, "utf8");
  const config: HooksConfig = JSON.parse(raw);

  if (!Array.isArray(config.hooks)) return;

  const validSet = new Set<string>(VALID_EVENTS);

  for (const hook of config.hooks) {
    if (!validSet.has(hook.event)) {
      throw new Error(
        `Unknown event "${hook.event}" in hooks.json. Valid events: ${VALID_EVENTS.join(", ")}`,
      );
    }
    registerShellHook(hook.event as TaiyiEvent, hook.command);
  }
}
