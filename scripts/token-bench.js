// Token benchmark: measure artifact file sizes across TaiyiForge phases
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SLUG = "token-bench-micro";
const ROOT = path.resolve(__dirname, "..");
const CHANGE_DIR = path.join(ROOT, ".taiyi", "changes", SLUG);

function measure(dir) {
  let total = 0;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (!f.endsWith(".md")) continue;
    const fp = path.join(dir, f);
    const chars = fs.readFileSync(fp, "utf-8").length;
    const tokens = Math.ceil(chars / 4);
    total += tokens;
    console.log(`  ${f}: ${chars}c = ${tokens}t`);
  }
  // hidden artifacts
  for (const hidden of [".dev-complete", ".integration-complete"]) {
    const fp = path.join(dir, hidden);
    if (fs.existsSync(fp)) {
      const chars = fs.readFileSync(fp, "utf-8").length;
      const tokens = Math.ceil(chars / 4);
      total += tokens;
      console.log(`  ${hidden}: ${chars}c = ${tokens}t`);
    }
  }
  return total;
}

console.log(`=== ${SLUG} ===`);
console.log("Artifact files:");
const t = measure(CHANGE_DIR);
console.log(`Total artifact tokens: ${t}`);
