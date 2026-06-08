import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function readPkgScripts(workspaceDir: string): Record<string, string> | undefined {
  const pkgPath = path.join(workspaceDir, "package.json");
  if (!fs.existsSync(pkgPath)) return undefined;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { scripts?: Record<string, string> };
    return pkg.scripts;
  } catch {
    return undefined;
  }
}

type ScriptRun = { ok: boolean; text: string; exitCode: number };

function runScript(workspaceDir: string, scriptName: string): ScriptRun | null {
  const scripts = readPkgScripts(workspaceDir);
  if (!scripts?.[scriptName]) return null;
  try {
    const out = execSync(`npm run ${scriptName} 2>&1`, {
      cwd: workspaceDir,
      encoding: "utf8",
      timeout: 120_000,
    });
    return { ok: true, text: out, exitCode: 0 };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string; message?: string };
    const text = [err.stdout, err.stderr, err.message].filter(Boolean).join("\n");
    const exitCode = typeof err.status === "number" ? err.status : 1;
    return { ok: false, text, exitCode };
  }
}

function runTscNoEmit(workspaceDir: string): ScriptRun {
  try {
    const out = execSync("npx tsc --noEmit 2>&1", {
      cwd: workspaceDir,
      encoding: "utf8",
      timeout: 120_000,
    });
    return { ok: true, text: out || "tsc --noEmit: ok", exitCode: 0 };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    const text = [err.stdout, err.stderr].filter(Boolean).join("\n");
    const exitCode = typeof err.status === "number" ? err.status : 1;
    return { ok: false, text, exitCode };
  }
}

/** 轻量 LSP 替代：跑项目 typecheck/lint 或 tsc --noEmit（对标 OMC lsp_diagnostics） */
export function taiyiLspDiagnostics(workspaceDir: string): { ok: boolean; text: string; source?: string } {
  if (process.env.TAIYI_LSP === "off") {
    return { ok: true, text: "TAIYI_LSP=off — 跳过 diagnostics" };
  }
  for (const name of ["typecheck", "lint", "check"] as const) {
    const run = runScript(workspaceDir, name);
    if (run !== null) {
      return { ok: run.ok, text: run.text.slice(0, 8000), source: `npm run ${name}` };
    }
  }
  if (fs.existsSync(path.join(workspaceDir, "tsconfig.json"))) {
    const run = runTscNoEmit(workspaceDir);
    return { ok: run.ok, text: run.text.slice(0, 8000), source: "tsc --noEmit" };
  }
  return {
    ok: true,
    text: "无 typecheck/lint/check 脚本且无 tsconfig.json。在 Cursor 内用内置 LSP；或配置 package.json scripts。",
  };
}

function grepSymbol(workspaceDir: string, symbol: string, fileHint?: string): string[] {
  const hits: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 6 || hits.length >= 20) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "dist") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|py|go|rs)$/.test(e.name)) continue;
      if (fileHint && !full.includes(fileHint)) continue;
      try {
        const lines = fs.readFileSync(full, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (line.includes(symbol)) {
            hits.push(`${path.relative(workspaceDir, full)}:${i + 1}: ${line.trim().slice(0, 120)}`);
          }
        });
      } catch {
        /* ignore */
      }
    }
  };
  walk(workspaceDir, 0);
  return hits;
}

export function taiyiLspGotoDefinition(
  workspaceDir: string,
  symbol: string,
  fileHint?: string,
): { ok: boolean; text: string; matches: string[] } {
  if (!symbol.trim()) {
    return { ok: false, text: "symbol required", matches: [] };
  }
  const matches = grepSymbol(workspaceDir, symbol.trim(), fileHint);
  if (matches.length === 0) {
    return { ok: false, text: `未找到符号 ${symbol}`, matches: [] };
  }
  return {
    ok: true,
    text: [`符号 ${symbol} 候选定义:`, ...matches.slice(0, 10)].join("\n"),
    matches: matches.slice(0, 10),
  };
}

export function taiyiLspFindReferences(
  workspaceDir: string,
  symbol: string,
): { ok: boolean; text: string; matches: string[] } {
  return taiyiLspGotoDefinition(workspaceDir, symbol);
}
