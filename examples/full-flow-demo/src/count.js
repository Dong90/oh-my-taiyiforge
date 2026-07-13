import { readdirSync } from "node:fs";
import { join } from "node:path";

export function countFiles(dirs) {
  const result = {};
  for (const dir of dirs) {
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
      result[dir] = files.length;
    } catch (err) {
      result[dir] = 0; // EACCES / ENOENT → 0
    }
  }
  return result;
}
