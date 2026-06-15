#!/usr/bin/env node
/**
 * 分层验证入口：尽可能全自动（L0–L3 + L4 无头契约）
 * 用法（仓库根）: node examples/verification-suite/run-all.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function run(label, cmd, args, env = process.env) {
  console.log(`\n══ ${label} ══`);
  const r = spawnSync(cmd, args, { cwd: repo, stdio: "inherit", env });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

run("L0 build", "npm", ["run", "build"]);
run("L0–L3 + L4 无头契约（全量 vitest）", "npm", ["test"]);
run("L1 examples 就地落盘", "node", ["examples/full-flow-demo/scripts/run-inplace-verify.mjs"]);

console.log("\n→ 可选 browser E2E（/taiyi:e2e 等价）:");
console.log("  /taiyi:browser-smoke  →  scripts/taiyi-forge.sh browser-smoke");
console.log("  node examples/browser-e2e-smoke/run-verify.mjs");
console.log("  npm test -- tests/browser-e2e-smoke.test.ts");

console.log("\n✓ 自动化验证完成（419+ 项 vitest + 就地落盘）");
console.log("→ 可选真机: TAIYI_VERIFY_REAL_INSTALL=1 npm test -- tests/post-install-smoke.test.ts");
console.log("→ 仅剩人工: IDE 内 Hook 触发时机、LLM 工件内容质量（抽样 UAT）");
