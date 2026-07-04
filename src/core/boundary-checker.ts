import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import type { ChangeState, PhaseId } from "./types.js";
import { getPhase } from "./phase-registry.js";
import { logActivity } from "./activity-log.js";

export type FileBoundary = {
  limitFiles?: string[];
  fixFiles?: string[];
  outScope?: string[];
  exportedSymbols?: string[];
};

/**
 * Try to read fileBoundary from CHANGE.md's companion JSON (change.json),
 * which is validated through ChangeSchema and includes the fileBoundary field.
 */
export function readFileBoundary(changeDir: string): FileBoundary | null {
  const jsonPath = path.join(changeDir, "change.json");
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as {
      fileBoundary?: FileBoundary;
      exportedSymbols?: string[];
    };
    // Merge top-level exportedSymbols into fileBoundary for backward compat
    const fb: FileBoundary = raw.fileBoundary ?? {};
    const topLevel = raw.exportedSymbols ?? [];
    if (topLevel.length > 0) {
      fb.exportedSymbols = [...new Set([...(fb.exportedSymbols ?? []), ...topLevel])];
    }
    return fb;
  } catch {
    return null;
  }
}

export type ScopeCheckResult = {
  passed: boolean;
  findings: string[];
};

/**
 * Check if the actual git diff for this change stays within the declared file boundary.
 * This is a lightweight check — only inspects file paths, not symbol-level exports.
 */
export function checkScopeBoundary(
  changeDir: string,
  workspaceDir: string,
  _slug: string,
): ScopeCheckResult {
  const boundary = readFileBoundary(changeDir);
  const findings: string[] = [];

  if (!boundary) {
    findings.push("[boundary] No fileBoundary declared in change.json — scope check skipped");
    return { passed: true, findings };
  }

  const limitPatterns = boundary.limitFiles ?? [];
  const outScopeExceptions = boundary.outScope ?? [];

  if (limitPatterns.length === 0) {
    findings.push("[boundary] limitFiles is empty — scope check skipped");
    return { passed: true, findings };
  }

  // Get changed files via git diff against merge-base
  let changedFiles: string[] = [];
  try {
    const baseBranch = process.env.TAIYI_BASE_BRANCH ?? "main";
    const mergeBase = execSync(`git merge-base HEAD ${baseBranch}`, {
      cwd: workspaceDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    const diffOutput = execSync(`git diff --name-only ${mergeBase}`, {
      cwd: workspaceDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    changedFiles = diffOutput ? diffOutput.split("\n").filter(Boolean) : [];
  } catch {
    // Not a git repo or no base branch — skip git-based check
    findings.push("[boundary] Cannot resolve git diff — scope check skipped");
    return { passed: true, findings };
  }

  if (changedFiles.length === 0) {
    return { passed: true, findings };
  }

  // Build a combined allowlist from limitFiles + fixFiles + outScope exceptions
  const allowPatterns = [
    ...limitPatterns,
    ...(boundary.fixFiles ?? []),
    ...outScopeExceptions,
  ];

  for (const file of changedFiles) {
    // Skip non-code files
    if (/\.(md|json|yaml|yml|toml|lock|gitignore|editorconfig)$/.test(file)) continue;
    if (file.startsWith(".taiyi/") || file.startsWith(".omo/")) continue;

    const inScope = allowPatterns.some((pattern) => {
      const regex = globToRegex(pattern);
      return regex.test(file);
    });

    if (!inScope) {
      findings.push(
        `[boundary] File "${file}" is outside declared fileBoundary (not matched by any limitFiles/fixFiles/outScope pattern)`,
      );
    }
  }

  const passed = findings.length === 0;
  return { passed, findings };
}

/**
 * Check if an artifact file passes quality validation for a given phase.
 * This is used by canEnterPhase gate to verify prerequisite phases.
 */
export function checkArtifactQuality(
  changeDir: string,
  phaseId: PhaseId,
): { passed: boolean; error?: string } {
  const phase = getPhase(phaseId);
  const artifactPath = phase.kind === "code"
    ? path.join(changeDir, ".dev-complete")
    : path.join(changeDir, phase.artifact);

  if (!fs.existsSync(artifactPath)) {
    return { passed: false, error: `Artifact missing for phase ${phaseId}: ${phase.artifact}` };
  }

  const stat = fs.statSync(artifactPath);
  if (stat.size === 0) {
    return { passed: false, error: `Artifact is empty for phase ${phaseId}` };
  }

  // Check for seed/template placeholder content
  const content = fs.readFileSync(artifactPath, "utf8");
  if (content.includes("<!-- taiyi:seed-template -->")) {
    return { passed: false, error: `Artifact for phase ${phaseId} is still a seed template (not yet filled)` };
  }

  return { passed: true };
}

/**
 * Pre-flight check before writing a phase: ensure the change state allows it.
 * Logs the check result for observability.
 */
export function preFlightCheck(
  taiyiRoot: string,
  state: ChangeState,
  phaseId: PhaseId,
): { ok: boolean; error?: string } {
  if (state.currentPhase !== phaseId) {
    const msg = `Cannot write phase ${phaseId}: current phase is ${state.currentPhase}`;
    logActivity(taiyiRoot, { event: "preflight:blocked", slug: state.slug, phase: phaseId, reason: msg });
    return { ok: false, error: msg };
  }

  // Verify all prerequisite phases have non-seed artifacts
  const phase = getPhase(phaseId);
  if (!phase) {
    return { ok: false, error: `Unknown phase: ${phaseId}` };
  }

  const changeDir = path.join(taiyiRoot, "changes", state.slug);
  for (const prereq of phase.requires) {
    if (state.completedPhases.includes(prereq)) continue;
    if (state.skippedPhases.includes(prereq)) continue;

    const check = checkArtifactQuality(changeDir, prereq);
    if (!check.passed) {
      const msg = `Prerequisite phase ${prereq} not ready: ${check.error}`;
      logActivity(taiyiRoot, { event: "preflight:blocked", slug: state.slug, phase: phaseId, reason: msg });
      return { ok: false, error: msg };
    }
  }

  logActivity(taiyiRoot, { event: "preflight:passed", slug: state.slug, phase: phaseId });
  return { ok: true };
}

/** Convert a simple glob pattern to a RegExp for matching file paths */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "___DOUBLESTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___DOUBLESTAR___/g, ".*");
  return new RegExp(`^${escaped}$`);
}
