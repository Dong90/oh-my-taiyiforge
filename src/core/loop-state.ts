import fs from "node:fs";
import path from "node:path";

export type LoopStateFile = {
  slug: string;
  round: number;
  maxRounds: number;
  lastPhase?: string;
  updatedAt: string;
};

const FILE = ".loop-state.json";

export function readLoopState(changeDir: string): LoopStateFile | null {
  const p = path.join(changeDir, FILE);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as LoopStateFile;
  } catch {
    return null;
  }
}

export function bumpLoopRound(
  changeDir: string,
  slug: string,
  maxRounds: number,
  lastPhase: string,
): LoopStateFile {
  const prev = readLoopState(changeDir);
  const next: LoopStateFile = {
    slug,
    round: (prev?.slug === slug ? prev.round : 0) + 1,
    maxRounds,
    lastPhase,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(changeDir, FILE), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function clearLoopState(changeDir: string): void {
  const p = path.join(changeDir, FILE);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
