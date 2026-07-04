/** Detect unresolved template placeholders in rendered hbs output.
 *  Used by tryPromoteSeedArtifact and validateArtifactFile to block
 *  auto-promotion and mark quality scores when content is still skeletal.
 */
import type { PhaseId } from "./types.js";

/** Patterns that indicate a section was rendered from hbs but never edited. */
export const PLACEHOLDER_PATTERNS: RegExp[] = [
  // Chinese template fillers (change.hbs / design.hbs etc.)
  /_在此列出[^_]{0,30}_/,
  /_本次为测试[^_]{0,20}_/,
  /_待补充[^_]{0,20}_/,
  /_待定_/,
  /_待估_/,
  /_待选定_/,
  /_write_files 列表_/,
  /_结合业务说明_/,
  /_3 个参考产品_/,
  /_N_min\b/,
  // Decision / Reason placeholders
  /\[待决策\]/,
  /\[待定\]/,
  /\[理由\]/,
  /\[填写[^\]]{0,30}\]/,
  /\[TODO[^\]]{0,30}\]/i,
  /\[TODO:/,
  /\bTODO\b/,
  /-- TODO/,
  /\[Minimal\s/,
  // Template-specific prompt placeholders (change.hbs / design.hbs)
  /\[有没有完全不同的方案更值得做/,
  /\[变更目的和价值\]/,
  /\[重新定义问题会怎样\]/,
  /\[有无现成方案\]/,
  /\[技术方案概述\]/,
  /\[待补充验证命令\]/,
  /\[涉及页面\/组件\]/,
  /\[精确到命令\]/,
  /\[理想结果\]/,
  /\[量化条件\]/,
  /\[填写理由\]/,
  /\[X人天\]/,
  /_待补充/,
  /\[N\]\/10/,
  /\[N天\/小时\]/,
  /\[deployed\/pending\]/,
  /0\.0\.0/,
  // English variants (some hbs templates use these)
  /\[TBD\]/,
  /\[FILL[^\]]{0,30}\]/i,
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

const SHAVE_PATTERN = /_([^_]+)_/g;

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

/** Counts placeholder occurrences in the rendered markdown. */
export function countPlaceholders(content: string): string[] {
  const found: string[] = [];
  for (const re of PLACEHOLDER_PATTERNS) {
    const match = re.exec(content);
    if (match) found.push(match[0]);
    re.lastIndex = 0; // reset global regex
  }
  return found;
}

/** Whether the markdown content still contains any known unresolved placeholder. */
export function hasPlaceholders(content: string): boolean {
  return PLACEHOLDER_PATTERNS.some((re) => re.test(content));
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
    if (!m) continue; // section heading not found
    const idx = m.index;
    const section = raw.slice(idx + m[0].length, idx + Math.min(raw.length, idx + 500));
    // replace underline-style placeholders, leaving the rest
    const cleaned = section
      .replace(SHAVE_PATTERN, "")
      .replace(/\[待[^\]]{0,10}\]/g, "")
      .replace(/\[填写[^\]]{0,30}\]/g, "")
      .replace(/\[TODO[^\]]{0,30}\]/gi, "")
      .replace(/\[TBD\]/gi, "")
      .replace(/\[FILL[^\]]{0,30}\]/gi, "")
      .replace(/<!--\s*FILL-ME:\s*-->/g, "")
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
