import { execSync } from "node:child_process";
import { getLogger } from "./logger.js";

// ── Types ──────────────────────────────────────────────

export const VALID_EVENTS = [
  "phase:complete",
  "phase:blocked",
  "change:created",
  "change:archived",
  "audit:high",
  "gate:failed",
] as const;

export type TaiyiEvent = (typeof VALID_EVENTS)[number];
export type TaiyiEventHandler = (
  payload: Record<string, unknown>,
) => void | Promise<void>;

// ── State ──────────────────────────────────────────────

const handlers = new Map<TaiyiEvent, Set<TaiyiEventHandler>>();
const shellHooks = new Map<TaiyiEvent, string[]>();

// ── Public API ─────────────────────────────────────────

export function on(event: TaiyiEvent, handler: TaiyiEventHandler): void {
  if (!handlers.has(event)) {
    handlers.set(event, new Set());
  }
  handlers.get(event)!.add(handler);
}

export function off(event: TaiyiEvent, handler: TaiyiEventHandler): void {
  handlers.get(event)?.delete(handler);
}

export async function emit(
  event: TaiyiEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  // Run programmatic handlers
  const eventHandlers = handlers.get(event);
  if (eventHandlers) {
    const promises: Promise<void>[] = [];
    for (const h of eventHandlers) {
      try {
        const result = h(payload);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (err) {
        getLogger().error(`Event bus handler error for ${event}`, {
          error: String(err),
        });
      }
    }
    await Promise.all(promises);
  }

  // Run shell hooks
  const hooks = shellHooks.get(event);
  if (hooks && hooks.length > 0) {
    for (const raw of hooks) {
      const interpolated = interpolateShellCommand(raw, payload);
      try {
        execSync(interpolated, {
          timeout: 30_000,
          stdio: "ignore",
        });
      } catch (err) {
        getLogger().error(`Shell hook failed for ${event}`, {
          command: interpolated,
          error: String(err),
        });
      }
    }
  }
}

export function registerShellHook(event: TaiyiEvent, command: string): void {
  if (!shellHooks.has(event)) {
    shellHooks.set(event, []);
  }
  shellHooks.get(event)!.push(command);
}

export function resetEventBus(): void {
  handlers.clear();
  shellHooks.clear();
}

// ── Internal ───────────────────────────────────────────

function interpolateShellCommand(
  command: string,
  vars: Record<string, unknown>,
): string {
  return command.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = vars[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}
