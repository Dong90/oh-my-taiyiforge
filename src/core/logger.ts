export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_NUM: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function resolveLogLevel(): LogLevel {
  const env = process.env.TAIYI_LOG_LEVEL;
  if (env && env in LEVEL_NUM) return env as LogLevel;
  return "info";
}

export class TaiyiLogger {
  public level: LogLevel;
  private sink: (msg: string) => void;
  private levelNum: number;

  constructor(opts?: { level?: LogLevel; sink?: (msg: string) => void }) {
    this.level = opts?.level ?? resolveLogLevel();
    this.levelNum = LEVEL_NUM[this.level];
    this.sink = opts?.sink ?? ((m) => console.log(m));
  }

  private log(lvl: LogLevel, msg: string, ctx?: unknown) {
    if (LEVEL_NUM[lvl] < this.levelNum) return;
    const ts = new Date().toISOString();
    const extra =
      ctx instanceof Error
        ? { message: ctx.message, stack: ctx.stack?.split("\n").slice(0, 3).join("; ") }
        : ctx !== undefined
          ? ctx
          : {};
    const line = JSON.stringify({ time: ts, level: lvl, msg, ...extra });
    this.sink(line);
  }

  debug(msg: string, ctx?: unknown) {
    this.log("debug", msg, ctx);
  }
  info(msg: string, ctx?: unknown) {
    this.log("info", msg, ctx);
  }
  warn(msg: string, ctx?: unknown) {
    this.log("warn", msg, ctx);
  }
  error(msg: string, ctx?: unknown) {
    this.log("error", msg, ctx);
  }
}

/** Singleton root logger */
let rootLogger: TaiyiLogger | null = null;
export function getLogger(): TaiyiLogger {
  if (!rootLogger) rootLogger = new TaiyiLogger();
  return rootLogger;
}
export function setLogger(l: TaiyiLogger) {
  rootLogger = l;
}
