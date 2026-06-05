import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PhaseId } from "../core/types.js";
import { resolvePackageRoot } from "../core/package-root.js";
import { getOpenspecStatus } from "./openspec.js";

export type HarnessHook = {
  tool: string;
  skill?: string;
  command?: string;
  when: string;
  /** 为 true 时 auto 模式不强制 harness-check（如 OpenSpec 未装、ui-design 设计评审） */
  optional?: boolean;
};

export type HarnessContext = {
  phase: PhaseId;
  slug: string;
  hooks: HarnessHook[];
  notes: string[];
};

function loadHooksYaml(): Record<string, HarnessHook[]> {
  const pkgRoot = resolvePackageRoot(import.meta.url);
  const file = path.join(pkgRoot, "docs", "taiyi", "harness-hooks.yaml");
  if (!fs.existsSync(file)) return {};

  const hooks: Record<string, HarnessHook[]> = {};
  let currentPhase: string | null = null;
  let draft: Partial<HarnessHook> | null = null;

  const flush = () => {
    if (currentPhase && draft?.tool && draft.when) {
      hooks[currentPhase] ??= [];
      hooks[currentPhase].push(draft as HarnessHook);
    }
    draft = null;
  };

  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const phaseMatch = line.match(/^  ([a-z-]+):$/);
    if (phaseMatch) {
      flush();
      currentPhase = phaseMatch[1];
      hooks[currentPhase] ??= [];
      continue;
    }
    if (!currentPhase) continue;

    if (line.match(/^\s+-\s+tool:/)) {
      flush();
      draft = { tool: line.match(/tool:\s*(\S+)/)?.[1] ?? "" };
      continue;
    }
    if (!draft) continue;

    const skill = line.match(/skill:\s*(\S+)/)?.[1];
    const command = line.match(/command:\s*(.+)$/)?.[1];
    const when = line.match(/when:\s*(.+)$/)?.[1];
    const optional = line.match(/optional:\s*(true|false)/)?.[1];
    if (skill) draft.skill = skill;
    if (command) draft.command = command;
    if (when) draft.when = when;
    if (optional === "true") draft.optional = true;
    if (optional === "false") draft.optional = false;
  }
  flush();

  return hooks;
}

let cached: Record<string, HarnessHook[]> | null = null;

function getHooksMap(): Record<string, HarnessHook[]> {
  if (!cached) cached = loadHooksYaml();
  return cached;
}

export function getHarnessContext(
  workspaceDir: string,
  slug: string,
  phase: PhaseId,
): HarnessContext {
  const map = getHooksMap();
  const hooks = (map[phase] ?? []).map((h) => ({
    ...h,
    command: h.command?.replace(/<slug>/g, slug),
  }));

  const notes: string[] = [];
  const openspec = getOpenspecStatus(workspaceDir, slug);

  if (phase === "integration" && openspec.detected && !openspec.changeExists) {
    notes.push(`OpenSpec 已初始化但无 openspec/changes/${slug}/，archive 前需先创建变更目录`);
  }
  if (phase === "review") {
    notes.push("gstack/review 为 Agent Skill：在 Claude/Codex/OpenCode 中加载后执行，非独立 shell 子命令");
  }
  if (phase === "ui-design") {
    notes.push("gstack/plan-design-review 为可选铁三角：有 UI 面建议打卡，纯 API/CLI 可跳过");
  }
  if (phase === "test") {
    notes.push("gstack/qa 为可选铁三角：有 web 面建议打卡，CLI-only 可 harness-check 标注 N/A 后跳过");
  }
  if (phase === "requirement" || phase === "integration") {
    notes.push("OpenSpec 为可选层：未安装 openspec CLI 时 requirement/integration 的 OpenSpec 钩子自动跳过");
  }

  return { phase, slug, hooks, notes };
}
