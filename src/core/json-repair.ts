/**
 * JSON Auto-Repair — fix common LLM-generated JSON errors.
 * Handles: trailing commas, missing closing braces/brackets.
 * Falls back gracefully for irreparable input.
 */

export type RepairResult = {
  ok: boolean;
  repaired?: string;
  error?: string;
};

/** Repair common JSON syntax errors. Returns the repaired JSON or error. */
export function tryRepairJson(raw: string): RepairResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Empty input" };
  if (trimmed.length < 2) return { ok: false, error: "Input too short" };

  // Try as-is first (most common case)
  try {
    JSON.parse(trimmed);
    return { ok: true, repaired: trimmed };
  } catch (e) {
    // Continue with repairs
  }

  let repaired = trimmed;

  // Step 1: Remove trailing commas before closing braces/brackets
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");

  // Step 2: Balance braces and brackets
  repaired = balanceBraces(repaired);

  // Try again
  try {
    JSON.parse(repaired);
    return { ok: true, repaired };
  } catch (e) {
    return { ok: false, error: `Irreparable JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function balanceBraces(json: string): string {
  let depth = 0;
  let bracketDepth = 0;
  let inString = false;
  let escape = false;

  for (const ch of json) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (ch === "[") bracketDepth++;
    if (ch === "]") bracketDepth--;
  }

  // Add missing closing characters (innermost first: brackets before braces)
  if (bracketDepth > 0) json += "]".repeat(bracketDepth);
  if (depth > 0) json += "}".repeat(depth);
  return json;
}
