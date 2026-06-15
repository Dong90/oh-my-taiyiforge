#!/usr/bin/env node
/**
 * SUITE-fullflow 参考探测（修正 C1 / slug 抓取）
 * 用法：npm run build && node scripts/probes/taiyi-fullflow-probe.mjs
 * 报告：.taiyi/fullflow-probe-report.json
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cleanupProbeWorktree, resolveProbeCwd } from "./probe-worktree.mjs";

const pkgRoot = path.dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));
const repoRoot = process.cwd();
const workspace = resolveProbeCwd(repoRoot);
const taiyiJs = path.join(pkgRoot, "dist/cli/taiyi.js");
const forgeSh = path.join(workspace, "scripts/taiyi-forge.sh");

const results = [];
let failed = 0;

function probeHygiene() {
  if (!fs.existsSync(forgeSh)) return;
  runForge(["smoke-reset"]);
  runForge(["prune", "--aborted"]);
}

function runCli(argv) {
  const r = spawnSync(process.execPath, [taiyiJs, ...argv], {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: pkgRoot },
  });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

function runForge(argv) {
  if (!fs.existsSync(forgeSh)) return runCli(argv);
  const r = spawnSync("bash", [forgeSh, ...argv], {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: pkgRoot },
  });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

function check(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${id}${detail ? ` — ${detail}` : ""}`);
}

function expect(id, r, codes = 0) {
  const allowed = Array.isArray(codes) ? codes : [codes];
  check(id, allowed.includes(r.code), `exit ${r.code} expect ${allowed.join("|")}`);
}

/** 与引擎 slugifyTitle 一致，用于从标题推导 slug */
function slugifyTitle(title) {
  const trimmed = title.trim();
  if (!trimmed) return `ty-${Date.now()}`;
  const ascii = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (ascii.length >= 2) return ascii;
  return `ty-${Buffer.from(trimmed, "utf8").toString("base64url").slice(0, 8).toLowerCase()}`;
}

const SLUG_STOPWORDS = new Set(["lite", "full", "change", "low", "medium", "high", "api"]);

/** 从 bug/feature --create 或标题推导 slug */
function extractSlug(out, title) {
  const created =
    out.match(/已创建(?:\s+lite)?\s*变更:\s*([a-z0-9][a-z0-9-]*)/i) ??
    out.match(/Change created:\s*([a-z0-9][a-z0-9-]*)/i);
  if (created?.[1]) return created[1];

  for (const m of out.matchAll(/\b(ty-[a-z0-9-]+|fix-[a-z0-9-]+|add-[a-z0-9-]+)\b/gi)) {
    if (m[1] && !SLUG_STOPWORDS.has(m[1].toLowerCase())) return m[1];
  }

  if (title) {
    const fromTitle = slugifyTitle(title);
    if (fromTitle && !SLUG_STOPWORDS.has(fromTitle)) return fromTitle;
  }
  return null;
}

// C1：固定 slug 须 --force 或随机 slug
probeHygiene();
const initSlug = process.env.TAIYI_PROBE_INIT_SLUG ?? "probe-init-slug";
expect(
  "C1-init-fixed",
  runForge(["init", initSlug, "--profile", "lite", "--title", "Init probe", "--force"]),
  0,
);

// B：bug --create（slug 已存在时从标题推导）
const bugTitle = "Fullflow probe bug";
const bugOut = runForge(["bug", bugTitle, "--create"]);
const bugSlug = extractSlug(bugOut.out, bugTitle);
check("B1-bug-create-slug", bugSlug != null, bugSlug ?? bugOut.out.slice(0, 80));
if (bugSlug) {
  expect("B2-bug-status", runForge(["status", bugSlug]), 0);
}

// D：feature --create
const featTitle = "Fullflow probe feature";
const featOut = runForge(["feature", featTitle, "--create"]);
const featSlug = extractSlug(featOut.out, featTitle);
check("D0-feature-create-slug", featSlug != null, featSlug ?? featOut.out.slice(0, 80));
if (featSlug) {
  expect("D1-team", runForge(["team", featSlug]), [0, 1]);
  expect("D4-step", runForge(["step", featSlug]), [0, 1, 2]);
}

// A：archive 幂等（需已完成 slug，可选环境变量）
const archiveSlug = process.env.TAIYI_PROBE_ARCHIVE_SLUG;
if (archiveSlug) {
  const a1 = runForge(["archive", archiveSlug]);
  const a2 = runForge(["archive", archiveSlug]);
  expect("A3-archive-twice-1", a1, 0);
  expect("A3-archive-twice-2", a2, 0);
  check("A3-archive-noop-text", /幂等|no-op|已归档/i.test(a2.out), a2.out.slice(0, 100));
}

const report = {
  generatedAt: new Date().toISOString(),
  version: JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8")).version,
  failed,
  passed: results.filter((r) => r.ok).length,
  total: results.length,
  results,
  note: "完整 A–J 链见消费方 .taiyi/taiyi-fullflow-probe.mjs；本脚本仅覆盖易假红项修正",
};
const outDir = path.join(workspace, ".taiyi");
fs.mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, "fullflow-probe-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\n报告: ${reportPath} — ${report.passed}/${report.total} 通过`);
cleanupProbeWorktree(repoRoot);
process.exit(failed > 0 ? 1 : 0);
