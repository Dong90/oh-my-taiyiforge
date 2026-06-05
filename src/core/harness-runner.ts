import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { ChangeState, PhaseId } from "./types.js";
import { getHarnessContext, type HarnessHook } from "../integrations/harness-hooks.js";
import { auxiliaryForPhase, pendingAuxiliary } from "./routing/auxiliary-hints.js";
import { getPhase } from "./phase-registry.js";
import {
  auxiliaryArtifactSatisfied,
  detectCompletedAuxiliary,
} from "./auxiliary-artifacts.js";
import { getOpenspecStatus } from "../integrations/openspec.js";
import { syncTaiyiToOpenspec } from "../integrations/openspec-sync.js";
import { pendingIronTriangleHooks } from "./harness-checkpoints.js";

export type HarnessStepKind = "agent" | "shell" | "taiyi-cli";

export type HarnessStep = {
  kind: HarnessStepKind;
  tool: string;
  skill?: string;
  command?: string;
  when: string;
  optional?: boolean;
  status: "pending" | "done" | "skipped" | "failed";
  detail?: string;
};

export type HarnessPlan = {
  slug: string;
  phase: PhaseId;
  autoHarness: boolean;
  mainSkill: string;
  mainArtifact: string;
  auxiliary: HarnessStep[];
  ironTriangle: HarnessStep[];
  shellResults: HarnessStep[];
  blockers: string[];
};

function classifyHook(h: HarnessHook): HarnessStepKind {
  if (h.tool === "taiyi" && h.skill?.startsWith("taiyi-")) return "agent";
  if (h.tool === "superpowers" || h.tool === "gstack") return "agent";
  if (h.command?.startsWith("openspec ") || h.command?.startsWith("npx taiyi")) return "shell";
  if (h.command?.startsWith("taiyi ")) return "shell";
  return "agent";
}

function shellAvailable(cmd: string): boolean {
  const bin = cmd.split(/\s+/)[0];
  if (bin === "openspec") {
    const r = spawnSync("which", ["openspec"], { encoding: "utf8" });
    return r.status === 0;
  }
  return true;
}

