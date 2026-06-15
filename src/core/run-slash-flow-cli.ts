import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { E2E_ARTIFACTS, E2E_PHASE_ORDER } from "./e2e-fixtures.js";
import { getPhase } from "./phase-registry.js";
import { DEV_COMPLETE_EVIDENCE } from "./dev-complete.js";
import { listAgentRoleIds, PHASE_AGENT_ROLES } from "./agent-roles.js";
import { requiresHumanGate } from "./gates/human-gate-config.js";
import { skippedPhasesForProfile } from "./profile.js";
import type { ChangeProfile, PhaseId } from "./types.js";
import { resolveChangeDir } from "./taiyi-archive.js";

const HEALTH_REPORT = `# Health Report

E2E full-flow-demo — npm test passed, no blocking findings.
`;

/** 九阶段完成后 change 目录内应存在的核心工件（含 review 辅助） */
export const EXPECTED_CHANGE_ARTIFACTS = [
  "CHANGE.md",
  "REQUIREMENT.md",
  "DESIGN.md",
  "UI-DESIGN.md",
  "TASK.md",
  ".dev-complete",
  "TEST.md",
  "REVIEW.md",
  "health-report.md",
  "CHANGELOG.md",
  "state.json",
] as const;

const ARTIFACT_PHASE_MAP: Record<string, PhaseId> = {
  "CHANGE.md": "change",
  "REQUIREMENT.md": "requirement",
  "UI-DESIGN.md": "ui-design",
  "DESIGN.md": "design",
  "TASK.md": "task",
  "REVIEW.md": "review",
  "TEST.md": "test",
  "CHANGELOG.md": "integration",
  "health-report.md": "review",
};

/** profile 跳过阶段后 change 目录内仍应存在的工件 */
export function getExpectedArtifactsForProfile(
  profile: ChangeProfile = "full",
): readonly string[] {
  const skipped = new Set(skippedPhasesForProfile(profile));
  return EXPECTED_CHANGE_ARTIFACTS.filter((name) => {
    const phase = ARTIFACT_PHASE_MAP[name];
    return !phase || !skipped.has(phase);
  });
}

export function getPhaseOrderForProfile(profile: ChangeProfile = "full"): PhaseId[] {
  const skipped = skippedPhasesForProfile(profile);
  return E2E_PHASE_ORDER.filter((p) => !skipped.includes(p));
}

export type ForgeRun = { code: number; out: string };

export type SlashFlowManifest = {
  expectedSlug: string;
  approver: string;
  humanGatePhases?: PhaseId[];
  init: { forge: string[] };
  taskDevSlashes: { cli: string[][] };
  devTestSlashes: { cli: string[][] };
  finishSlashes: { cli: string[][] };
};

export type SlashFlowStep = {
  phase?: PhaseId;
  command: string;
  code: number;
  ok: boolean;
};

export type SlashFlowRunResult = {
  ok: boolean;
  slug: string;
  workspaceDir: string;
  changeDir: string;
  errors: string[];
  steps: SlashFlowStep[];
  generatedFiles: string[];
  completedPhases: PhaseId[];
  workflowStatus?: string;
};

function expandArgv(argv: string[], slug: string): string[] {
  return argv.map((a) => a.replaceAll("{slug}", slug));
}

