import fs from "node:fs";
import path from "node:path";

export function logActivity(taiyiRoot: string, entry: Record<string, unknown>) {
  const logPath = path.join(taiyiRoot, "activity.jsonl");
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  fs.appendFileSync(logPath, line, "utf8");
}
