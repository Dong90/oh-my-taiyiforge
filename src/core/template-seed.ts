import fs from "node:fs";
import path from "node:path";
import { listPhases } from "./phase-registry.js";

export type SeedVars = {
  slug: string;
  title?: string;
};

function renderTemplate(raw: string, vars: SeedVars): string {
  const title = vars.title ?? vars.slug.replace(/-/g, " ");
  return raw.replace(/\{\{title\}\}/g, title).replace(/\{\{slug\}\}/g, vars.slug);
}

/** Copy markdown phase templates into change dir (skip existing files). */
export function seedChangeTemplates(
  changeDir: string,
  templatesDir: string,
  vars: SeedVars,
): string[] {
  if (!fs.existsSync(templatesDir)) return [];

  const seeded: string[] = [];
  for (const phase of listPhases()) {
    if (phase.kind !== "markdown") continue;
    const templateFile = path.join(templatesDir, phase.artifact);
    if (!fs.existsSync(templateFile)) continue;

    const dest = path.join(changeDir, phase.artifact);
    if (fs.existsSync(dest)) continue;

    const raw = fs.readFileSync(templateFile, "utf8");
    fs.writeFileSync(dest, renderTemplate(raw, vars), "utf8");
    seeded.push(phase.artifact);
  }
  return seeded;
}
