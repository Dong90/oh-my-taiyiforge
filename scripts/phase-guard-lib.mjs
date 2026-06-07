/**
 * Shared TaiyiForge dev-before phase guard (Cursor + Claude Code hooks).
 */
import fs from "node:fs";
import path from "node:path";

export const PHASE_ORDER = {
  change: 1,
  requirement: 2,
  design: 3,
  "ui-design": 4,
  task: 5,
  dev: 6,
  test: 7,
  review: 8,
  integration: 9,
};

export function isTaiyiPath(file) {
  const n = String(file).replace(/\\/g, "/");
  return n.includes(".taiyi/") || n.startsWith(".taiyi/");
}

export function listActivePhase(cwd) {
  const root = path.join(cwd, ".taiyi", "changes");
  if (!fs.existsSync(root)) return null;
  let best = null;
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const statePath = path.join(root, ent.name, "state.json");
    if (!fs.existsSync(statePath)) continue;
    try {
      const s = JSON.parse(fs.readFileSync(statePath, "utf8"));
      if (s.workflowStatus === "aborted" || s.workflowStatus === "completed") continue;
      if (s.completedPhases?.includes("integration")) continue;
      const updated = s.updatedAt ?? "";
      if (!best || updated > best.updatedAt) {
        best = { slug: s.slug ?? ent.name, phase: s.currentPhase, updatedAt: updated };
      }
    } catch {
      /* skip */
    }
  }
  return best;
}

export function targetFile(input) {
  const name = input.tool_name ?? input.toolName ?? "";
  const args = input.tool_input ?? input.toolInput ?? input.arguments ?? {};
  if (/write|edit|strreplace|apply_patch/i.test(name)) {
    return args.path ?? args.file_path ?? args.filePath ?? args.target_path;
  }
  return null;
}

export function guardMode(env = process.env) {
  if (env.TAIYI_PHASE_GUARD === "off") return "off";
  if (env.TAIYI_PHASE_GUARD === "allow") return "allow";
  if (env.TAIYI_PHASE_GUARD === "deny") return "deny";
  if (env.TAIYI_PHASE_GUARD === "ask") return "ask";
  if (env.TAIYI_EARLY_CODE_BLOCK === "0" || env.TAIYI_EARLY_CODE_BLOCK === "false") {
    return "ask";
  }
  return "deny";
}

/**
 * @returns {{ action: "allow" } | { action: "block"; mode: "deny"|"ask"; message: string; slug: string; phase: string; file: string }}
 */
export function evaluatePhaseGuard(input, cwd = process.cwd(), env = process.env) {
  const mode = guardMode(env);
  if (mode === "off" || mode === "allow") {
    return { action: "allow" };
  }

  const file = targetFile(input);
  if (!file || isTaiyiPath(file)) {
    return { action: "allow" };
  }

  const active = listActivePhase(cwd);
  if (!active) {
    return { action: "allow" };
  }

  const order = PHASE_ORDER[active.phase] ?? 99;
  if (order >= PHASE_ORDER.dev) {
    return { action: "allow" };
  }

  const msg = `TaiyiForge: 变更 ${active.slug} 处于 ${active.phase}（未到 dev），不应改 ${file}。只写 .taiyi/changes/ 工件；实现请 /taiyi:apply。`;
  return {
    action: "block",
    mode: mode === "deny" ? "deny" : "ask",
    message: msg,
    slug: active.slug,
    phase: active.phase,
    file,
  };
}
