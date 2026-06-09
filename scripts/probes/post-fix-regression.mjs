#!/usr/bin/env node
/**
 * SUITE-postfix — 回归探测（对齐 docs/taiyi/probe-triage.md）
 * 用法：npm run build && node scripts/probes/post-fix-regression.mjs
 * 报告：.taiyi/post-fix-regression.json
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const pkgRoot = path.dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));
const workspace = process.cwd();
const taiyiJs = path.join(pkgRoot, "dist/cli/taiyi.js");
const forgeSh = path.join(workspace, "scripts/taiyi-forge.sh");
const upstreamSh = path.join(pkgRoot, "scripts/taiyi-forge.sh");

const results = [];
let failed = 0;

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: pkgRoot, ...opts.env },
  });
  return {
    code: r.status ?? 1,
    out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim(),
  };
}

function runCli(argv) {
  return run(process.execPath, [taiyiJs, ...argv]);
}

function runBash(script, argv) {
  return run("bash", [script, ...argv]);
}

function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${id}${detail ? ` — ${detail}` : ""}`);
}

function expectCode(label, r, expected) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  const ok = allowed.includes(r.code);
  check(label, ok, `exit ${r.code} (expect ${allowed.join("|")})`);
  return ok;
}

// --- smoke-reset：BY DESIGN，非三通道 parity ---
const cliReset = runCli(["smoke-reset"]);
expectCode("cmd-smoke-reset-cli", cliReset, 2);

if (fs.existsSync(forgeSh)) {
  const consumerReset = runBash(forgeSh, ["smoke-reset"]);
  expectCode("cmd-smoke-reset-consumer", consumerReset, 0);
} else {
  check("cmd-smoke-reset-consumer", true, "skip — no scripts/taiyi-forge.sh");
}

const upstreamReset = runBash(upstreamSh, ["smoke-reset"]);
expectCode("cmd-smoke-reset-upstream", upstreamReset, 0);

// --- run / walkthrough：允许偶发 1，不要求 cli===consumer 强 parity ---
const rwCli = runCli(["run"]);
const rwConsumer = fs.existsSync(forgeSh) ? runBash(forgeSh, ["run"]) : rwCli;
expectCode("run-cli", rwCli, [0, 1]);
if (fs.existsSync(forgeSh)) {
  expectCode("run-consumer", rwConsumer, [0, 1]);
  const parityOk =
    rwCli.code === rwConsumer.code || (rwCli.code === 0 && rwConsumer.code === 0);
  check(
    "run-cli-parity",
    parityOk,
    `cli=${rwCli.code} consumer=${rwConsumer.code} (both 0 or equal)`,
  );
}

// --- archive 幂等（若存在已完成 slug 可环境变量覆盖）---
const archiveSlug = process.env.TAIYI_PROBE_ARCHIVE_SLUG;
if (archiveSlug) {
  const a1 = fs.existsSync(forgeSh)
    ? runBash(forgeSh, ["archive", archiveSlug])
    : runCli(["archive", archiveSlug]);
  const a2 = fs.existsSync(forgeSh)
    ? runBash(forgeSh, ["archive", archiveSlug])
    : runCli(["archive", archiveSlug]);
  expectCode("archive-idempotent-1", a1, 0);
  expectCode("archive-idempotent-2", a2, 0);
  check(
    "archive-idempotent-text",
    /幂等|no-op|已归档/i.test(a2.out),
    a2.out.slice(0, 120),
  );
}

const report = {
  generatedAt: new Date().toISOString(),
  version: JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8")).version,
  failed,
  passed: results.filter((r) => r.ok).length,
  total: results.length,
  results,
};
const outDir = path.join(workspace, ".taiyi");
fs.mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, "post-fix-regression.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\n报告: ${reportPath} — ${report.passed}/${report.total} 通过`);
process.exit(failed > 0 ? 1 : 0);
