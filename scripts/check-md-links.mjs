#!/usr/bin/env node
/**
 * Markdown link check — verify internal relative-path links resolve to existing files.
 *
 * Usage:
 *   node scripts/check-md-links.mjs            # human-readable output
 *   node scripts/check-md-links.mjs --json    # machine-readable JSON
 *
 * Exit codes:
 *   0 = no broken links
 *   1 = broken links found (or unexpected error)
 *
 * Scans all *.md / *.markdown / *.mdx under CWD, skipping node_modules / dist
 * / .git / archive / test-results. Skips urls containing '=' or ',' (template
 * placeholders like `slug="foo"` or `confidence:N/10`).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const jsonMode = process.argv.includes("--json");
const exts = [".md", ".markdown", ".mdx"];
const skipDirs = ["node_modules", "dist", ".git", "archive", "test-results"];

function findMarkdown(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findMarkdown(full));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

const LINK_RE = /\[[^\]]+\]\(([^)]+)\)/g;
const PLACEHOLDER_CHARS = ["=", ","];

function isInternalLink(url) {
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("#") || u.startsWith("mailto:")) return false;
  if (PLACEHOLDER_CHARS.some((c) => u.includes(c))) return false;
  // Template placeholders: word:anything-without-extension-like-pattern (e.g. confidence:N/10, severity:N)
  if (/^[A-Za-z_][\w-]*:[^/]*$/.test(u) || /^[A-Za-z_][\w-]*:[^/]*\/\d+$/.test(u)) return false;
  return true;
}

function* walkLinks(text) {
  for (const m of text.matchAll(LINK_RE)) {
    yield m[1].trim();
  }
}

const files = findMarkdown(ROOT);
const broken = [];

for (const f of files) {
  let text;
  try {
    text = fs.readFileSync(f, "utf8");
  } catch (e) {
    continue;
  }
  for (const url of walkLinks(text)) {
    if (!isInternalLink(url)) continue;
    const [pathPart, anchor] = url.split("#");
    const cleanPath = pathPart.split("?")[0];
    if (!cleanPath) continue;
    const abs = path.resolve(path.dirname(f), cleanPath);
    let status = "OK";
    if (!fs.existsSync(abs)) {
      status = "MISSING";
    } else if (anchor && fs.statSync(abs).isFile()) {
      const content = fs.readFileSync(abs, "utf8");
      const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:^|\\s|\\(#{1,2})${escaped}\\b`);
      if (!re.test(content)) status = `ANCHOR_MISSING (#${anchor})`;
    }
    if (status !== "OK") {
      broken.push({ file: path.relative(ROOT, f), url, status });
    }
  }
}

const summary = { files: files.length, broken: broken.length };

if (jsonMode) {
  process.stdout.write(JSON.stringify({ summary, broken }, null, 2) + "\n");
} else {
  process.stdout.write(`Scanned ${summary.files} files, ${summary.broken} broken\n`);
  if (broken.length === 0) {
    process.stdout.write("✓ No broken internal links\n");
  } else {
    process.stdout.write("\nBROKEN LINKS:\n");
    for (const { file, url, status } of broken) {
      process.stdout.write(`  ${file}  ${status}  ${url}\n`);
    }
  }
}

process.exit(broken.length > 0 ? 1 : 0);