#!/usr/bin/env node
/**
 * Render Mermaid blocks from a Markdown file to PNG/SVG.
 *
 * Usage:
 *   node scripts/render-mermaid.mjs path/to/diagrams.md
 *   node scripts/render-mermaid.mjs path/to/diagrams.md --format svg --out dir/
 *   node scripts/render-mermaid.mjs path/to/diagrams.md --width 3200 --height 2400 --scale 2
 *
 * Requires: npx @mermaid-js/mermaid-cli (downloaded on first run).
 * macOS: if Chrome missing, set PUPPETEER_EXECUTABLE_PATH to system Chrome.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = path.join(__dirname, "mermaid-arch-config.json");

function usage() {
  console.error(`Usage: node scripts/render-mermaid.mjs <file.md> [options]

Options:
  --format png|svg     Output format (default: png)
  --out <dir>          Output directory
  --width <px>         Viewport width (default: 3200)
  --height <px>        Viewport height (default: 2400)
  --scale <n>          Device scale factor for sharper PNG (default: 2)
  --background <color> Background e.g. #ffffff (default: #ffffff)
  --config <path>      Mermaid config JSON (default: scripts/mermaid-arch-config.json)
  --transparent        Use transparent background instead of --background`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("-h") || args.includes("--help")) usage();

const input = path.resolve(args[0]);
if (!fs.existsSync(input)) {
  console.error(`Not found: ${input}`);
  process.exit(1);
}

let format = "png";
let outDir = path.dirname(input);
let width = "3200";
let height = "2400";
let scale = "2";
let background = "#ffffff";
let transparent = false;
let configFile = fs.existsSync(DEFAULT_CONFIG) ? DEFAULT_CONFIG : undefined;

for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === "--format" && args[i + 1]) format = args[++i];
  else if (a === "--out" && args[i + 1]) outDir = path.resolve(args[++i]);
  else if (a === "--width" && args[i + 1]) width = args[++i];
  else if (a === "--height" && args[i + 1]) height = args[++i];
  else if (a === "--scale" && args[i + 1]) scale = args[++i];
  else if (a === "--background" && args[i + 1]) background = args[++i];
  else if (a === "--config" && args[i + 1]) configFile = path.resolve(args[++i]);
  else if (a === "--transparent") transparent = true;
}

if (!["png", "svg"].includes(format)) {
  console.error(`Unsupported format: ${format}`);
  process.exit(1);
}

const md = fs.readFileSync(input, "utf8");
const blocks = [...md.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trim());
if (blocks.length === 0) {
  console.error(`No \`\`\`mermaid blocks in ${input}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const base = path.basename(input, path.extname(input));
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-mmd-"));

const mmdcArgs = ["--yes", "@mermaid-js/mermaid-cli", "-w", width, "-H", height, "-s", scale];
if (transparent) mmdcArgs.push("-b", "transparent");
else mmdcArgs.push("-b", background);
if (configFile && fs.existsSync(configFile)) mmdcArgs.push("-c", configFile);

const env = { ...process.env };
if (!env.PUPPETEER_EXECUTABLE_PATH) {
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(chrome)) env.PUPPETEER_EXECUTABLE_PATH = chrome;
}

const outputs = [];
for (let i = 0; i < blocks.length; i++) {
  const suffix = blocks.length === 1 ? "" : `-${i + 1}`;
  const mmd = path.join(tmpRoot, `${base}${suffix}.mmd`);
  const out = path.join(outDir, `${base}${suffix}.${format}`);
  fs.writeFileSync(mmd, blocks[i], "utf8");
  execFileSync("npx", [...mmdcArgs, "-i", mmd, "-o", out], { stdio: "inherit", env });
  outputs.push(out);
}

console.log(`Rendered ${outputs.length} diagram(s) (${width}x${height} @${scale}x):`);
for (const o of outputs) console.log(`  ${o}`);
