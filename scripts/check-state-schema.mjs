#!/usr/bin/env node
/**
 * state.json schema validator — non-blocking check for cosmetic drift.
 *
 * For each .taiyi/changes/<slug>/state.json, verifies:
 *   - Required keys present (12 baseline)
 *   - workflowStatus ∈ { active, completed, aborted }
 *   - currentPhase ∈ nine phases
 *   - completedPhases entries ∈ nine phases
 *   - Cosmetically warn on: legacy `seeded` field (engine no longer writes it;
 *     absorbs naturally on next writeState) and missing `version` (OCC falls
 *     back to 0 via ?? — non-blocking)
 *
 * Exit codes:
 *   0 = all checks pass (warnings allowed)
 *   1 = hard schema violation
 *   2 = script error
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.join(process.cwd(), ".taiyi", "changes");
const PHASES = new Set([
  "change", "requirement", "design", "ui-design",
  "task", "dev", "test", "review", "integration",
]);
const STATUSES = new Set(["active", "completed", "aborted"]);
const REQUIRED = [
  "slug", "currentPhase", "completedPhases", "profile",
  "skippedPhases", "strictDev", "autoHarness", "complexity",
  "auxiliaryCompleted", "workflowStatus", "createdAt", "updatedAt",
];

function* listChanges(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      const stateFile = path.join(dir, e.name, "state.json");
      if (fs.existsSync(stateFile)) yield { slug: e.name, stateFile };
    }
  }
}

const warnings = [];
const failures = [];

for (const { slug, stateFile } of listChanges(ROOT)) {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(stateFile, "utf8")); }
  catch (e) {
    failures.push({ slug, kind: "JSON_PARSE", detail: e.message });
    continue;
  }

  for (const key of REQUIRED) {
    if (!(key in raw)) failures.push({ slug, kind: "MISSING_KEY", detail: key });
  }

  if ("workflowStatus" in raw && !STATUSES.has(raw.workflowStatus)) {
    failures.push({ slug, kind: "BAD_WORKFLOW_STATUS", detail: raw.workflowStatus });
  }
  if ("currentPhase" in raw && !PHASES.has(raw.currentPhase)) {
    failures.push({ slug, kind: "BAD_CURRENT_PHASE", detail: raw.currentPhase });
  }
  if (Array.isArray(raw.completedPhases)) {
    for (const p of raw.completedPhases) {
      if (!PHASES.has(p)) failures.push({ slug, kind: "BAD_COMPLETED_PHASE", detail: p });
    }
  }

  if ("seeded" in raw) warnings.push({ slug, kind: "LEGACY_SEEDED", detail: "absorbed on next writeState" });
  if (!("version" in raw)) warnings.push({ slug, kind: "MISSING_VERSION", detail: "OCC falls back to 0 — non-blocking" });
}

process.stdout.write(`state.json schema check — ${failures.length === 0 ? "PASS" : "FAIL"}\n`);
process.stdout.write(`  warnings: ${warnings.length}, failures: ${failures.length}\n\n`);

if (warnings.length > 0) {
  process.stdout.write("Warnings:\n");
  for (const w of warnings) process.stdout.write(`  · ${w.slug}  ${w.kind}  ${w.detail}\n`);
  process.stdout.write("\n");
}

if (failures.length > 0) {
  process.stdout.write("Failures:\n");
  for (const f of failures) process.stdout.write(`  · ${f.slug}  ${f.kind}  ${f.detail}\n`);
}

process.exit(failures.length > 0 ? 1 : 0);