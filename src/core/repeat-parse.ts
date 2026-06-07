const DEFAULT_MAX = Number(process.env.TAIYI_REPEAT_MAX ?? "100");

/** 从参数解析重复次数：x5、×5、--times 5、-n 5 */
export function parseRepeatCount(argv: string[]): {
  positional: string[];
  times: number;
  /** 用户是否显式指定了 xN / --times（与默认 1 区分） */
  timesExplicit: boolean;
} {
  let times = 1;
  let timesExplicit = false;
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--times" || a === "-n") {
      const n = parseInt(argv[i + 1] ?? "", 10);
      if (Number.isFinite(n) && n > 0) {
        times = clampTimes(n);
        timesExplicit = true;
      }
      i++;
      continue;
    }
    if (a.startsWith("--times=")) {
      const n = parseInt(a.slice("--times=".length), 10);
      if (Number.isFinite(n) && n > 0) {
        times = clampTimes(n);
        timesExplicit = true;
      }
      continue;
    }
    const xm = a.match(/^[x×](\d+)$/i);
    if (xm) {
      times = clampTimes(parseInt(xm[1]!, 10));
      timesExplicit = true;
      continue;
    }
    if (a.startsWith("--")) continue;
    positional.push(a);
  }

  return { positional, times, timesExplicit };
}

function clampTimes(n: number): number {
  return Math.min(Math.max(1, Math.floor(n)), DEFAULT_MAX);
}

export function defaultLoopMax(): number {
  const n = Number(process.env.TAIYI_LOOP_MAX ?? "20");
  return clampTimes(Number.isFinite(n) ? n : 20);
}
