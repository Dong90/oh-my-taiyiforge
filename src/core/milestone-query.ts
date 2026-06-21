import fs from "node:fs";
import path from "node:path";
import type { ChangeState, PhaseId } from "./types.js";
import { listPhases } from "./phase-registry.js";
import { normalizeState } from "./normalize-state.js";
import {
  displayPhase,
  expectedPhaseCount,
} from "./change-status.js";

// ── Types ──

export type ChangeMilestoneEntry = {
  slug: string;
  title: string;
  currentPhase: string;
  currentPhaseOrder: number;
  totalPhases: number;
  completedPhases: PhaseId[];
  profile: string;
  complexity?: string;
  createdAt: string;
  updatedAt: string;
  daysSinceCreation: number;
  daysSinceUpdate: number;
  isCompleted: boolean;
  isAborted: boolean;
};

export type BlockingItem = {
  slug: string;
  phase: string;
  type: "human-gate" | "stale" | "quality" | "step-blocker";
  detail: string;
};

export type HealthCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export type CommandTimestamp = {
  command: string;
  lastRun: string | null;
  lastSlug: string | null;
};

export type MilestoneReport = {
  totalChanges: number;
  activeChanges: number;
  completedChanges: number;
  abortedChanges: number;
  totalCompletedPhases: number;
  totalPossiblePhases: number;
  completionPercent: number;
  phaseDistribution: Record<string, number>;
  bottleneckPhase: { phaseId: string; count: number; slugs: string[] } | null;
  changes: ChangeMilestoneEntry[];
  blockingItems: BlockingItem[];
  commandTimestamps: CommandTimestamp[];
  healthChecks: HealthCheck[];
};

export type MilestoneQueryOptions = {
  includeArchived?: boolean;
};

// ── Helpers ──

function phaseOrder(phaseId: string): number {
  const found = listPhases().find((p) => p.id === phaseId);
  return found?.order ?? 0;
}

function readStateFile(statePath: string): ChangeState | null {
  if (!fs.existsSync(statePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, "utf8")) as ChangeState;
    return normalizeState(raw);
  } catch {
    return null;
  }
}

