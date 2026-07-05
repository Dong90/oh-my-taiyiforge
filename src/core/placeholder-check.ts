/** Detect unresolved template placeholders in rendered hbs output.
 *  Used by tryPromoteSeedArtifact and validateArtifactFile to block
 *  auto-promotion and mark quality scores when content is still skeletal.
 *
 *  ─────────── Convention ───────────
 *  HBS fallback placeholders use either:
 *    `_中文描述_`    — underline-wrapped Chinese  (e.g. `_待定_`, `_现状_`)
 *    `[中文描述]`    — bracket-wrapped Chinese     (e.g. `[量化]`, `[性能指标]`)
 *    `[TODO]/[TBD]/[FILL]` — English action keywords
 *
 *  All caught by 5 generic patterns in PLACEHOLDER_PATTERNS (below).
 *
 *  ─────────── Exclusions (intentional) ───────────
 *  - `<!-- …  -->` HTML comments: stripped before detection
 *    (the hbs templates use comments as inline Skill instructions).
 *  - `` ```…``` `` fenced code blocks: stripped before detection
 *    because Mermaid diagrams and code samples legitimately contain
 *    bracket/underline patterns like `[实现 hello]` or `_未提供_`
 *    that are *not* placeholders. Without this, every mermaid node
 *    label would trigger false positives, blocking the task phase.
 *  - English-only `_hello world_`: caught-as-content (no Chinese),
 *    italic formatting preserved.
 *
 *  Module-local helpers:
 *    stripCodeBlocks(body)  — remove all fenced code blocks.
 *    stripComments(body)    — remove HTML comments (kept separate
 *    here so callers can apply different orderings if needed).
 *
 *  See docs/taiyi/quality-gate.md for the broader design rationale.
 */
import type { PhaseId } from "./types.js";

/** Strip fenced code blocks (``` ... ```) — used so that placeholders inside
 *  code samples (especially Mermaid labels like `[实现 hello]`) don't trigger
 *  false positives during quality checks. Mirrored by validator-side
 *  stripComments() so HTML-comment placeholders are also ignored there.
 *
 *  Code blocks are uniformly skipped regardless of language tag
 *  (mermaid / sql / bash / shell / unspecified).  Justification: any
 *  square-bracket text inside a code block is *payload* for that
 *  language's parser, not markdown content for TaiyiForge to fill in.
 */
function stripCodeBlocks(body: string): string {
  return body.replace(/```[\s\S]*?```/g, "").replace(/~~~\n[\s\S]*?\n~~~/g, "");
}

/** Patterns that indicate a section was rendered from hbs but never edited. */
export const PLACEHOLDER_PATTERNS: RegExp[] = [
  // Underline placeholders — Chinese start (catches _待定_ / _现状_ / _在此列出..._ / _待补充..._)
  /_[\u4e00-\u9fff][^_]+_/,
  // Underline placeholders — numeric or abbreviation start (_N_min / _3 个..._ / _CI/CD_)
  /_(?:\d+|N\/A|CI\/CD)[^_]*_/,
  // Bracket placeholders — Chinese start (catches [量化] / [步骤] / [性能指标] / [模块名] etc.)
  /\[[\u4e00-\u9fff][^\]]{0,50}\]/,
  // Bracket placeholders — English action keywords ([TODO] / [TBD] / [FILL])
  /\[(?:TODO|TBD|FILL)[^\]]{0,30}\]/i,
  // HTML comment fill-me
  /<!--\s*FILL-ME:\s*-->/,
];

/** Sections that must exist AND contain non-placeholder content to count as "filled". */
const MANDATORY_SECTION_HEADINGS: Record<string, RegExp[]> = {
  // phase -> required heading regexes
  change: [/^#{1,3}\s*(motivation|problem\s*statement|scope|success\s*criteria)/im],
  requirement: [/^#{1,3}\s*(user\s*stor|acceptance\s*criteria)/im],
  design: [/^#{1,3}\s*(context|options|decision|reuse\s*analysis|architecture)/im],
  task: [/^#{1,3}\s*(slices|slice\s*table|engineer\s*context)/im],
  test: [/^#{1,3}\s*(test\s*plan|edge\s*cases|regression)/im],
};

/** Strip all known placeholder forms from text for content-length analysis. */
const PLACEHOLDER_STRIP_PATTERNS = [
  /_[\u4e00-\u9fff][^_]+_/g,
  /_(?:\d+|N\/A|CI\/CD)[^_]*_/g,
  /\[[\u4e00-\u9fff][^\]]{1,50}\]/g,
  /\[(?:TODO|TBD|FILL)[^\]]{0,30}\]/gi,
  /<!--\s*FILL-ME:\s*-->/g,
  /_([^_]+)_/g,               // legacy: strip any remaining underline text (already stripped above, safety net)
];

function strippedBodyOf(body: string): string {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[-*]\s+\[ \]\s+/gm, "")
    .replace(/^[-*]\s+\[x\]\s+/gm, "")
    .replace(/^\|.+\|$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/>.*$/gm, "")
    .replace(/^#+\s+.*$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();
}

/** Counts placeholder occurrences in the rendered markdown.
 *  Fenced code blocks (Mermaid, code samples) are stripped first so labels
 *  like `[实现 hello]` or mermaid node ids aren't mistaken for fill-in
 *  placeholders. */
export function countPlaceholders(content: string): string[] {
  const scannable = stripCodeBlocks(content);
  const found: string[] = [];
  for (const re of PLACEHOLDER_PATTERNS) {
    const match = re.exec(scannable);
    if (match) found.push(match[0]);
    re.lastIndex = 0;
  }
  return found;
}

/** Whether the markdown content still contains any known unresolved placeholder. */
export function hasPlaceholders(content: string): boolean {
  const scannable = stripCodeBlocks(content);
  return PLACEHOLDER_PATTERNS.some((re) => re.test(scannable));
}

function stripPlaceholders(text: string): string {
  let out = text;
  for (const re of PLACEHOLDER_STRIP_PATTERNS) {
    out = out.replace(re, "");
  }
  return out;
}

/** For a given phase, estimate whether at least one mandatory section contains
 *  non-placeholder text. Returns true if the body looks like it was actually edited. */
export function hasSubstantiveContent(phaseId: PhaseId, content: string): boolean {
  const required = MANDATORY_SECTION_HEADINGS[String(phaseId)];
  if (!required) {
    // no mandatory section list → fallback to any non-placeholder content
    return strippedBodyOf(content).length > 80;
  }

  // Find each required heading and check the section after it
  const raw = content.replace(/<!--[\s\S]*?-->/g, "");
  for (const re of required) {
    const m = re.exec(raw);
    if (!m) continue;
    const idx = m.index;
    const section = raw.slice(idx + m[0].length, idx + Math.min(raw.length, idx + 500));
    const cleaned = stripPlaceholders(section)
      .replace(/^[-*]\s+\[[ x]\]\s+/gm, "")
      .replace(/^[-*]\s+/gm, "")
      .replace(/`[^`]+`/g, "")
      .replace(/>.*$/gm, "")
      .replace(/^#+\s+.*$/gm, "")
      .replace(/\[REDACTED\]/g, "")
      .trim();
    if (cleaned.length >= 20) return true;
  }
  return false;
}
