import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import type { HarnessHook } from "../integrations/harness-hooks.js";

export type HarnessCheckpointFile = Partial<Record<PhaseId, Record<string, boolean>>>;

function checkpointPath(changeDir: string): string {
  return path.join(changeDir, ".harness-checkpoints.json");
}

export function hookKey(h: HarnessHook): string {
  if (h.skill) return `${h.tool}/${h.skill}`;
  if (h.command) return `${h.tool}:${h.command.split(/\s+/).slice(0, 2).join(" ")}`;
  return h.tool;
}

export function readHarnessCheckpoints(changeDir: string): HarnessCheckpointFile {
  const p = checkpointPath(changeDir);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as HarnessCheckpointFile;
  } catch {
    return {};
  }
}

export function markHarnessCheckpoint(
  changeDir: string,
  phase: PhaseId,
  key: string,
): void {
  const all = readHarnessCheckpoints(changeDir);
  const phaseMap = { ...(all[phase] ?? {}), [key]: true };
  all[phase] = phaseMap;
  fs.writeFileSync(checkpointPath(changeDir), JSON.stringify(all, null, 2) + "\n", "utf8");
}

export function pendingIronTriangleHooks(
  changeDir: string,
  phase: PhaseId,
  hooks: HarnessHook[],
  openspecDetected: boolean,
): string[] {
  const done = readHarnessCheckpoints(changeDir)[phase] ?? {};
  const pending: string[] = [];
  for (const h of hooks) {
    if (h.optional) continue;
    if (h.tool === "openspec" && !openspecDetected) continue;
    const key = hookKey(h);
    if (!done[key]) pending.push(key);
  }
  return pending;
}
