import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "../core/types.js";
import { resolvePackageRoot } from "../core/package-root.js";
import type { HarnessHook } from "./harness-hooks.js";
import { tokenForge } from "../core/token-invoke.js";

export type TokenCompressStrategy = {
  id: string;
  tool: string;
  skill?: string;
  command?: string;
  when: string;
  optional: boolean;
  harnessCheck?: string;
};

export type TokenCompressHooksConfig = {
  engine: {
    tool: string;
    command: string;
    when: string;
  };
  thirdParty: TokenCompressStrategy[];
  phaseRecommend: Partial<Record<PhaseId, string[]>>;
};

function loadYaml(): TokenCompressHooksConfig {
  const pkgRoot = resolvePackageRoot(import.meta.url);
  const file = path.join(pkgRoot, "docs", "taiyi", "token-compress-hooks.yaml");
  const defaults: TokenCompressHooksConfig = {
    engine: {
      tool: "taiyi",
      command: tokenForge("compress", "<slug>"),
      when: "CONTEXT-COMPACT.md",
    },
    thirdParty: [],
    phaseRecommend: {},
  };
  if (!fs.existsSync(file)) return defaults;

  const engine: TokenCompressHooksConfig["engine"] = { ...defaults.engine };
  const thirdParty: TokenCompressStrategy[] = [];
  const phaseRecommend: Partial<Record<PhaseId, string[]>> = {};
  let section: "root" | "third" | "phase" = "root";
  let currentPhase: PhaseId | null = null;
  let draft: Partial<TokenCompressStrategy> | null = null;

  const flushDraft = () => {
    if (draft?.id && draft.tool && draft.when) {
      thirdParty.push({
        id: draft.id,
        tool: draft.tool,
        skill: draft.skill,
        command: draft.command,
        when: draft.when,
        optional: draft.optional ?? true,
        harnessCheck: draft.harnessCheck,
      });
    }
    draft = null;
  };

  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.match(/^engine:/)) {
      section = "root";
      continue;
    }
    if (line.match(/^third_party:/)) {
      section = "third";
      continue;
    }
    if (line.match(/^phase_recommend:/)) {
      section = "phase";
      continue;
    }

    if (section === "root" && engine) {
      const cmd = line.match(/^\s+command:\s*(.+)$/)?.[1];
      const when = line.match(/^\s+when:\s*(.+)$/)?.[1];
      const tool = line.match(/^\s+tool:\s*(\S+)/)?.[1];
      if (tool) engine.tool = tool;
      if (cmd) engine.command = cmd;
      if (when) engine.when = when;
      continue;
    }

    if (section === "third") {
      if (line.match(/^\s+-\s+id:/)) {
        flushDraft();
        draft = { id: line.match(/id:\s*(\S+)/)?.[1] ?? "" };
        continue;
      }
      if (!draft) continue;
      const tool = line.match(/^\s+tool:\s*(\S+)/)?.[1];
      const skill = line.match(/^\s+skill:\s*(\S+)/)?.[1];
      const when = line.match(/^\s+when:\s*(.+)$/)?.[1];
      const opt = line.match(/optional:\s*(true|false)/)?.[1];
      const hc = line.match(/harness_check:\s*(\S+)/)?.[1];
      if (tool) draft.tool = tool;
      if (skill) draft.skill = skill;
      if (when) draft.when = when;
      if (opt === "true") draft.optional = true;
      if (opt === "false") draft.optional = false;
      if (hc) draft.harnessCheck = hc;
      continue;
    }

    if (section === "phase") {
      const pm = line.match(/^  ([a-z-]+):$/);
      if (pm) {
        currentPhase = pm[1] as PhaseId;
        phaseRecommend[currentPhase] = [];
        continue;
      }
      const item = line.match(/^\s+-\s+(\S+)/)?.[1];
      if (currentPhase && item) phaseRecommend[currentPhase]!.push(item);
    }
  }
  flushDraft();

  return { engine, thirdParty, phaseRecommend };
}

let cached: TokenCompressHooksConfig | null = null;

export function getTokenCompressHooks(): TokenCompressHooksConfig {
  if (!cached) cached = loadYaml();
  return cached;
}

export function resolveStrategiesForPhase(
  phase: PhaseId,
  slug: string,
): Array<{ label: string; detail: string; harnessCheck?: string; optional: boolean }> {
  const cfg = getTokenCompressHooks();
  const ids = cfg.phaseRecommend[phase] ?? ["engine"];
  const out: Array<{ label: string; detail: string; harnessCheck?: string; optional: boolean }> =
    [];

  for (const id of ids) {
    if (id === "engine") {
      out.push({
        label: `${cfg.engine.tool}: /taiyi:token compress`,
        detail: cfg.engine.when.replace("<slug>", slug),
        optional: true,
      });
      continue;
    }
    const s = cfg.thirdParty.find((t) => t.id === id);
    if (!s) continue;
    out.push({
      label: s.skill ? `${s.tool}/${s.skill}` : s.tool,
      detail: s.when,
      harnessCheck: s.harnessCheck,
      optional: s.optional,
    });
  }
  return out;
}

export function formatCompressHooksPlain(slug: string, phase: PhaseId): string {
  const strategies = resolveStrategiesForPhase(phase, slug);
  if (strategies.length === 0) return "";
  const lines = ["压缩策略（引擎 + 第三方，均可选）:"];
  for (const s of strategies) {
    const opt = s.optional ? " (可选)" : "";
    lines.push(`  - ${s.label}${opt} — ${s.detail}`);
    if (s.harnessCheck) {
      lines.push(`    打卡: scripts/taiyi-forge.sh harness-check ${slug} ${s.harnessCheck}`);
    }
  }
  return lines.join("\n");
}

export function tokenCompressHarnessHooks(phase: PhaseId, slug: string): HarnessHook[] {
  const cfg = getTokenCompressHooks();
  const ids = cfg.phaseRecommend[phase] ?? [];
  const hooks: HarnessHook[] = [];

  if (ids.includes("engine")) {
    hooks.push({
      tool: cfg.engine.tool,
      command: cfg.engine.command.replace(/<slug>/g, slug),
      when: `Token: ${cfg.engine.when}`,
      optional: true,
    });
  }

  for (const id of ids) {
    const s = cfg.thirdParty.find((t) => t.id === id);
    if (!s) continue;
    hooks.push({
      tool: s.tool,
      skill: s.skill,
      when: `Token 压缩: ${s.when}`,
      optional: s.optional,
    });
  }
  return hooks;
}
