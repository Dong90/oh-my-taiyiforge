#!/usr/bin/env node
/**
 * Capture architecture-poster.html at 1920×1080 PNG via Chrome headless.
 *
 * Prereq: serve the HTML first, e.g.
 *   cd docs/diagrams/visual && python3 -m http.server 8765
 *
 * Usage: node scripts/capture-poster.mjs [url] [out.png]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const url = process.argv[2] ?? "http://localhost:8765/architecture-vercel-mesh.html";
const out = path.resolve(
  process.argv[3] ?? path.join(root, "docs/diagrams/visual/architecture-vercel-mesh.png"),
);

const chrome =
  process.env.PUPPETEER_EXECUTABLE_PATH ??
  (fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : undefined);

if (!chrome) {
  console.error("Chrome not found. Set PUPPETEER_EXECUTABLE_PATH.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--window-size=1920,1080",
    `--screenshot=${out}`,
    url,
  ],
  { stdio: "inherit" },
);
console.log(`Saved: ${out}`);
