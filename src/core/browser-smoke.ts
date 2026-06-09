import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolvePackageRoot } from "./package-root.js";

export type BrowserSmokeResult =
  | { ok: true; text: string }
  | { ok: false; error: string; text?: string };

/** 运行 examples/browser-e2e-smoke（Playwright + 静态页，/taiyi:e2e 可复现路径） */
export function runBrowserSmoke(cwd: string, plain = true): BrowserSmokeResult {
  const pkgRoot = resolvePackageRoot(import.meta.url);
  const script = path.join(pkgRoot, "examples", "browser-e2e-smoke", "run-verify.mjs");
  if (!fs.existsSync(script)) {
    return {
      ok: false,
      error: `browser-smoke 夹具缺失: ${script}`,
    };
  }

  const r = spawnSync(process.execPath, [script], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: pkgRoot },
    timeout: 300_000,
  });

  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  if (r.status !== 0) {
    return {
      ok: false,
      error: `browser-smoke 失败 (exit ${r.status ?? 1})`,
      text: plain ? out : undefined,
    };
  }

  const text = plain
    ? out || "✓ browser-smoke passed (Playwright /taiyi:e2e equivalent)"
    : out;
  return { ok: true, text };
}
