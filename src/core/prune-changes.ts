import fs from "node:fs";
import path from "node:path";

export type OrphanChangeDir = {
  name: string;
  path: string;
  reason: "no-state" | "empty" | "aborted";
};

function readWorkflowStatus(dir: string): string | null {
  const statePath = path.join(dir, "state.json");
  if (!fs.existsSync(statePath)) return null;
  try {
    const st = JSON.parse(fs.readFileSync(statePath, "utf8")) as { workflowStatus?: string };
    return st.workflowStatus ?? null;
  } catch {
    return null;
  }
}

export function listAbortedChangeDirs(taiyiRoot: string): OrphanChangeDir[] {
  const changesDir = path.join(taiyiRoot, "changes");
  if (!fs.existsSync(changesDir)) return [];

  const out: OrphanChangeDir[] = [];
  for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(changesDir, ent.name);
    if (readWorkflowStatus(dir) === "aborted") {
      out.push({ name: ent.name, path: dir, reason: "aborted" });
    }
  }
  return out;
}

export function listOrphanChangeDirs(taiyiRoot: string): OrphanChangeDir[] {
  const changesDir = path.join(taiyiRoot, "changes");
  if (!fs.existsSync(changesDir)) return [];

  const out: OrphanChangeDir[] = [];
  for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(changesDir, ent.name);
    const statePath = path.join(dir, "state.json");
    if (!fs.existsSync(statePath)) {
      const entries = fs.readdirSync(dir);
      out.push({
        name: ent.name,
        path: dir,
        reason: entries.length === 0 ? "empty" : "no-state",
      });
    }
  }
  return out;
}

export function pruneOrphanChangeDirs(
  taiyiRoot: string,
  options?: { dryRun?: boolean; includeAborted?: boolean },
): OrphanChangeDir[] {
  const orphans = listOrphanChangeDirs(taiyiRoot);
  const aborted = options?.includeAborted ? listAbortedChangeDirs(taiyiRoot) : [];
  const all = [...orphans, ...aborted];
  if (options?.dryRun) return all;

  for (const o of all) {
    fs.rmSync(o.path, { recursive: true, force: true });
  }
  return all;
}

export function formatPrunePlain(
  orphans: OrphanChangeDir[],
  dryRun: boolean,
  includeAborted?: boolean,
): string {
  if (orphans.length === 0) {
    return includeAborted
      ? "无 orphan / aborted 变更目录"
      : "无 orphan 变更目录（均含 state.json；aborted 用 prune --aborted）";
  }
  const verb = dryRun ? "将删除" : "已删除";
  return [
    `${verb} ${orphans.length} 个变更目录:`,
    ...orphans.map((o) => `  · ${o.name} (${o.reason})`),
  ].join("\n");
}
