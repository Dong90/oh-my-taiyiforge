/** LLM-generated manifest integration.
 *  Accepts pre-generated manifest JSON from chat Agent (not subprocess LLM).
 *  The chat session has native LLM capability; engine only parses + validates. */

import fs from "node:fs";
import path from "node:path";
import { getLogger } from "./logger.js";
import type { ModuleManifestEntry } from "./template-engine.js";
import type { ChangeProfile } from "./types.js";
import type { DecomposedChange } from "./auto-plan.js";

const log = getLogger();

export type LlmDecomposedResult = {
  changes: DecomposedChange[];
  manifests: Record<string, ModuleManifestEntry[]>;
  ok: boolean;
  error?: string;
};

/** Parse Agent-generated manifest JSON file or string. */
export function parseManifestInput(input: string): LlmDecomposedResult {
  let json: string;
  if (input.startsWith("{") || input.startsWith("```") || input.startsWith("[")) json = input;
  else if (fs.existsSync(input)) json = fs.readFileSync(input, "utf8");
  else return { changes: [], manifests: {}, ok: false, error: "Not JSON, file not found: " + input };
  return parseDecomposeResult(json);
}

function parseDecomposeResult(json: string): LlmDecomposedResult {
  let cleaned = json;
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1];
  cleaned = cleaned.trim();

  let data: any;
  try { data = JSON.parse(cleaned); }
  catch { return { changes: [], manifests: {}, ok: false, error: "JSON parse error" }; }

  if (!Array.isArray(data.changes)) {
    return { changes: [], manifests: {}, ok: false, error: "Missing 'changes' array" };
  }

  const changes: DecomposedChange[] = [];
  const manifests: Record<string, ModuleManifestEntry[]> = {};

  for (const c of data.changes) {
    changes.push({
      slug: c.slug ?? c.title?.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40) ?? "auto-change",
      title: c.title ?? "Unknown",
      profile: (c.profile ?? "lite") as ChangeProfile,
      motivation: c.motivation ?? `自动生成: ${c.title}`,
      description: c.description ?? "",
      priority: c.priority ?? "P2",
      dependsOn: c.dependsOn ?? [],
    });

    if (Array.isArray(c.manifest)) {
      const manifest: ModuleManifestEntry[] = c.manifest.map((m: any) => ({
        id: m.id ?? `M${Math.random().toString(36).slice(2, 6)}`,
        file: m.file ?? "unknown.py",
        pattern: m.pattern ?? "Service",
        class_name: m.class_name ?? "Unknown",
        extends: m.extends || undefined,
        depends_on: m.depends_on ?? [],
        methods: (m.methods ?? []).map((mt: any) => ({
          name: mt.name ?? "unknown",
          return_type: mt.return_type ?? "str",
          is_abstract: mt.is_abstract ?? false,
        })),
        prompt_style: m.prompt_style || undefined,
        constraints: m.constraints ?? [],
        source_quote: m.source_quote ?? m.source_quote,
        confidence_score: m.confidence_score ?? m.confidence_score,
        extension_metadata: m.extension_metadata ?? m.extension_metadata,
      }));
      manifests[changes[changes.length - 1].slug] = manifest;
    }
  }

  return { changes, manifests, ok: true };
}
