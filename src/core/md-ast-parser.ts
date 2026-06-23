/**
 * Markdown AST Parser — robust section extraction using remark (unified).
 * Replaces regex-based extraction with AST traversal for LLM-proof parsing.
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

function parse(md: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(md) as Root;
}

/**
 * Extract the text content of a section under a given heading.
 * Handles any heading depth (## or ###), Chinese/English text, and special characters.
 */
export function extractSectionAst(
  markdown: string,
  headingText: string,
  maxLines = 5,
): string {
  const tree = parse(markdown) as Root;
  const normalizedTarget = headingText.toLowerCase().trim();
  let capturing = false;
  const lines: string[] = [];

  for (const node of tree.children) {
    if (node.type === "heading") {
      const text = extractNodeText(node).toLowerCase().trim();
      // Match: exact heading text, or heading text after "Step N: " prefix
      const matches =
        text === normalizedTarget ||
        text.endsWith(": " + normalizedTarget) ||
        text.endsWith(" " + normalizedTarget);
      if (capturing && !matches) break; // next heading → stop
      capturing = matches;
      continue;
    }
    if (capturing && lines.length < maxLines) {
      const text = extractNodeText(node).trim();
      if (text) lines.push(text);
    }
  }
  return lines.join("\n");
}

/** Extract title from H1 heading, stripping any phase prefix. */
export function extractTitleAst(markdown: string): string {
  const tree = parse(markdown) as Root;
  for (const node of tree.children) {
    if (node.type === "heading" && node.depth === 1) {
      const text = extractNodeText(node).trim();
      return text.replace(/^(CHANGE|REQUIREMENT|DESIGN|UI-DESIGN|TASK|TEST|REVIEW|INTEGRATION)\s*[:：]\s*/i, "").trim();
    }
  }
  return "";
}

/** Extract checkbox items from a markdown document. */
export function extractCheckboxesAst(markdown: string, maxItems = 6): string[] {
  const tree = parse(markdown) as Root;
  const items: string[] = [];
  for (const node of tree.children) {
    if (node.type === "list") {
      for (const item of node.children) {
        if (item.type === "listItem" && items.length < maxItems) {
          // Only extract actual GFM checkboxes (checked is null for regular list items)
          if (item.checked === null || item.checked === undefined) continue;
          const text = extractNodeText(item).trim();
          items.push(`${item.checked ? "✓" : "○"} ${text}`);
        }
      }
    }
  }
  return items;
}

function extractNodeText(node: unknown): string {
  if (typeof node === "string") return node;
  const n = node as Record<string, unknown>;
  if (n?.type === "text" || n?.type === "inlineCode") {
    return String(n.value ?? "");
  }
  if (n?.children && Array.isArray(n.children)) {
    return (n.children as unknown[]).map(c => extractNodeText(c)).join("");
  }
  if (n?.value && typeof n.value === "string") return n.value;
  return "";
}
