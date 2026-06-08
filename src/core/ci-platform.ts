import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncTaiyiSkills } from "../install/sync-skills.js";
import { skillSourceRoot } from "../install/paths.js";
import type { InstallTarget } from "../install/types.js";
import { formatHarnessPlanPlain, buildHarnessPlan } from "./harness-runner.js";
import type { ChangeState } from "./types.js";

export type CiPlatformId = InstallTarget;

function countTaiyiSkillsFromSource(skillsSrc: string): number {
  if (!fs.existsSync(skillsSrc)) return 18;
  return fs.readdirSync(skillsSrc).filter((n) => n.startsWith("taiyi-")).length;
}

export function expectedTaiyiSkillCount(pkgRoot: string): number {
  return countTaiyiSkillsFromSource(skillSourceRoot(pkgRoot));
}

export type CiPlatformProbe = {
  platform: CiPlatformId;
  skillsInstalled: number;
  skillsDir: string;
  pluginOk: boolean;
  cliOnPath: string | null;
  invokeTemplate: string;
  workflowExample: string;
  ok: boolean;
  detail: string;
};

const CLI_BINS: Record<CiPlatformId, string[]> = {
  opencode: ["opencode"],
  claude: ["claude"],
  codex: ["codex"],
  cursor: ["cursor", "cursor-agent"],
};

const INVOKE_TEMPLATES: Record<CiPlatformId, string> = {
  opencode: `# OpenCode CI（需 OPENCODE_API_KEY 或本地登录）
# PR 校验（无 LLM）:
npx taiyi ci verify
# 可选推进（对话/工具）:
opencode run "taiyi_harness slug=<slug>；按清单执行后 taiyi_complete"`,
  claude: `# Claude Code CI
export ANTHROPIC_API_KEY=***
npx taiyi ci verify
claude -p "$(cat .taiyi/ci-prompt-<slug>.txt)"`,
  codex: `# Codex CLI CI
export OPENAI_API_KEY=***
npx taiyi ci verify
codex exec --full-auto "$(cat .taiyi/ci-prompt-<slug>.txt)"`,
  cursor: `# Cursor CI（Cursor Agent / Cloud）
export CURSOR_API_KEY=***
npx taiyi ci verify
# 本地 Agent CLI（若已安装）:
cursor agent -p "$(cat .taiyi/ci-prompt-<slug>.txt)"`,
};

const WORKFLOW_EXAMPLES: Record<CiPlatformId, string> = {
  opencode: "examples/ci/github-actions/taiyi-opencode.yml",
  claude: "examples/ci/github-actions/taiyi-claude.yml",
  codex: "examples/ci/github-actions/taiyi-codex.yml",
  cursor: "examples/ci/github-actions/taiyi-cursor.yml",
};

function which(bin: string): string | null {
  const r = spawnSync("which", [bin], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

function detectCli(platform: CiPlatformId): string | null {
  for (const b of CLI_BINS[platform]) {
    const p = which(b);
    if (p) return p;
  }
  return null;
}

export function smokeInstallPlatformSkills(
  pkgRoot: string,
  platform: CiPlatformId,
): { skillsDir: string; count: number } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `taiyi-ci-${platform}-`));
  const skillsDir = path.join(tmp, "skills");
  const src = skillSourceRoot(pkgRoot);
  syncTaiyiSkills(src, skillsDir);
  const count = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir).filter((n) => n.startsWith("taiyi-")).length
    : 0;
  return { skillsDir, count };
}

export function probePlatformCi(pkgRoot: string, platform: CiPlatformId): CiPlatformProbe {
  const expectedSkills = expectedTaiyiSkillCount(pkgRoot);
  const { skillsDir, count } = smokeInstallPlatformSkills(pkgRoot, platform);
  const cliOnPath = detectCli(platform);
  let pluginOk = true;
  if (platform === "opencode") {
    pluginOk = fs.existsSync(path.join(pkgRoot, "dist/plugin/index.js"));
  }
  const ok = count >= expectedSkills && pluginOk;
  return {
    platform,
    skillsInstalled: count,
    skillsDir,
    pluginOk,
    cliOnPath,
    invokeTemplate: INVOKE_TEMPLATES[platform],
    workflowExample: WORKFLOW_EXAMPLES[platform],
    ok,
    detail: ok
      ? `${count} skills synced; CLI=${cliOnPath ?? "n/a"}`
      : `skills=${count}/${expectedSkills} plugin=${pluginOk}`,
  };
}

export function writeCiAgentPrompt(
  workspaceDir: string,
  taiyiRoot: string,
  state: ChangeState,
): string {
  const plan = buildHarnessPlan(workspaceDir, taiyiRoot, state);
  const body = formatHarnessPlanPlain(plan);
  const dir = path.join(taiyiRoot, "ci-prompts");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${state.slug}-${state.currentPhase}.txt`);
  const prompt = `TaiyiForge CI auto-advance (${state.slug} / ${state.currentPhase})

按 taiyi-orchestrator 执行以下清单，完成后更新工件并打卡 harness-check：

${body}
`;
  fs.writeFileSync(file, prompt, "utf8");
  return file;
}

export function formatPlatformProbePlain(p: CiPlatformProbe): string {
  return [
    `Platform: ${p.platform} — ${p.ok ? "PASS" : "FAIL"}`,
    `  skills: ${p.skillsInstalled} @ ${p.skillsDir}`,
    `  CLI: ${p.cliOnPath ?? "(not on PATH — headless verify still OK)"}`,
    `  workflow: ${p.workflowExample}`,
    "",
    p.invokeTemplate,
  ].join("\n");
}
