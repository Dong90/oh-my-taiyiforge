import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve oh-my-taiyiforge package root from a module URL (src or dist). */
export function resolvePackageRoot(fromModuleUrl: string): string {
  const dir = path.dirname(fileURLToPath(fromModuleUrl));
  const markers = [
    `${path.sep}dist${path.sep}plugin`,
    `${path.sep}dist${path.sep}cli`,
    `${path.sep}dist${path.sep}core`,
    `${path.sep}src${path.sep}core`,
    `${path.sep}src${path.sep}plugin`,
    `${path.sep}dist${path.sep}install`,
    `${path.sep}src${path.sep}install`,
    `${path.sep}dist${path.sep}integrations`,
    `${path.sep}src${path.sep}integrations`,
    `${path.sep}dist${path.sep}mcp`,
    `${path.sep}src${path.sep}mcp`,
    `${path.sep}tests`,
  ];
  for (const m of markers) {
    if (dir.endsWith(m)) return path.join(dir, "..", "..");
  }
  if (dir.endsWith(`${path.sep}tests`)) return path.join(dir, "..");
  return dir;
}

export function resolveTemplatesDir(fromModuleUrl: string): string {
  return path.join(resolvePackageRoot(fromModuleUrl), "templates");
}

/** Handlebars phase templates — dev: src/templates; npm may ship under templates/*.hbs */
export function resolveHbsTemplatesDir(fromModuleUrl: string): string {
  const root = resolvePackageRoot(fromModuleUrl);
  const candidates = [
    path.join(root, "src", "templates"),
    path.join(root, "templates"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "change.hbs"))) return dir;
  }
  return candidates[0];
}
