import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { WorkflowEngine } from "./workflow-engine.js";
import { formatAgentRalphProtocol, ralphSlash } from "./ralph-invoke.js";
import { resolveRalphVerifyCmd } from "./ralph-verify-cmd.js";
import {
  bumpRalphRound,
  clearRalphState,
  defaultRalphMaxRounds,
  readRalphState,
  type RalphStateFile,
} from "./ralph-state.js";
import { getPhaseOrder } from "./phase-registry.js";
import { checkRalplanGate } from "./runtime/ralplan-gate.js";
import { activateMode, deactivateMode } from "./runtime/mode-state.js";
import type { PhaseId } from "./types.js";

export type RalphRunResult = {
  ok: boolean;
  slug: string;
  phase: PhaseId;
  verifyCmd: string;
  exitCode: number;
  round: number;
  maxRounds: number;
  text: string;
  loopState: RalphStateFile;
  skipped?: boolean;
  skipReason?: string;
};


function runVerifyCmd(workspaceDir: string, cmd: string): number {
  const unsafe = validateRalphVerifyCmd(cmd);
  if (unsafe) {
    throw new Error(unsafe);
  }
  try {
    execSync(cmd, {
      cwd: workspaceDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: "/bin/bash",
    });
    return 0;
  } catch (e: unknown) {
    const err = e as { status?: number };
    return typeof err.status === "number" ? err.status : 1;
  }
}