function extractTitle(changeDir: string, slug: string): string {
  const changeMd = path.join(changeDir, "CHANGE.md");
  if (!fs.existsSync(changeMd)) return slug;
  try {
    const content = fs.readFileSync(changeMd, "utf8");
    const m = content.match(/^#\s*CHANGE:\s*(.+)$/m);
    return m?.[1]?.trim() || slug;
  } catch {
    return slug;
  }
}

function daysAgo(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

function scanDir(
  baseDir: string,
): ChangeMilestoneEntry[] {
  if (!fs.existsSync(baseDir)) return [];
  const out: ChangeMilestoneEntry[] = [];

  for (const ent of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const changeDir = path.join(baseDir, ent.name);
    const statePath = path.join(changeDir, "state.json");
    const state = readStateFile(statePath);
    if (!state) continue;

    const phase = displayPhase(state);
    const total = expectedPhaseCount(state);
    const completed = state.completedPhases.length;

    out.push({
      slug: state.slug,
      title: extractTitle(changeDir, state.slug),
      currentPhase: phase,
      currentPhaseOrder: phase === "completed" || phase === "aborted"
        ? (phase === "completed" ? total : 1)
        : phaseOrder(phase),
      totalPhases: total,
      completedPhases: state.completedPhases,
      profile: state.profile,
      complexity: state.complexity?.level,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      daysSinceCreation: daysAgo(state.createdAt),
      daysSinceUpdate: daysAgo(state.updatedAt),
      isCompleted: phase === "completed",
      isAborted: phase === "aborted",
    });
  }

  return out;
}

// ── Main ──

export function queryMilestone(
  taiyiRoot: string,
  options?: MilestoneQueryOptions,
): MilestoneReport {
  const changesDir = path.join(taiyiRoot, "changes");
  const allActive = scanDir(changesDir);

  let allArchived: ChangeMilestoneEntry[] = [];
  if (options?.includeArchived) {
    const archiveDir = path.join(taiyiRoot, "archive");
    allArchived = scanDir(archiveDir);
  }

  const changes = [...allActive, ...allArchived].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  const activeChanges = changes.filter((c) => !c.isCompleted && !c.isAborted).length;
  const completedChanges = changes.filter((c) => c.isCompleted).length;
  const abortedChanges = changes.filter((c) => c.isAborted).length;

  let totalCompleted = 0;
  let totalPossible = 0;
  for (const c of changes) {
    totalCompleted += c.completedPhases.length;
    totalPossible += c.totalPhases;
  }

  // Phase distribution (where each active change is currently)
  const phaseDistribution: Record<string, number> = {};
  for (const c of changes) {
    if (c.isCompleted || c.isAborted) continue;
    phaseDistribution[c.currentPhase] = (phaseDistribution[c.currentPhase] ?? 0) + 1;
  }

  // Bottleneck: phase with the most active changes stuck
  let bottleneck: { phaseId: string; count: number; slugs: string[] } | null = null;
  for (const [phaseId, count] of Object.entries(phaseDistribution)) {
    if (!bottleneck || count > bottleneck.count) {
      const slugs = changes
        .filter((c) => !c.isCompleted && !c.isAborted && c.currentPhase === phaseId)
        .map((c) => c.slug);
      bottleneck = { phaseId, count, slugs };
    }
  }

  // Ignore "change" as bottleneck if it's the first phase (too trivial)
  if (bottleneck?.phaseId === "change" && bottleneck.count <= 1) {
    bottleneck = null;
  }

  // ── 阻塞项 ──
  const blockingItems = collectBlockingItems(taiyiRoot, changesDir);

  // ── 横向命令时间戳 ──
  const commandTimestamps = collectCommandTimestamps(taiyiRoot);

  // ── 健康自检 ──
  const healthChecks = runHealthChecks(taiyiRoot, changesDir, blockingItems);

  return {
    totalChanges: changes.length,
    activeChanges,
    completedChanges,
    abortedChanges,
    totalCompletedPhases: totalCompleted,
    totalPossiblePhases: totalPossible,
    completionPercent: totalPossible > 0
      ? Math.round((totalCompleted / totalPossible) * 100)
      : 0,
    phaseDistribution,
    bottleneckPhase: bottleneck,
    changes,
    blockingItems,
    commandTimestamps,
    healthChecks,
  };
}

// ── 阻塞项采集 ──

const HUMAN_GATED = new Set(["change", "design", "review"]);

function collectBlockingItems(
  taiyiRoot: string,
  changesDir: string,
): BlockingItem[] {
  const items: BlockingItem[] = [];
  if (!fs.existsSync(changesDir)) return items;

  for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const statePath = path.join(changesDir, ent.name, "state.json");
    const state = readStateFile(statePath);
    if (!state) continue;

    const phase = displayPhase(state);
    if (phase === "completed" || phase === "aborted") continue;

    const daysStale = daysAgo(state.updatedAt);

    // Blocked on human gate
    if (HUMAN_GATED.has(state.currentPhase)) {
      items.push({
        slug: state.slug,
        phase: state.currentPhase,
        type: "human-gate",
        detail: `等待 --approver 审批`,
      });
    }

    // Stale > 7 days
    if (daysStale > 7) {
      items.push({
        slug: state.slug,
        phase: state.currentPhase,
        type: "stale",
        detail: `停滞 ${daysStale} 天`,
      });
    }
  }

  return items;
}

// ── 横向命令时间戳 ──

const TRACKED_COMMANDS = [
  { command: "taiyi-health", event: "aux:completed", skill: "taiyi-health", label: "健康巡检" },
  { command: "taiyi-intel-scan", event: "aux:completed", skill: "taiyi-intel-scan", label: "情报扫描" },
  { command: "taiyi-architect", event: "aux:completed", skill: "taiyi-architect", label: "架构决策" },
  { command: "taiyi-evolve", event: "aux:completed", skill: "taiyi-evolve", label: "架构同步" },
];

function collectCommandTimestamps(taiyiRoot: string): CommandTimestamp[] {
  const activityPath = path.join(taiyiRoot, "activity.jsonl");
  const results: CommandTimestamp[] = [];

  // Parse activity log to find last run of each command
  const lastEvents = new Map<string, { ts: string; slug: string }>();
  if (fs.existsSync(activityPath)) {
    try {
      const lines = fs.readFileSync(activityPath, "utf8").trim().split("\n");
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.event === "aux:completed" && entry.skill) {
            lastEvents.set(entry.skill, { ts: entry.ts, slug: entry.slug });
          }
        } catch { /* skip malformed */ }
      }
    } catch { /* skip */ }
  }

  for (const cmd of TRACKED_COMMANDS) {
    const last = lastEvents.get(cmd.skill);
    results.push({
      command: cmd.label,
      lastRun: last?.ts ?? null,
      lastSlug: last?.slug ?? null,
    });
  }

  return results;
}

// ── 健康自检 ──

function runHealthChecks(
  taiyiRoot: string,
  changesDir: string,
  blockings: BlockingItem[],
): HealthCheck[] {
  const checks: HealthCheck[] = [];

  // .taiyi/ exists
  checks.push({
    id: ".taiyi 目录",
    ok: fs.existsSync(taiyiRoot),
    detail: fs.existsSync(taiyiRoot) ? "存在" : "缺失",
  });

  // Config exists
  const configPath = path.join(taiyiRoot, "config.json");
  checks.push({
    id: "项目配置",
    ok: fs.existsSync(configPath),
    detail: fs.existsSync(configPath) ? "config.json 存在" : "未配置（可选 init-wizard）",
  });

  // Stale locks
  let staleLocks = 0;
  if (fs.existsSync(changesDir)) {
    for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const lockPath = path.join(changesDir, ent.name, ".lock");
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > 3600_000) staleLocks++;
      } catch { /* no lock */ }
    }
  }
  checks.push({
    id: "残留锁文件",
    ok: staleLocks === 0,
    detail: staleLocks === 0 ? "无" : `${staleLocks} 个 stale lock`,
  });

  // Blocking items summary
  checks.push({
    id: "阻塞项",
    ok: blockings.length === 0,
    detail: blockings.length === 0 ? "无阻塞" : `${blockings.length} 项需处理`,
  });

  // Active changes count (warn if > 5)
  const activeCount = [...(fs.existsSync(changesDir) ? fs.readdirSync(changesDir, { withFileTypes: true }) : [])]
    .filter((e) => e.isDirectory()).length;
  checks.push({
    id: "活跃变更数",
    ok: activeCount <= 5,
    detail: `${activeCount} 个（${activeCount > 5 ? "偏多，建议归档或取消" : "正常"}）`,
  });

  return checks;
}
