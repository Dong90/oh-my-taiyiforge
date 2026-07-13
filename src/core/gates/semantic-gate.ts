import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { resolveTaiyiRoot } from "../paths.js";
import { resolveChangeDir } from "../taiyi-archive.js";
import { getCanonicalPhaseOrder } from "../phase-registry.js";
import { evaluateCommitTrailers } from "./commit-trailer.js";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type SemanticCheckResult = {
  code: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type SemanticGateResult = {
  passed: boolean;
  checks: SemanticCheckResult[];
  summary: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runGit(workspaceDir: string, args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd: workspaceDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10000,
    }).trim();
  } catch {
    return "";
  }
}

function exists(file: string): boolean {
  return fs.existsSync(file);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Individual checkers
// ---------------------------------------------------------------------------

/**
 * Check 1 — schema-integrity: verify the change.json (if present) parses
 * and has required fields.
 */
function checkSchemaIntegrity(changeDir: string): SemanticCheckResult {
  const code = "schema-integrity";
  const jsonPath = path.join(changeDir, "change.json");
  if (!exists(jsonPath)) {
    return { code, label: "Change schema integrity", passed: true, detail: "No change.json — non-typed change, skipped" };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    if (!raw.title && !raw.id && !raw.change_id) {
      return { code, label: "Change schema integrity", passed: false, detail: "change.json lacks required fields (title/id)" };
    }
    if (raw.fileBoundary !== undefined && (typeof raw.fileBoundary !== "object" || raw.fileBoundary === null)) {
      return { code, label: "Change schema integrity", passed: false, detail: "fileBoundary must be an object" };
    }
    return { code, label: "Change schema integrity", passed: true, detail: "change.json is valid" };
  } catch (e) {
    return { code, label: "Change schema integrity", passed: false, detail: `change.json parse error: ${e instanceof SyntaxError ? e.message : String(e)}` };
  }
}

/**
 * Check 2 — gate-integrity: verify phase gate ordering in state.json.
 * Ensures integration-phase sematic checks aren't run before prior gates.
 * Detects both jump-ahead (skipping non-skipped phases) and reverse-order
 * (completing a later phase before an earlier one).
 */
function checkGateIntegrity(changeDir: string): SemanticCheckResult {
  const code = "gate-integrity";
  const statePath = path.join(changeDir, "state.json");
  if (!exists(statePath)) {
    return { code, label: "Gate integrity", passed: false, detail: "No state.json to verify gate chain" };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const completed: string[] = raw.completedPhases ?? [];

    if (!completed.includes("integration") && raw.currentPhase !== "integration") {
      return { code, label: "Gate integrity", passed: true, detail: "Not at integration phase — gate chain not required yet" };
    }

    const expectedOrder = getCanonicalPhaseOrder();
    const filtered = expectedOrder.filter((p) => !(raw.skippedPhases ?? []).includes(p));
    let lastIdx = -1;
    for (let i = 0; i < completed.length; i++) {
      const idx: number = (filtered as readonly string[]).indexOf(completed[i]!);
      if (idx < 0) continue;
      if (idx > i + 1) {
        return { code, label: "Gate integrity", passed: false, detail: `Phase order violation: ${completed[i]} completed out of sequence` };
      }
      if (idx < lastIdx) {
        return { code, label: "Gate integrity", passed: false, detail: `Phase order violation: ${completed[i]} completed before earlier phases` };
      }
      lastIdx = idx;
    }
    return { code, label: "Gate integrity", passed: true, detail: `Gate chain valid (${completed.length} phases completed)` };
  } catch (e) {
    return { code, label: "Gate integrity", passed: false, detail: `state.json read error: ${String(e)}` };
  }
}

/**
 * Check 3 — export-verify: if CHANGE.md declares fileBoundary.exportedSymbols,
 * verify those symbols exist in changed files.
 */
function checkExportVerify(changeDir: string, workspaceDir: string): SemanticCheckResult {
  const code = "export-verify";
  const jsonPath = path.join(changeDir, "change.json");
  if (!exists(jsonPath)) {
    return { code, label: "Export verification", passed: true, detail: "No change.json — skipped" };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const symbols: string[] = raw.fileBoundary?.exportedSymbols ?? raw.exportedSymbols ?? [];
    if (symbols.length === 0) {
      return { code, label: "Export verification", passed: true, detail: "No declared exported symbols" };
    }

    const changed = runGit(workspaceDir, "diff --name-only HEAD");
    const untracked = runGit(workspaceDir, "ls-files --others --exclude-standard");
    const changedFiles = [
      ...(changed ? changed.split("\n").filter(Boolean) : []),
      ...(untracked ? untracked.split("\n").filter(Boolean) : []),
    ];

    if (changedFiles.length === 0) {
      return { code, label: "Export verification", passed: true, detail: `${symbols.length} symbols declared, no git diff to verify against` };
    }

    const missing: string[] = [];
    for (const sym of symbols) {
      let found = false;
      for (const file of changedFiles) {
        if (!exists(path.join(workspaceDir, file))) continue;
        try {
          const content = fs.readFileSync(path.join(workspaceDir, file), "utf8");
          const exportRegex = new RegExp(
            `(export\\s+(function|class|const|let|var|interface|type|default\\s+function|default\\s+class)\\s+${escapeRegex(sym)})|(export\\s*\\{[^}]*\\b${escapeRegex(sym)}\\b)`,
          );
          if (exportRegex.test(content)) {
            found = true;
            break;
          }
        } catch {
          /* skip unreadable */
        }
      }
      if (!found) missing.push(sym);
    }
    if (missing.length > 0) {
      return { code, label: "Export verification", passed: false, detail: `Declared symbols not found in changed files: ${missing.join(", ")}` };
    }
    return { code, label: "Export verification", passed: true, detail: `${symbols.length} declared symbols verified in changed files` };
  } catch (e) {
    return { code, label: "Export verification", passed: false, detail: `Export check error: ${String(e)}` };
  }
}

/**
 * Count open (unchecked) checkboxes in CHANGE.md.
 * Shared with workflow-audit.ts changeCheckboxDrift.
 */
export function countOpenCheckboxes(changeDir: string): number {
  const changeMd = path.join(changeDir, "CHANGE.md");
  if (!exists(changeMd)) return 0;
  return (fs.readFileSync(changeMd, "utf8").match(/- \[ \]/g) ?? []).length;
}

/**
 * Check 4 — ac-claims: all unchecked checkboxes in CHANGE.md are flagged
 * before integration gate passes. Seed templates are exempt.
 */
function checkAcClaims(changeDir: string): SemanticCheckResult {
  const code = "ac-claims";
  const changeMd = path.join(changeDir, "CHANGE.md");
  if (!exists(changeMd)) {
    return { code, label: "AC claims completeness", passed: true, detail: "No CHANGE.md — skipped" };
  }
  const content = fs.readFileSync(changeMd, "utf8");

  if (content.includes("<!-- taiyi:seed-template -->")) {
    return { code, label: "AC claims completeness", passed: true, detail: "Seed template — AC check deferred" };
  }

  const openBoxes = countOpenCheckboxes(changeDir);
  if (openBoxes > 0) {
    return { code, label: "AC claims completeness", passed: false, detail: `${openBoxes} unchecked Success Criteria remain in CHANGE.md` };
  }
  return { code, label: "AC claims completeness", passed: true, detail: "All Success Criteria checked" };
}

/**
 * Check 5 — dep-topology: detect circular cross-change dependencies.
 */
function checkDepTopology(changeDir: string, taiyiRoot: string): SemanticCheckResult {
  const code = "dep-topology";
  const changesDir = path.join(taiyiRoot, "changes");
  if (!exists(changesDir)) {
    return { code, label: "Dependency topology", passed: true, detail: "No changes dir — skipped" };
  }

  try {
    const dirs = fs.readdirSync(changesDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    const deps: Map<string, string[]> = new Map();
    for (const dir of dirs) {
      const jp = path.join(changesDir, dir.name, "change.json");
      if (!exists(jp)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(jp, "utf8"));
        const changeDeps: string[] = raw.dependencies ?? raw.depends_on ?? [];
        if (Array.isArray(changeDeps) && changeDeps.length > 0) {
          deps.set(dir.name, changeDeps.filter((d: unknown) => typeof d === "string"));
        }
      } catch {
        /* skip corrupt */
      }
    }

    // DFS with three-color marking to detect cycles of ANY length.
    // WHITE=unvisited, GRAY=in current DFS path, BLACK=fully explored.
    const cycles: string[] = [];
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();

    function dfs(node: string, trail: string[]): void {
      color.set(node, GRAY);
      trail.push(node);
      for (const neighbor of deps.get(node) ?? []) {
        if (neighbor === node) continue; // skip self-loop
        const c = color.get(neighbor) ?? WHITE;
        if (c === GRAY) {
          // Back edge — cycle found
          const cycleStart = trail.indexOf(neighbor);
          const cyclePath = trail.slice(cycleStart).concat(neighbor);
          cycles.push(cyclePath.join(" → "));
        } else if (c === WHITE) {
          dfs(neighbor, trail);
        }
        // BLACK = already explored, skip
      }
      trail.pop();
      color.set(node, BLACK);
    }

    for (const node of deps.keys()) {
      if (!color.has(node)) {
        dfs(node, []);
      }
    }

    if (cycles.length > 0) {
      return { code, label: "Dependency topology", passed: false, detail: `Circular dependency detected: ${cycles.join(", ")}` };
    }
    return { code, label: "Dependency topology", passed: true, detail: `${dirs.length} changes checked, no dependency cycles` };
  } catch (e) {
    return { code, label: "Dependency topology", passed: false, detail: `Dep topology check error: ${String(e)}` };
  }
}

/**
 * Check 6 — commit-semantics: verify commits for this change have
 * Taiyi-Change trailers when at integration phase.
 */
function checkCommitSemantics(workspaceDir: string, slug: string): SemanticCheckResult {
  const code = "commit-semantics";
  if (!exists(path.join(workspaceDir, ".git"))) {
    return { code, label: "Commit semantics", passed: true, detail: "Not a git workspace — skipped" };
  }

  // Use canonical commit trailer check first (scope: base..HEAD)
  const trailerResult = evaluateCommitTrailers(workspaceDir, slug);
  if (trailerResult.passed && !trailerResult.skipped) {
    return { code, label: "Commit semantics", passed: true, detail: "All commits have Taiyi-Change trailer" };
  }

  // Fallback: scan all refs for any commit mentioning this slug (lenient behavior)
  const logs = runGit(workspaceDir, `log --format="%H %s%n%b" --all`);
  if (!logs) {
    return { code, label: "Commit semantics", passed: true, detail: "No git history — skipped" };
  }

  const slugEscaped = escapeRegex(slug);
  const relevantCommits = logs
    .split(/\n(?=[0-9a-f]{40}\s)/)
    .filter((c) => c.includes(slug) || c.includes(`Taiyi-Change: ${slug}`));

  if (relevantCommits.length === 0) {
    return { code, label: "Commit semantics", passed: true, detail: "No commits referencing this change slug — trailers not required yet" };
  }

  const missingTrailers: string[] = [];
  for (const commit of relevantCommits) {
    const hasChangeTrailer = commit.includes(`Taiyi-Change: ${slug}`);
    if (!hasChangeTrailer) {
      const shortHash = commit.substring(0, 8);
      missingTrailers.push(`${shortHash}`);
    }
  }

  if (missingTrailers.length > 0) {
    return { code, label: "Commit semantics", passed: false, detail: `${missingTrailers.length} commit(s) missing Taiyi-Change trailer: ${missingTrailers.join(", ")}` };
  }
  return { code, label: "Commit semantics", passed: true, detail: `${relevantCommits.length} commits have Taiyi-Change trailer` };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether the semantic gate is enabled.
 * Controlled by TAIYI_SEMANTIC_GATE env var (0/false to disable).
 * Default: enabled.
 */
export function semanticGateEnabled(env = process.env): boolean {
  if (env.TAIYI_SEMANTIC_GATE === "0" || env.TAIYI_SEMANTIC_GATE === "false") {
    return false;
  }
  if (env.TAIYI_SEMANTIC_GATE === "1" || env.TAIYI_SEMANTIC_GATE === "true") {
    return true;
  }
  return true;
}

/**
 * Run all 6 semantic verification checks for a change.
 * Returns aggregate result with per-check details.
 */
export function runSemanticVerify(
  workspaceDir: string,
  slug: string,
  _options?: { phase?: string; taiyiRoot?: string },
): SemanticGateResult {
  const taiyiRoot = _options?.taiyiRoot ?? resolveTaiyiRoot(workspaceDir);
  const changeDir = resolveChangeDir(taiyiRoot, slug) ?? path.join(taiyiRoot, "changes", slug);

  const checks: SemanticCheckResult[] = [
    checkSchemaIntegrity(changeDir),
    checkGateIntegrity(changeDir),
    checkExportVerify(changeDir, workspaceDir),
    checkAcClaims(changeDir),
    checkDepTopology(changeDir, taiyiRoot),
    checkCommitSemantics(workspaceDir, slug),
  ];

  const failed = checks.filter((c) => !c.passed);
  const passed = failed.length === 0;

  const total = checks.length;
  const failures = failed.length;
  const summary = passed
    ? `✓ All ${total} semantic checks passed`
    : `✗ ${failures}/${total} semantic checks failed`;

  return { passed, checks, summary };
}
