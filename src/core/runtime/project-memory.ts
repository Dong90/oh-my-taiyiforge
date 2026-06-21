import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type ProjectMemoryFact = {
  id: string;
  category: "pattern" | "decision" | "constraint" | "note";
  text: string;
  source?: string;
  updatedAt: string;
};

export type ProjectMemoryFile = {
  version: 1;
  facts: ProjectMemoryFact[];
  updatedAt: string;
};

const FILE = "project-memory.json";

export function projectMemoryPath(taiyiRoot: string): string {
  return path.join(taiyiRoot, FILE);
}

export function readProjectMemory(taiyiRoot: string): ProjectMemoryFile {
  const p = projectMemoryPath(taiyiRoot);
  if (!fs.existsSync(p)) {
    return { version: 1, facts: [], updatedAt: new Date().toISOString() };
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as ProjectMemoryFile;
  } catch {
    return { version: 1, facts: [], updatedAt: new Date().toISOString() };
  }
}

export function writeProjectMemory(taiyiRoot: string, data: ProjectMemoryFile): void {
  const next: ProjectMemoryFile = {
    ...data,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  if (!fs.existsSync(taiyiRoot)) fs.mkdirSync(taiyiRoot, { recursive: true });
  fs.writeFileSync(projectMemoryPath(taiyiRoot), `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function rememberFact(
  taiyiRoot: string,
  fact: Omit<ProjectMemoryFact, "id" | "updatedAt"> & { id?: string },
): ProjectMemoryFact {
  const mem = readProjectMemory(taiyiRoot);
  const entry: ProjectMemoryFact = {
    id: fact.id ?? `f-${crypto.randomUUID()}`,
    category: fact.category,
    text: fact.text,
    source: fact.source,
    updatedAt: new Date().toISOString(),
  };
  const idx = mem.facts.findIndex((f) => f.id === entry.id);
  if (idx >= 0) mem.facts[idx] = entry;
  else mem.facts.push(entry);
  writeProjectMemory(taiyiRoot, mem);
  return entry;
}

export function formatProjectMemoryPlain(taiyiRoot: string, limit = 20): string {
  const mem = readProjectMemory(taiyiRoot);
  const lines = [`Project memory · ${mem.facts.length} 条（.taiyi/project-memory.json）`];
  for (const f of mem.facts.slice(-limit)) {
    lines.push(`  [${f.category}] ${f.text}${f.source ? ` (${f.source})` : ""}`);
  }
  if (mem.facts.length === 0) {
    lines.push("  （空）用法: /taiyi:remember <note> 或 taiyi remember …");
  }
  return lines.join("\n");
}