function runShellCommand(
  workspaceDir: string,
  slug: string,
  command: string,
): { ok: boolean; detail: string } {
  const cmd = command.replace(/<slug>/g, slug);
  if (cmd.startsWith("openspec ") && !shellAvailable("openspec")) {
    return { ok: true, detail: "openspec 未安装，已跳过" };
  }
  if (cmd.startsWith("taiyi archive ") || cmd === `taiyi archive ${slug}`) {
    return { ok: true, detail: "请用 npx taiyi archive（集成在 complete 后钩子）" };
  }
  const r = spawnSync(cmd, {
    cwd: workspaceDir,
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const detail = (r.stdout || r.stderr || "").slice(0, 300);
  return { ok: r.status === 0, detail: detail || `exit ${r.status ?? 1}` };
}

export function syncAuxiliaryFromArtifacts(
  changeDir: string,
  auxiliaryCompleted: string[],
): string[] {
  const detected = detectCompletedAuxiliary(changeDir);
  const set = new Set(auxiliaryCompleted);
  for (const s of detected) set.add(s);
  return [...set];
}

export function buildHarnessPlan(
  workspaceDir: string,
  taiyiRoot: string,
  state: ChangeState,
): HarnessPlan {
  const phase = state.currentPhase;
  const changeDir = path.join(taiyiRoot, "changes", state.slug);
  const phaseDef = getPhase(phase);
  const harness = getHarnessContext(workspaceDir, state.slug, phase);

  const recommended = auxiliaryForPhase(phase, state.complexity);
  const auxSkillSet = new Set(recommended);
  /** 与 §2 辅助重复的 taiyi-* 铁三角钩子不再出现在 §1 */
  const phaseHooks = harness.hooks.filter(
    (h) => !(h.tool === "taiyi" && h.skill && auxSkillSet.has(h.skill)),
  );
  const pending = pendingAuxiliary(recommended, state.auxiliaryCompleted);
  const blockers: string[] = [];

  const auxiliary: HarnessStep[] = pending.map((skill) => {
    const satisfied = auxiliaryArtifactSatisfied(changeDir, skill);
    return {
      kind: "agent" as const,
      tool: "taiyi",
      skill,
      when: `辅助 Skill（${skill}）`,
      status: satisfied ? "done" : "pending",
      detail: satisfied ? "工件已存在" : `需产出 ${skill} 对应文件后 mark-aux`,
    };
  });

  const ironTriangle: HarnessStep[] = phaseHooks.map((h) => ({
    kind: classifyHook(h),
    tool: h.tool,
    skill: h.skill,
    command: h.command,
    when: h.when,
    optional: h.tool === "openspec" && !getOpenspecStatus(workspaceDir, state.slug).detected,
    status: "pending" as const,
  }));

  const openspec = getOpenspecStatus(workspaceDir, state.slug);

  if (state.autoHarness) {
    for (const step of auxiliary) {
      if (step.status === "pending") {
        blockers.push(`auto 模式：先完成 ${step.skill}（或生成对应工件）`);
      }
    }
    const pendingHooks = pendingIronTriangleHooks(
      changeDir,
      phase,
      phaseHooks,
      openspec.detected,
    );
    for (const key of pendingHooks) {
      blockers.push(
        `auto 模式：铁三角未打卡 ${key}（执行后: npx taiyi harness-check ${state.slug} ${key}）`,
      );
    }
  }

  return {
    slug: state.slug,
    phase,
    autoHarness: state.autoHarness ?? false,
    mainSkill: phaseDef.skill,
    mainArtifact: phaseDef.artifact,
    auxiliary,
    ironTriangle,
    shellResults: [],
    blockers,
  };
}

export function enforceAutoHarnessBeforeComplete(
  workspaceDir: string,
  taiyiRoot: string,
  state: ChangeState,
): { ok: boolean; error?: string; plan?: HarnessPlan } {
  if (!state.autoHarness) return { ok: true };

  const changeDir = path.join(taiyiRoot, "changes", state.slug);
  const synced = syncAuxiliaryFromArtifacts(changeDir, state.auxiliaryCompleted);
  const withSync = { ...state, auxiliaryCompleted: synced };
  const plan = buildHarnessPlan(workspaceDir, taiyiRoot, withSync);

  if (plan.blockers.length > 0) {
    return {
      ok: false,
      error: `Auto harness blocked: ${plan.blockers.join("; ")}. Run: npx taiyi harness ${state.slug}`,
      plan,
    };
  }
  return { ok: true, plan };
}

export function runPostCompleteShellHooks(
  workspaceDir: string,
  slug: string,
  phaseId: PhaseId,
): HarnessStep[] {
  const results: HarnessStep[] = [];
  const harness = getHarnessContext(workspaceDir, slug, phaseId);

  for (const h of harness.hooks) {
    if (classifyHook(h) !== "shell" || !h.command) continue;
    if (h.command.includes("archive") && phaseId === "integration") {
      const openspec = getOpenspecStatus(workspaceDir, slug);
      if (openspec.detected) {
        const changeDir = path.join(workspaceDir, ".taiyi", "changes", slug);
        const sync = syncTaiyiToOpenspec(workspaceDir, slug, changeDir, { createChangeDir: true });
        results.push({
          kind: "shell",
          tool: "openspec",
          command: "taiyi sync-openspec",
          when: h.when,
          status: sync.ok ? "done" : "failed",
          detail: sync.ok ? "已同步到 openspec/changes/" : sync.reason,
        });
      }
      continue;
    }
    const r = runShellCommand(workspaceDir, slug, h.command);
    results.push({
      kind: "shell",
      tool: h.tool,
      command: h.command,
      when: h.when,
      optional: h.tool === "openspec",
      status: r.ok ? "done" : "failed",
      detail: r.detail,
    });
  }
  return results;
}

export function formatHarnessPlanPlain(plan: HarnessPlan): string {
  const lines: string[] = [];
  lines.push(`# TaiyiForge Auto Harness · ${plan.slug} · ${plan.phase}`);
  lines.push(`模式: ${plan.autoHarness ? "全自动 (--auto)" : "推荐（手动）"}`);
  lines.push(`\n## 1. 铁三角（Agent 自动顺序执行）`);
  if (plan.ironTriangle.length === 0) lines.push("（本阶段无）");
  for (const [i, s] of plan.ironTriangle.entries()) {
    const label =
      s.kind === "agent"
        ? `${s.tool}/${s.skill ?? s.command}`
        : (s.command ?? s.skill);
    const key = s.skill ? `${s.tool}/${s.skill}` : `${s.tool}:${s.command?.split(/\s+/).slice(0, 2).join(" ")}`;
    lines.push(
      `${i + 1}. [${s.kind}] ${label} — ${s.when}${s.optional ? " (可选)" : ""}`,
    );
    if (plan.autoHarness && s.kind === "agent") {
      lines.push(`   完成后: npx taiyi harness-check ${plan.slug} ${key}`);
    }
  }
  lines.push(`\n## 2. 辅助 Skill`);
  if (plan.auxiliary.length === 0) lines.push("（本阶段无待做）");
  for (const s of plan.auxiliary) {
    lines.push(`- ${s.skill} [${s.status}] ${s.detail ?? ""}`);
  }
  lines.push(`\n## 3. 主流程`);
  lines.push(`- ${plan.mainSkill} → ${plan.mainArtifact}`);
  lines.push(`\n## 4. 过关（须先清空 §阻塞）`);
  lines.push(`- [ ] §1 铁三角：每项 [agent] 已执行并 harness-check（shell 项可选则跳过）`);
  lines.push(`- [ ] §2 辅助：无 [pending]（或对应工件已生成）`);
  lines.push(`- [ ] §3 主工件 quality 就绪`);
  if (plan.blockers.length) {
    lines.push(`\n## 阻塞（complete 前必须为零）`);
    for (const b of plan.blockers) lines.push(`- ${b}`);
    const firstCheck = plan.blockers.find((b) => b.includes("harness-check"));
    if (firstCheck) {
      const m = firstCheck.match(/npx taiyi harness-check \S+ \S+/);
      if (m) lines.push(`\n→ 下一命令: ${m[0]}`);
    }
  }
  lines.push(`\nnpx taiyi complete ${plan.slug} ${plan.phase}`);
  lines.push(`\nAgent：按 1→2→3→4 顺序执行，不得跳过。`);
  return lines.join("\n");
}
