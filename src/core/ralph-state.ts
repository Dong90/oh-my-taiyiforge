import fs from "node:fs";
import path from "node:path";

export type RalphStateFile = {
  slug: string;
  round: number;
  maxRounds: number;
  lastVerifyCmd?: string;
  lastExitCode?: number;
  updatedAt: string;
};

export function defaultRalphMaxRounds(): number {
  return Number(process.env.TAIYI_RALPH_MAX_ROUNDS ?? "30");
}

const FILE = ".ralph-state.json";

export function readRalphState(changeDir: string): RalphStateFile | null {
  const p = path.join(changeDir, FILE);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as RalphStateFile;
  } catch {
    return null;
  }
}

export function bumpRalphRound(
  changeDir: string,
  slug: string,
  maxRounds = defaultRalphMaxRounds(),
  extra?: Partial<Pick<RalphStateFile, "lastVerifyCmd" | "lastExitCode">>,
): RalphStateFile {
  const prev = readRalphState(changeDir);
  const next: RalphStateFile = {
    slug,
    round: (prev?.round ?? 0) + 1,
    maxRounds: prev?.maxRounds ?? maxRounds,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
  fs.writeFileSync(path.join(changeDir, FILE), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function clearRalphState(changeDir: string): void {
  const p = path.join(changeDir, FILE);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