export function loadSlashFlowManifest(repoRoot: string): SlashFlowManifest {
  const p = path.join(repoRoot, "examples/full-flow-demo/slash-flow.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as SlashFlowManifest;
}

const FULL_FLOW_DEMO_ROOT = "examples/full-flow-demo";

/** 复制 example 业务夹具到临时目录（不含 .taiyi / verify-report，避免并行 inplace 测试竞态） */
export function copyFullFlowDemoFixture(repoRoot: string, destDir: string): void {
  const src = path.join(repoRoot, FULL_FLOW_DEMO_ROOT);
  for (const rel of ["package.json", "slash-flow.json"]) {
    fs.cpSync(path.join(src, rel), path.join(destDir, rel));
  }
  for (const dir of ["src", "test", "scripts"]) {
    const from = path.join(src, dir);
    if (fs.existsSync(from)) {
      fs.cpSync(from, path.join(destDir, dir), { recursive: true });
    }
  }
}

export function resolveTaiyiCli(repoRoot: string): string[] {
  const built = path.join(repoRoot, "dist/cli/taiyi.js");
  if (fs.existsSync(built)) return ["node", built];
  return ["node", "--import", "tsx", path.join(repoRoot, "src/cli/taiyi.ts")];
}

export function runForge(
  repoRoot: string,
  cwd: string,
  argv: string[],
): ForgeRun {
  const script = path.join(repoRoot, "scripts/taiyi-forge.sh");
  const r = spawnSync("bash", [script, ...argv], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: repoRoot },
  });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

export function runTaiyiCli(repoRoot: string, cwd: string, argv: string[]): ForgeRun {
  const [bin, ...cliArgs] = resolveTaiyiCli(repoRoot);
  const r = spawnSync(bin, [...cliArgs, ...argv], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: repoRoot },
  });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function seedPhaseArtifact(changeDir: string, phaseId: PhaseId): void {
  if (phaseId === "dev") {
    fs.writeFileSync(path.join(changeDir, ".dev-complete"), DEV_COMPLETE_EVIDENCE, "utf8");
    return;
  }
  const body = E2E_ARTIFACTS[phaseId];
  const phase = getPhase(phaseId);
  fs.writeFileSync(path.join(changeDir, phase.artifact), body, "utf8");
}

function refreshReviewArtifact(changeDir: string): void {
  const reviewPath = path.join(changeDir, "REVIEW.md");
  fs.writeFileSync(reviewPath, E2E_ARTIFACTS.review, "utf8");
  const t = new Date(Date.now() + 2000);
  fs.utimesSync(reviewPath, t, t);
}

function runReviewExtras(
  repoRoot: string,
  cwd: string,
  slug: string,
  changeDir: string,
  steps: SlashFlowStep[],
  errors: string[],
): void {
  fs.writeFileSync(path.join(changeDir, "health-report.md"), HEALTH_REPORT, "utf8");

  for (const argv of [
    ["health", slug],
    ["mark-aux", slug, "taiyi-health"],
    ["review-check", slug],
  ]) {
    const r = runForge(repoRoot, cwd, argv);
    steps.push({ command: argv.join(" "), code: r.code, ok: r.code === 0 });
    if (r.code !== 0) errors.push(`review ${argv.join(" ")}: ${r.out}`);
  }

  const loopFirst = runForge(repoRoot, cwd, ["review-loop", slug]);
  steps.push({
    command: `review-loop ${slug} (round1)`,
    code: loopFirst.code,
    ok: loopFirst.code === 1,
  });
  if (loopFirst.code !== 1) {
    errors.push(`review-loop 首轮应 exit 1: ${loopFirst.out}`);
  }

  refreshReviewArtifact(changeDir);

  const loopPass = runForge(repoRoot, cwd, ["review-loop", slug]);
  steps.push({
    command: `review-loop ${slug} (round2)`,
    code: loopPass.code,
    ok: loopPass.code === 0,
  });
  if (loopPass.code !== 0) errors.push(`review-loop 二轮: ${loopPass.out}`);
}

function collectGeneratedFiles(
  changeDir: string,
  profile: ChangeProfile = "full",
): string[] {
  const files: string[] = [];
  for (const name of getExpectedArtifactsForProfile(profile)) {
    const p = path.join(changeDir, name);
    if (fs.existsSync(p) && fs.statSync(p).size > 0) files.push(p);
  }
  return files;
}

export function assertExpectedArtifacts(
  changeDir: string,
  profile: ChangeProfile = "full",
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const name of getExpectedArtifactsForProfile(profile)) {
    const p = path.join(changeDir, name);
    if (!fs.existsSync(p) || fs.statSync(p).size === 0) missing.push(name);
  }
  return { ok: missing.length === 0, missing };
}

