import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import Handlebars from "handlebars";

export function getHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function persistAndRender(
  stage: string,
  data: Record<string, unknown>,
  outputDir: string,
  templatesDir: string
): Promise<void> {
  // 1. Write JSON state (source of truth)
  const jsonPath = path.join(outputDir, `${stage}.json`);
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));

  // 2. Render Markdown view
  const tplPath = path.join(templatesDir, `${stage}.hbs`);
  let tplContent: string;
  try {
    tplContent = await fs.readFile(tplPath, "utf-8");
  } catch (e) {
    throw new Error(`Template not found for stage "${stage}": ${tplPath}`);
  }
  const markdown = Handlebars.compile(tplContent)(data);
  const mdPath = path.join(outputDir, `${stage.toUpperCase()}.md`);
  await fs.writeFile(mdPath, markdown);

  // 3. Write hash snapshot
  const snapshotDir = path.join(outputDir, ".taiyi", "snapshots");
  await fs.mkdir(snapshotDir, { recursive: true });
  const hashPath = path.join(snapshotDir, `${stage}.hash`);
  await fs.writeFile(hashPath, getHash(markdown));
}
