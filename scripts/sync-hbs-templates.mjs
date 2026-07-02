#!/usr/bin/env node
/**
 * Copy phase Handlebars templates into templates/ for npm publish.
 * Canonical dev path remains src/templates/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src", "templates");
const dest = path.join(root, "templates");

for (const name of fs.readdirSync(src)) {
  if (!name.endsWith(".hbs")) continue;
  fs.copyFileSync(path.join(src, name), path.join(dest, name));
}

console.log("sync-hbs-templates: copied *.hbs → templates/");