/** 拒绝 shell 元字符；TAIYI_RALPH_VERIFY_CMD 仅用于受信本地环境 */
export function validateRalphVerifyCmd(cmd: string): string | null {
  const trimmed = cmd.trim();
  if (!trimmed) return "verify command must not be empty";
  if (/[;&|`$<>]/.test(trimmed)) {
    return "verify command contains unsafe shell metacharacters";
  }
  if (trimmed.includes("\n") || trimmed.includes("\r")) {
    return "verify command must be a single line";
  }
  return null;
}

export function runRalphVerify(
  engine: WorkflowEngine,
  workspaceDir: string,
  slug: string,
  options?: { bumpRound?: boolean },
): RalphRunResult {
  const state = engine.getState(slug);
  const bump = options?.bumpRound !== false;

  if (!state) {
    const empty: RalphStateFile = {
      slug,
      round: 0,
      maxRounds: defaultRalphMaxRounds(),
      updatedAt: new Date().toISOString(),
    };
    return {
      ok: false,
      slug,
      phase: "change",
      verifyCmd: "",
      exitCode: 1,
      round: 0,
      maxRounds: defaultRalphMaxRounds(),
      text: `Change not found: ${slug}`,
      loopState: empty,
    };
  }

  const changeDir = engine.changeDir(slug);
  const phase = state.currentPhase as PhaseId;

  if (getPhaseOrder(phase) < getPhaseOrder("dev")) {
    const prev = readRalphState(changeDir);
    return {
      ok: false,
      slug,
      phase,
      verifyCmd: "",
      exitCode: 0,
      round: prev?.round ?? 0,
      maxRounds: prev?.maxRounds ?? defaultRalphMaxRounds(),
      skipped: true,
      skipReason: "before-dev",
      text: [
        `Ralph 不适用于规划阶段 ${phase}（dev 前只写 .taiyi 工件）`,
        "  须先 harness-check / mark-aux / 人工门 → /taiyi:continue",
        "  到 dev 后再 scripts/taiyi-forge.sh ralph",
      ].join("\n"),
      loopState:
        prev ??
        ({
          slug,
          round: 0,
          maxRounds: defaultRalphMaxRounds(),
          updatedAt: new Date().toISOString(),
        } satisfies RalphStateFile),
    };
  }

  const gate = checkRalplanGate(changeDir, phase);
  if (!gate.ok) {
    const prev = readRalphState(changeDir);
    return {
      ok: false,
      slug,
      phase,
      verifyCmd: "",
      exitCode: 1,
      round: prev?.round ?? 0,
      maxRounds: prev?.maxRounds ?? defaultRalphMaxRounds(),
      skipped: true,
      skipReason: "ralplan-first",
      text: gate.text,
      loopState:
        prev ??
        ({
          slug,
          round: 0,
          maxRounds: defaultRalphMaxRounds(),
          updatedAt: new Date().toISOString(),
        } satisfies RalphStateFile),
    };
  }

  const verifyCmd = resolveRalphVerifyCmd(workspaceDir);

  if (!verifyCmd) {
    const prev = readRalphState(changeDir);
    return {
      ok: false,
      slug,
      phase,
      verifyCmd: "",
      exitCode: 1,
      round: prev?.round ?? 0,
      maxRounds: prev?.maxRounds ?? defaultRalphMaxRounds(),
      skipped: true,
      skipReason: "no-verify-cmd",
      text: [
        "⚠ 未配置 Ralph 验证命令",
        "  设置 package.json → taiyi.deliveryVerifyCmd 或 TAIYI_DELIVERY_VERIFY_CMD / TAIYI_RALPH_VERIFY_CMD",
        "  或确保 scripts/taiyi-forge.sh 存在（将回退 doctor/verify）",
      ].join("\n"),
      loopState:
        prev ??
        ({
          slug,
          round: 0,
          maxRounds: defaultRalphMaxRounds(),
          updatedAt: new Date().toISOString(),
        } satisfies RalphStateFile),
    };
  }

  const unsafe = validateRalphVerifyCmd(verifyCmd);
  if (unsafe) {
    const prev = readRalphState(changeDir);
    return {
      ok: false,
      slug,
      phase,
      verifyCmd,
      exitCode: 1,
      round: prev?.round ?? 0,
      maxRounds: prev?.maxRounds ?? defaultRalphMaxRounds(),
      skipped: true,
      skipReason: "unsafe-verify-cmd",
      text: [
        `⚠ Ralph 验证命令被拒绝: ${unsafe}`,
        "  仅允许 npm test / npm run <script> / npx … 等单行命令，禁止 ; | ` $ 等元字符",
      ].join("\n"),
      loopState:
        prev ??
        ({
          slug,
          round: 0,
          maxRounds: defaultRalphMaxRounds(),
          updatedAt: new Date().toISOString(),
        } satisfies RalphStateFile),
    };
  }

  let exitCode: number;
  try {
    exitCode = runVerifyCmd(workspaceDir, verifyCmd);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const prev = readRalphState(changeDir);
    return {
      ok: false,
      slug,
      phase,
      verifyCmd,
      exitCode: 1,
      round: prev?.round ?? 0,
      maxRounds: prev?.maxRounds ?? defaultRalphMaxRounds(),
      text: `✗ Ralph 验证执行失败: ${msg}`,
      loopState:
        prev ??
        ({
          slug,
          round: 0,
          maxRounds: defaultRalphMaxRounds(),
          updatedAt: new Date().toISOString(),
        } satisfies RalphStateFile),
    };
  }
  const passed = exitCode === 0;

  let loopState: RalphStateFile;
  if (passed) {
    clearRalphState(changeDir);
    deactivateMode(engine.taiyiRoot, "ralph");
    loopState = {
      slug,
      round: 0,
      maxRounds: defaultRalphMaxRounds(),
      lastVerifyCmd: verifyCmd,
      lastExitCode: 0,
      updatedAt: new Date().toISOString(),
    };
  } else if (bump) {
    activateMode(engine.taiyiRoot, "ralph", slug, { linkedModes: ["ultrawork"] });
    loopState = bumpRalphRound(changeDir, slug, defaultRalphMaxRounds(), {
      lastVerifyCmd: verifyCmd,
      lastExitCode: exitCode,
    });
  } else {
    loopState = readRalphState(changeDir) ?? {
      slug,
      round: 0,
      maxRounds: defaultRalphMaxRounds(),
      lastVerifyCmd: verifyCmd,
      lastExitCode: exitCode,
      updatedAt: new Date().toISOString(),
    };
  }

  const lines: string[] = [];
  if (passed) {
    lines.push(`✓ Ralph 验证通过（${verifyCmd}，exit 0）`);
    lines.push(`  阶段 ${phase} → 可 /taiyi:continue 或继续 ${ralphSlash(slug)} 复验`);
  } else {
    lines.push(`✗ Ralph 验证失败（${verifyCmd}，exit ${exitCode}）`);
    lines.push(`  轮次 ${loopState.round}/${loopState.maxRounds}`);
    if (loopState.round >= loopState.maxRounds) {
      lines.push("  ⚠ 已达 Ralph 上限，请人工介入或提高 TAIYI_RALPH_MAX_ROUNDS");
    } else {
      lines.push("  → 修代码/测试后再次 /taiyi:ralph");
    }
  }

  lines.push("");
  lines.push(formatAgentRalphProtocol(slug, loopState.round, loopState.maxRounds, verifyCmd));

  return {
    ok: passed,
    slug,
    phase,
    verifyCmd,
    exitCode,
    round: loopState.round,
    maxRounds: loopState.maxRounds,
    text: lines.join("\n"),
    loopState,
  };
}
