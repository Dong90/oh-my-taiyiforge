import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "./types.js";
import type { HarnessHook } from "../integrations/harness-hooks.js";

export type HarnessEvidence = {
  passed: boolean;
  command: string;
  exitCode: number;
  capturedAt: string;
  inputFingerprint?: string;
  commitSha?: string;
};

export type HarnessCheckpointValue = boolean | HarnessEvidence;

export function isHarnessEvidenceFresh(
  evidence: HarnessCheckpointValue | undefined,
  inputFingerprint: string,
): boolean {
  return typeof evidence === "object"
    && evidence !== null
    && evidence.passed
    && evidence.exitCode === 0
    && evidence.inputFingerprint === inputFingerprint;
}
export type HarnessCheckpointFile = Partial<Record<PhaseId, Record<string, HarnessCheckpointValue>>>;

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

export type HarnessEvidenceInput = Omit<HarnessEvidence, "passed"> & { passed?: boolean };

export function markHarnessEvidence(
  changeDir: string,
  phase: PhaseId,
  key: string,
  evidence: HarnessEvidenceInput,
): void {
  const all = readHarnessCheckpoints(changeDir);
  const phaseMap = { ...(all[phase] ?? {}), [key]: { ...evidence, passed: evidence.passed ?? evidence.exitCode === 0 } };
  all[phase] = phaseMap;
  fs.writeFileSync(checkpointPath(changeDir), JSON.stringify(all, null, 2) + "\n", "utf8");
}

export function markHarnessCheckpoint(
  changeDir: string,
  phase: PhaseId,
  key: string,
): void {
  markHarnessEvidence(changeDir, phase, key, {
    command: "manual checkpoint",
    exitCode: 0,
    capturedAt: new Date().toISOString(),
  });
}

export function pendingDualLineHarnessHooks(
  changeDir: string,
  phase: PhaseId,
  hooks: HarnessHook[],
  openspecDetected: boolean,
): string[] {
  const done = readHarnessCheckpoints(changeDir)[phase] ?? {};
  const pending: string[] = [];
  const seen = new Set<string>();
  for (const h of hooks) {
    if (h.optional) continue;
    if (h.tool === "openspec" && !openspecDetected) continue;
    const key = hookKey(h);
    // 去重：同一 hook key（如 ecc/tdd-workflow）可能从多个源被重复添加
    // 多个源：workflow-manifest.yaml + token-compress-hooks.yaml
    if (seen.has(key)) continue;
    seen.add(key);
    const evidence = done[key];
    if (!evidence || typeof evidence === "boolean" || !evidence.passed || evidence.exitCode !== 0) {
      pending.push(key);
    }
  }
  return pending;
}