export type RunSlashFlowOptions = {
  repoRoot: string;
  workspaceDir: string;
  manifest?: SlashFlowManifest;
  /** 默认 manifest.expectedSlug；profile 流建议显式 slug */
  slug?: string;
  profile?: ChangeProfile;
  cleanTaiyi?: boolean;
  verifyAllAgents?: boolean;
  runWorkflowSmoke?: boolean;
  runFinish?: boolean;
};

/** 在指定 workspace 内跑九阶段 + Agent + 收尾斜杠 CLI（与 examples/full-flow-demo 同源） */
function buildInitArgv(
  manifest: SlashFlowManifest,
  slug: string,
  profile: ChangeProfile,
): string[] {
  if (profile === "full") return [...manifest.init.forge];
  return ["init", slug, "--profile", profile, "--title", "Profile CLI E2E"];
}

export function runSlashFlow(options: RunSlashFlowOptions): SlashFlowRunResult {
  const manifest = options.manifest ?? loadSlashFlowManifest(options.repoRoot);
  const profile = options.profile ?? "full";
  const slug = options.slug ?? manifest.expectedSlug;
  const workspaceDir = path.resolve(options.workspaceDir);
  const changeDir = path.join(workspaceDir, ".taiyi/changes", slug);
  const phaseOrder = getPhaseOrderForProfile(profile);
  const steps: SlashFlowStep[] = [];
  const errors: string[] = [];

  if (options.cleanTaiyi) {
    const taiyiDir = path.join(workspaceDir, ".taiyi");
    if (fs.existsSync(taiyiDir)) fs.rmSync(taiyiDir, { recursive: true, force: true });
  }

  const initArgv = buildInitArgv(manifest, slug, profile);
  const init = runForge(options.repoRoot, workspaceDir, initArgv);
  steps.push({ command: initArgv.join(" "), code: init.code, ok: init.code === 0 });
  if (init.code !== 0) {
    return {
      ok: false,
      slug,
      workspaceDir,
      changeDir,
      errors: [`init: ${init.out}`],
      steps,
      generatedFiles: [],
      completedPhases: [],
    };
  }

  if (options.verifyAllAgents) {
    const list = runForge(options.repoRoot, workspaceDir, ["agent", "list", slug]);
    steps.push({ command: `agent list ${slug}`, code: list.code, ok: list.code === 0 });
    if (list.code !== 0) errors.push(`agent list: ${list.out}`);

    for (const roleId of listAgentRoleIds()) {
      const r = runForge(options.repoRoot, workspaceDir, ["agent", roleId, slug]);
      steps.push({ command: `agent ${roleId}`, code: r.code, ok: r.code === 0 });
      if (r.code !== 0) errors.push(`agent ${roleId}: ${r.out}`);
    }
  }

  for (const phaseId of phaseOrder) {
    const statePath = path.join(changeDir, "state.json");
    if (!fs.existsSync(statePath)) {
      errors.push("state.json missing");
      break;
    }
    const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
      currentPhase: PhaseId;
    };
    if (state.currentPhase !== phaseId) {
      errors.push(`expected phase ${phaseId}, got ${state.currentPhase}`);
      break;
    }

    seedPhaseArtifact(changeDir, phaseId);

    for (const argv of [["write", slug], [phaseId, slug], ["harness", slug], ["status", slug]]) {
      const r = runForge(options.repoRoot, workspaceDir, argv);
      const allowFail = argv[0] !== "status";
      steps.push({
        phase: phaseId,
        command: argv.join(" "),
        code: r.code,
        ok: allowFail ? r.code === 0 || r.code === 1 : r.code === 0,
      });
      if (argv[0] === "status" && r.code !== 0) errors.push(`status ${phaseId}: ${r.out}`);
    }

    for (const roleId of PHASE_AGENT_ROLES[phaseId]) {
      const ar = runForge(options.repoRoot, workspaceDir, ["agent", roleId, slug]);
      steps.push({
        phase: phaseId,
        command: `agent ${roleId}`,
        code: ar.code,
        ok: ar.code === 0,
      });
      if (ar.code !== 0) errors.push(`agent ${roleId} @ ${phaseId}: ${ar.out}`);
    }

    if (phaseId === "review") {
      runReviewExtras(options.repoRoot, workspaceDir, slug, changeDir, steps, errors);
    }

    const contArgv = requiresHumanGate(phaseId)
      ? ["continue", slug, "--approver", manifest.approver]
      : ["continue", slug];
    const cont = runForge(options.repoRoot, workspaceDir, contArgv);
    steps.push({
      phase: phaseId,
      command: contArgv.join(" "),
      code: cont.code,
      ok: cont.code === 0,
    });
    if (cont.code !== 0) errors.push(`continue ${phaseId}: ${cont.out}`);

    if (options.runWorkflowSmoke && (phaseId === "task" || phaseId === "dev")) {
      const extras =
        phaseId === "task" ? manifest.taskDevSlashes.cli : manifest.devTestSlashes.cli;
      for (const extra of extras) {
        const expanded = expandArgv(extra, slug);
        const r = runForge(options.repoRoot, workspaceDir, expanded);
        steps.push({
          phase: phaseId,
          command: expanded.join(" "),
          code: r.code,
          ok: r.code === 0 || r.code === 1,
        });
      }
    }
  }

  if (options.runFinish) {
    for (const argv of manifest.finishSlashes.cli) {
      const expanded = expandArgv(argv, slug);
      const r = runForge(options.repoRoot, workspaceDir, expanded);
      steps.push({ command: expanded.join(" "), code: r.code, ok: r.code === 0 });
      if (r.code !== 0) errors.push(`finish ${expanded.join(" ")}: ${r.out}`);
    }
    const verify = runTaiyiCli(options.repoRoot, workspaceDir, ["verify", slug]);
    steps.push({ command: `verify ${slug}`, code: verify.code, ok: verify.code === 0 });
    if (verify.code !== 0) errors.push(`verify: ${verify.out}`);
  }

  const taiyiRoot = path.join(workspaceDir, ".taiyi");
  const resolvedChangeDir = resolveChangeDir(taiyiRoot, slug) ?? changeDir;
  const artifactCheck = assertExpectedArtifacts(resolvedChangeDir, profile);
  if (!artifactCheck.ok) {
    errors.push(`missing artifacts: ${artifactCheck.missing.join(", ")}`);
  }

  let completedPhases: PhaseId[] = [];
  let workflowStatus: string | undefined;
  const statePath = path.join(resolvedChangeDir, "state.json");
  if (fs.existsSync(statePath)) {
    const final = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
      completedPhases: PhaseId[];
      workflowStatus?: string;
      skippedPhases?: PhaseId[];
    };
    completedPhases = final.completedPhases ?? [];
    workflowStatus = final.workflowStatus;
    if (completedPhases.length !== phaseOrder.length) {
      errors.push(
        `completedPhases=${completedPhases.length}, expected ${phaseOrder.length} (profile=${profile})`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    slug,
    workspaceDir,
    changeDir: resolvedChangeDir,
    errors,
    steps,
    generatedFiles: collectGeneratedFiles(resolvedChangeDir, profile),
    completedPhases,
    workflowStatus,
  };
}

export function writeVerifyReport(
  workspaceDir: string,
  result: SlashFlowRunResult,
): string {
  const reportPath = path.join(workspaceDir, "verify-report.json");
  const report = {
    generatedAt: new Date().toISOString(),
    ok: result.ok,
    slug: result.slug,
    changeDir: result.changeDir,
    errors: result.errors,
    completedPhases: result.completedPhases,
    workflowStatus: result.workflowStatus,
    generatedFiles: result.generatedFiles.map((f) => path.relative(workspaceDir, f)),
    expectedArtifacts: [...EXPECTED_CHANGE_ARTIFACTS],
    stepCount: result.steps.length,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}
