import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "../types.js";
import { estimateTokens } from "./estimate.js";
import { recordTokenUsage } from "./usage-store.js";
import { scanArtifactTokens } from "./scan-artifacts.js";

export type CompressResult = {
  outputPath: string;
  inputTokens: number;
  outputTokens: number;
  savedTokens: number;
};

function truncateSection(body: string, maxChars: number): string {
  const t = body.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars).trimEnd()}…（已截断，完整见原文件）`;
}

function compactMarkdown(raw: string, maxSectionChars: number): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  let currentHeader = "";
  let buffer: string[] = [];

  const flush = () => {
    if (!currentHeader && buffer.length === 0) return;
    const body = buffer.join("\n").trim();
    if (currentHeader) out.push(currentHeader);
    if (body) out.push(truncateSection(body, maxSectionChars));
    out.push("");
    buffer = [];
  };

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      flush();
      currentHeader = line;
    } else {
      buffer.push(line);
    }
  }
  flush();
  return out.join("\n").trim();
}

export function compressChangeContext(
  changeDir: string,
  options?: {
    maxSectionChars?: number;
    slug?: string;
    phase?: PhaseId;
    record?: boolean;
    costPerMillion?: number;
  },
): CompressResult {
  const maxSectionChars = options?.maxSectionChars ?? 600;
  const scan = scanArtifactTokens(changeDir);
  const inputTokens = scan.total;

  const parts: string[] = [
    "# CONTEXT-COMPACT",
    "",
    "> 自动压缩摘要 · 优先读此文件以降低 Token；细节见各工件原文件。",
    "",
  ];

  for (const { name } of scan.files) {
    if (name === "CONTEXT-COMPACT.md") continue;
    const raw = fs.readFileSync(path.join(changeDir, name), "utf8");
    parts.push(`## ${name}`);
    parts.push(compactMarkdown(raw, maxSectionChars));
    parts.push("");
  }

  const content = parts.join("\n").trimEnd() + "\n";
  const outputPath = path.join(changeDir, "CONTEXT-COMPACT.md");
  fs.writeFileSync(outputPath, content, "utf8");

  const outputTokens = estimateTokens(content);
  const savedTokens = Math.max(0, inputTokens - outputTokens);

  if (options?.record && options.slug) {
    recordTokenUsage(
      changeDir,
      options.slug,
      {
        phase: options.phase ?? "change",
        kind: "compress",
        tokens: outputTokens,
        label: `saved ~${savedTokens}`,
      },
      options.costPerMillion ?? 3,
    );
  }

  return { outputPath, inputTokens, outputTokens, savedTokens };
}
