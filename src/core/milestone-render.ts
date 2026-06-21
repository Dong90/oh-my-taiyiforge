import type { MilestoneReport, ChangeMilestoneEntry } from "./milestone-query.js";

const STALE_DAYS = 3;

function progressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);
  return (
    "█".repeat(filled) + "░".repeat(width - filled)
  );
}

function padRight(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

function daysAgo(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

function nextStep(phase: string, slug: string, isCompleted: boolean, isAborted: boolean): string {
  if (isCompleted) return `/taiyi:archive ${slug}`;
  if (isAborted) return "已废弃";
  const map: Record<string, [string, boolean]> = {
    "change": ["/taiyi:write", true],
    "requirement": ["/taiyi:write", true],
    "design": ["/taiyi:write", true],
    "ui-design": ["/taiyi:write", true],
    "task": ["/taiyi:write", true],
    "dev": ["/taiyi:apply", true],
    "test": ["/taiyi:write", true],
    "review": ["/taiyi:continue", true],
    "integration": ["/taiyi:continue", true],
  };
  const entry = map[phase];
  return entry ? `${entry[0]} ${slug}` : `/taiyi:status ${slug}`;
}

const ZH_PHASE: Record<string, string> = {
  "change": "变更提案",
  "requirement": "需求验收",
  "design": "技术设计",
  "ui-design": "交互设计",
  "task": "任务切片",
  "dev": "开发实现",
  "test": "测试验证",
  "review": "评审",
  "integration": "集成归档",
};

function formatPhaseLabel(phase: string): string {
  const map: Record<string, string> = {
    "change": "change",
    "requirement": "req",
    "design": "design",
    "ui-design": "ui",
    "task": "task",
    "dev": "dev",
    "test": "test",
    "review": "review",
    "integration": "int",
  };
  return map[phase] ?? phase.slice(0, 4);
}

function formatEntryLine(
  e: ChangeMilestoneEntry,
  rank: number,
  maxSlugLen: number,
  maxTitleLen: number,
): string {
  const icon = e.isCompleted ? "✓" : e.isAborted ? "✗" : "·";
  const slug = padRight(e.slug, maxSlugLen);
  const phaseLabel = e.isCompleted ? "completed" : e.isAborted ? "aborted" : e.currentPhase;
  const phase = padRight(phaseLabel, 10);
  const progress = `${e.completedPhases.length}/${e.totalPhases}`;
  const isStale = !e.isCompleted && !e.isAborted && e.daysSinceUpdate > STALE_DAYS;
  const days = `${e.daysSinceUpdate}d${isStale ? "*" : " "}`;
  const title = e.title.length > maxTitleLen
    ? e.title.slice(0, maxTitleLen - 3) + "..."
    : e.title;
  const next = padRight(nextStep(e.currentPhase, e.slug, e.isCompleted, e.isAborted), 24);
  return `${padRight(String(rank), 2)} ${icon} ${slug}  ${phase}  ${progress}  ${padRight(days, 5)} ${title}  ${next}`;
}

function formatPhaseBar(
  dist: Record<string, number>,
  bottleneckId: string | null,
): string {
  const lines: string[] = [];
  const order = [
    "change", "requirement", "design", "ui-design",
    "task", "dev", "test", "review", "integration",
  ];

  // Find max count for bar scaling
  const max = Math.max(1, ...Object.values(dist));

  for (const phase of order) {
    const count = dist[phase] ?? 0;
    if (count === 0) continue; // skip empty phases for cleaner output
    const barLen = Math.max(1, Math.round((count / max) * 10));
    const bar = "█".repeat(Math.min(barLen, 10));
    const zh = ZH_PHASE[phase] ?? "";
    const marker = phase === bottleneckId ? " ← 瓶颈" : "";
    lines.push(`  ${padRight(formatPhaseLabel(phase), 9)} ${padRight(bar, 10)} ${count}  ${zh}${marker}`);
  }

  if (lines.length === 0) lines.push("  （无活跃变更）");
  return lines.join("\n");
}

function formatPhaseBarHorizontal(
  dist: Record<string, number>,
  bottleneckId: string | null,
): string {
  const parts: string[] = [];
  const order = [
    "change", "requirement", "design", "ui-design",
    "task", "dev", "test", "review", "integration",
  ];
  const max = Math.max(1, ...Object.values(dist));
  for (const phase of order) {
    const count = dist[phase] ?? 0;
    if (count === 0) continue;
    const barLen = Math.max(1, Math.round((count / max) * 3));
    const bar = "█".repeat(barLen);
    const marker = phase === bottleneckId ? " ◀瓶颈" : "";
    parts.push(`${formatPhaseLabel(phase)} ${bar}${count}${marker}`);
  }
  return parts.length > 0
    ? "  " + parts.join(" · ")
    : "  （无活跃变更）";
}

export function formatMilestonePlain(report: MilestoneReport): string {
  const lines: string[] = [];

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("  里程碑总览");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");

  // Compact metrics row
  const remaining = report.totalPossiblePhases - report.totalCompletedPhases;
  const staleCount = report.changes.filter(
    (e) => !e.isCompleted && !e.isAborted && e.daysSinceUpdate > STALE_DAYS,
  ).length;

  const metricParts: string[] = [];
  metricParts.push(`变更 ${report.totalChanges}（${report.activeChanges}活跃 · ${report.completedChanges}完成 · ${report.abortedChanges}废弃）`);
  metricParts.push(`进度 ${report.completionPercent}% ${progressBar(report.completionPercent, 8)}`);
  metricParts.push(`剩余 ${remaining}`);
  if (staleCount > 0) metricParts.push(`陈旧 ${staleCount}⚠`);
  lines.push(`  ${metricParts.join("  ")}`);
  lines.push("");

  lines.push("");

  // ── 阻塞项 ──
  if (report.blockingItems.length > 0) {
    lines.push("  ── 阻塞项 ──");
    for (const b of report.blockingItems) {
      const icon = b.type === "human-gate" ? "🔒" : b.type === "stale" ? "⏳" : "⚠";
      lines.push(`  ${icon} ${b.slug} (${b.phase}): ${b.detail}`);
    }
    lines.push("");
  }

  // ── 横向命令 ──
  if (report.commandTimestamps.length > 0) {
    lines.push("  ── 横向命令 ──");
    for (const c of report.commandTimestamps) {
      const ago = c.lastRun ? `${daysAgo(c.lastRun)}d 前` : "未执行";
      const fresh = c.lastRun ? daysAgo(c.lastRun) > 30 : true;
      const marker = !c.lastRun ? " ⚐" : fresh ? " (建议重跑)" : "";
      lines.push(`  ${c.command}: ${ago}${marker}`);
    }
    lines.push("");
  }

  // ── 健康自检 ──
  if (report.healthChecks.length > 0) {
    lines.push("  ── 自检 ──");
    for (const h of report.healthChecks) {
      const icon = h.ok ? "✓" : "✗";
      lines.push(`  ${icon} ${h.id}: ${h.detail}`);
    }
    lines.push("");
  }

  // ── 优先处理 ──
  const firstActive = report.changes.find((e) => !e.isCompleted && !e.isAborted);
  if (firstActive) {
    const cmd = nextStep(firstActive.currentPhase, firstActive.slug, false, false);
    const title = firstActive.title !== firstActive.slug ? `  →  ${firstActive.title}` : "";
    lines.push(`  ── 优先处理 ──  ${cmd}${title}`);
    lines.push("");
  }

  // Distribution (horizontal)
  const distLine = formatPhaseBarHorizontal(
    report.phaseDistribution,
    report.bottleneckPhase?.phaseId ?? null,
  );
  const nonZero = Object.values(report.phaseDistribution).filter((n) => n > 0).length;
  if (nonZero > 0) {
    lines.push(`  各阶段:${distLine.slice(2)}`);
    lines.push("");
  }

  // Change list
  lines.push("  变更清单:");
  const entries = report.changes;
  if (entries.length === 0) {
    lines.push("  （无变更 → /taiyi:new）");
  } else {
    // Sort: bottleneck first → other active → completed → aborted
    const bottleneckId = report.bottleneckPhase?.phaseId;
    const sorted = [...entries].sort((a, b) => {
      const aActive = !a.isCompleted && !a.isAborted;
      const bActive = !b.isCompleted && !b.isAborted;
      const aBN = aActive && a.currentPhase === bottleneckId;
      const bBN = bActive && b.currentPhase === bottleneckId;
      if (aBN && !bBN) return -1;
      if (!aBN && bBN) return 1;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      if (a.isCompleted && !b.isCompleted) return -1;
      if (!a.isCompleted && b.isCompleted) return 1;
      return b.daysSinceUpdate - a.daysSinceUpdate;
    });

    const maxSlug = Math.max(12, ...sorted.map((e) => e.slug.length));
    const maxTitle = Math.min(60, Math.max(12, ...sorted.map((e) => e.title.length)));
    lines.push(`  ${padRight("#", 2)} ${padRight("slug", maxSlug)}  phase      进度  天数  title${" ".repeat(Math.max(0, maxTitle - 6))} next`);
    lines.push(`  ${"--"} ${"-".repeat(maxSlug)}  ${"-".repeat(10)}  ----  ----  ${"-".repeat(maxTitle)}  ${"-".repeat(24)}`);

    // Track group boundaries for visual separators
    let prevGroup: string | null = null;
    let rank = 0;
    for (const e of sorted) {
      const isActive = !e.isCompleted && !e.isAborted;
      const group = e.isCompleted
        ? "completed"
        : e.isAborted
          ? "aborted"
          : isActive && e.currentPhase === bottleneckId && bottleneckId
            ? "bottleneck"
            : "active";

      if (prevGroup && group !== prevGroup) {
        const sep = group === "completed"
          ? "  ─── 已完成 ───"
          : group === "aborted"
            ? "  ─── 已废弃 ───"
            : "  ─── 进行中 ───";
        lines.push(sep);
      }
      prevGroup = group;

      rank++;
      lines.push("  " + formatEntryLine(e, rank, maxSlug, maxTitle));
    }
  }

  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("  /taiyi:new  /taiyi:list  /taiyi:status <slug>  /taiyi:list --dashboard");
  lines.push("  * 超过3天未更新");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return lines.join("\n");
}
