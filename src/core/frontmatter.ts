import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

export type PhaseMeta = {
  phase: string;
  skill: string;
  gate: "human" | "auto";
  produces: string;
  upstream: string[];
  downstream: string[];
  est: string;
  cplx: string;
};

/** Extract YAML frontmatter from a generated Markdown file. */
export function extractFrontmatter(md: string): PhaseMeta | null {
  const m = md.match(FRONTMATTER_RE);
  if (!m) return null;
  const raw = m[1];
  const meta: Record<string, unknown> = {};
  for (const line of raw.split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    let value: unknown = line.slice(colon + 1).trim();
    // Parse arrays: [a, b, c]
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value.slice(1, -1).split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    meta[key] = value;
  }
  if (!meta.phase) return null;
  return meta as unknown as PhaseMeta;
}

/** Strip frontmatter from Markdown content (for human display). */
export function stripFrontmatter(md: string): string {
  return md.replace(FRONTMATTER_RE, "").trimStart();
}

/** Build YAML frontmatter block for a phase. */
export function buildFrontmatter(phase: string, skill: string, gate: "human" | "auto", produces: string, upstream: string[], downstream: string[]): string {
  const lines = ["---"];
  lines.push(`phase: ${phase}`);
  lines.push(`skill: ${skill}`);
  lines.push(`gate: ${gate}`);
  lines.push(`produces: ${produces}`);
  lines.push(`upstream: [${upstream.join(", ")}]`);
  lines.push(`downstream: [${downstream.join(", ")}]`);
  lines.push("---");
  return lines.join("\n");
}

// ── CLI: embed frontmatter into all generated MD files in a change dir ──
const PHASES: { phase: string; skill: string; gate: "human" | "auto"; produces: string; upstream: string[]; downstream: string[] }[] = [
  { phase: "change", skill: "taiyi-change", gate: "human", produces: "CHANGE.md", upstream: [], downstream: ["requirement"] },
  { phase: "requirement", skill: "taiyi-requirement", gate: "auto", produces: "REQUIREMENT.md", upstream: ["change"], downstream: ["design", "ui-design"] },
  { phase: "design", skill: "taiyi-design", gate: "human", produces: "DESIGN.md", upstream: ["requirement"], downstream: ["ui-design", "task"] },
  { phase: "ui-design", skill: "taiyi-ui-design", gate: "auto", produces: "UI-DESIGN.md", upstream: ["design", "requirement"], downstream: ["task", "dev"] },
  { phase: "task", skill: "taiyi-task", gate: "auto", produces: "TASK.md", upstream: ["design", "requirement"], downstream: ["dev", "test"] },
  { phase: "test", skill: "taiyi-test", gate: "auto", produces: "TEST.md", upstream: ["task", "dev"], downstream: ["review"] },
  { phase: "review", skill: "taiyi-review", gate: "human", produces: "REVIEW.md", upstream: ["test", "dev"], downstream: ["integration"] },
  { phase: "integration", skill: "taiyi-integration", gate: "auto", produces: "INTEGRATION.md", upstream: ["review", "dev", "test"], downstream: [] },
];

/** Inject frontmatter into all generated MD files in a change directory. */
export function injectFrontmatter(changeDir: string): { ok: boolean; injected: string[]; error?: string } {
  const injected: string[] = [];
  try {
    for (const p of PHASES) {
      const fp = path.join(changeDir, p.produces);
      if (!fs.existsSync(fp)) continue;
      const content = fs.readFileSync(fp, "utf8");
      // Skip if already has frontmatter
      if (FRONTMATTER_RE.test(content)) continue;
      const fm = buildFrontmatter(p.phase, p.skill, p.gate, p.produces, p.upstream, p.downstream);
      fs.writeFileSync(fp, fm + "\n" + content, "utf8");
      injected.push(p.produces);
    }
    return { ok: true, injected };
  } catch (e) {
    return { ok: false, injected, error: e instanceof Error ? e.message : String(e) };
  }
}

// CLI entry
const args = process.argv.slice(2);
if (args[0] === "inject") {
  const dir = args[1];
  if (!dir) { console.error("Usage: node frontmatter.mjs inject <change-dir>"); process.exit(1); }
  const r = injectFrontmatter(dir);
  console.log(r.ok ? `Injected frontmatter into ${r.injected.length} files` : `Error: ${r.error}`);
  process.exit(r.ok ? 0 : 1);
} else if (args[0] === "extract") {
  const file = args[1];
  if (!file) { console.error("Usage: node frontmatter.mjs extract <file>"); process.exit(1); }
  const md = fs.readFileSync(file, "utf8");
  const meta = extractFrontmatter(md);
  console.log(meta ? JSON.stringify(meta, null, 2) : "No frontmatter found");
} else {
  console.log("Usage:\n  node frontmatter.mjs inject <change-dir>\n  node frontmatter.mjs extract <file>");
}

