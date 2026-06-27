/**
 * wiring-generator.ts — Generate Python main.py wiring from detected wiring points
 */

import type { WiringScanResult } from "./wiring-detector.js";

/** Unique import alias: use full module path to avoid collisions */
function routerAlias(modulePath: string): string {
  return modulePath.replace(/\./g, "_") + "_router";
}

const MIDDLEWARE_CONFIG_HINTS: Record<string, string> = {
  CORSMiddleware: 'app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])  # TODO: restrict origins in production',
  SlowAPIMiddleware: "app.add_middleware(SlowAPIMiddleware, limiter=limiter)",
};

/** Sort middlewares: known order (metrics→cors→auth→rate), unknown → alphabetical fallback */
function sortMiddlewares(mws: WiringScanResult["middlewares"]): WiringScanResult["middlewares"] {
  const score = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("metrics") || n.includes("prometheus") || n.includes("telemetry")) return 100;
    if (n.includes("cors")) return 200;
    if (n.includes("auth") || n.includes("jwt")) return 300;
    if (n.includes("rate") || n.includes("limit") || n.includes("slowapi")) return 400;
    return 0; // unknown → alphabetical sort
  };
  return [...mws].sort((a, b) => {
    const sa = score(a.className);
    const sb = score(b.className);
    if (sa !== sb) return sa - sb;
    return a.className.localeCompare(b.className); // same score → alphabetical
  });
}

export function generateWiring(scan: WiringScanResult): string {
  const lines: string[] = [];

  lines.push("# AUTO-GENERATED — do not edit manually");
  lines.push("# Regenerate: taiyi-forge.sh wire");
  lines.push("");

  lines.push("from fastapi import FastAPI");
  const hasGeneratorInits = scan.inits.some((i) => i.callStyle === "yield");
  if (hasGeneratorInits) {
    lines.push("from contextlib import asynccontextmanager");
  }
  lines.push("");

  for (const r of scan.routers) {
    lines.push(`from ${r.modulePath} import ${r.variable} as ${routerAlias(r.modulePath)}`);
  }

  const sortedMws = sortMiddlewares(scan.middlewares);
  for (const mw of sortedMws) {
    lines.push(`from ${mw.modulePath} import ${mw.className}`);
  }

  for (const init of scan.inits) {
    lines.push(`from ${init.modulePath} import ${init.funcName}`);
  }

  lines.push("");

  const generatorInits = scan.inits.filter((i) => i.callStyle === "yield");
  if (generatorInits.length > 0) {
    lines.push("@asynccontextmanager");
    lines.push("async def lifespan(app: FastAPI):");
    const nestedInits = generatorInits.map((init) => `async with ${init.funcName}() as _`);
    const indent = "    ";
    lines.push(...nestedInits.map((stmt, i) =>
      i === 0 ? `${indent}${stmt}:` : `${indent}${"    ".repeat(i)}${stmt}:`
    ));
    lines.push(`${indent}${"    ".repeat(generatorInits.length)}yield`);
    lines.push("");
  }

  lines.push("def apply_wiring(app: FastAPI):");

  if (sortedMws.length > 0) {
    for (const mw of sortedMws) {
      const hint = MIDDLEWARE_CONFIG_HINTS[mw.className];
      if (hint) {
        lines.push(`    ${hint}  # requires config — review before use`);
      } else {
        lines.push(`    app.add_middleware(${mw.className})`);
      }
    }
    lines.push("");
  }

  const directInits = scan.inits.filter((i) => i.callStyle === "direct");
  for (const init of directInits) {
    lines.push(`    ${init.funcName}(app)`);
  }
  if (directInits.length > 0) lines.push("");

  for (const r of scan.routers) {
    lines.push(`    app.include_router(${routerAlias(r.modulePath)})`);
  }

  return lines.join("\n") + "\n";
}
