import fs from "node:fs";
import path from "node:path";

export type ReviewLoopStateFile = {
  slug: string;
  round: number;
  maxRounds?: number;
  lastVerdict?: string;
  completedRounds?: number[];
  loopStartedAt?: string;
  lastReviewMdMtimeMs?: number;
  updatedAt: string;
};

export function defaultReviewLoopMaxRounds(): number {
  const n = Number(process.env.TAIYI_REVIEW_LOOP_MAX_ROUNDS ?? "5");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
}

const FILE = ".review-loop-state.json";

export function readReviewLoopState(changeDir: string): ReviewLoopStateFile | null {
  const p = path.join(changeDir, FILE);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as ReviewLoopStateFile;
  } catch {
    return null;
  }
}

export function bumpReviewLoopRound(
  changeDir: string,
  slug: string,
  lastVerdict: string,
  maxRounds = defaultReviewLoopMaxRounds(),
  extra?: Partial<Pick<ReviewLoopStateFile, "loopStartedAt" | "lastReviewMdMtimeMs">>,
): ReviewLoopStateFile {
  const prev = readReviewLoopState(changeDir);
  const prevRound = prev?.slug === slug ? prev.round : 0;
  const completed = prev?.completedRounds ?? [];
  if (prevRound > 0 && !completed.includes(prevRound)) completed.push(prevRound);
  const next: ReviewLoopStateFile = {
    slug,
    round: prevRound + 1,
    maxRounds,
    lastVerdict,
    completedRounds: completed,
    loopStartedAt: extra?.loopStartedAt ?? prev?.loopStartedAt,
    lastReviewMdMtimeMs: extra?.lastReviewMdMtimeMs ?? prev?.lastReviewMdMtimeMs,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(changeDir, FILE), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function markReviewLoopStarted(changeDir: string, slug: string): ReviewLoopStateFile {
  const now = new Date().toISOString();
  const prev = readReviewLoopState(changeDir);
  const next: ReviewLoopStateFile = {
    slug,
    round: prev?.slug === slug ? prev.round : 0,
    maxRounds: prev?.maxRounds ?? defaultReviewLoopMaxRounds(),
    // 同一会话内保留首次 loopStartedAt，避免每轮 review-loop 都把 REVIEW.md 判为过期
    loopStartedAt:
      prev?.slug === slug && prev.loopStartedAt ? prev.loopStartedAt : now,
    updatedAt: now,
  };
  fs.writeFileSync(path.join(changeDir, FILE), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function clearReviewLoopState(changeDir: string): void {
  const p = path.join(changeDir, FILE);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
