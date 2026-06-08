import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { WorkflowEngine } from "../src/core/workflow-engine.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function runHookScript(
  scriptRel: string,
  cwd: string,
  stdin: string,
  env?: NodeJS.ProcessEnv,
): { code: number; json: Record<string, unknown> } {
  const script = path.join(REPO, scriptRel);
  const r = spawnSync("node", [script], {
    cwd,
    input: stdin,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  const raw = (r.stdout ?? "").trim() || "{}";
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    json = { parseError: raw, stderr: r.stderr };
  }
  return { code: r.status ?? 1, json };
}

describe("hook contract (headless stdin/stdout)", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-hook-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    const engine = new WorkflowEngine(taiyiRoot);
    engine.initChange("hook-demo", { profile: "lite" });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("cursor keyword hook 对 ralph 关键词返回 continue + inject", () => {
    const { code, json } = runHookScript(
      "scripts/cursor-keyword-hook.mjs",
      workspace,
      JSON.stringify({ prompt: "please ralph until tests pass" }),
    );
    expect(code).toBe(0);
    expect(json.continue).toBe(true);
    expect(String(json.additional_context ?? "")).toMatch(/ralph|Ralph/i);
    expect(fs.existsSync(path.join(taiyiRoot, "runtime", "ralph-mode.json"))).toBe(true);
  });

  it("cursor keyword hook TAIYI_KEYWORD_HOOK=off 仅 continue", () => {
    const { json } = runHookScript(
      "scripts/cursor-keyword-hook.mjs",
      workspace,
      JSON.stringify({ prompt: "ralph loop" }),
      { TAIYI_KEYWORD_HOOK: "off" },
    );
    expect(json.continue).toBe(true);
    expect(json.additional_context).toBeUndefined();
  });

  it("cursor mode-stop hook 活跃 ralph 时输出 followup_message", () => {
    const changeDir = path.join(taiyiRoot, "changes", "hook-demo");
    fs.mkdirSync(path.join(taiyiRoot, "runtime"), { recursive: true });
    fs.writeFileSync(
      path.join(taiyiRoot, "runtime", "ralph-mode.json"),
      JSON.stringify({ active: true, slug: "hook-demo" }),
    );
    fs.writeFileSync(
      path.join(changeDir, ".ralph-state.json"),
      JSON.stringify({ round: 2 }),
    );
    const { code, json } = runHookScript(
      "scripts/cursor-mode-stop-hook.mjs",
      workspace,
      JSON.stringify({ status: "completed" }),
    );
    expect(code).toBe(0);
    expect(String(json.followup_message ?? "")).toMatch(/RALPH|ralph/i);
  });

  it("claude keyword hook 输出 hookSpecificOutput", () => {
    const { code, json } = runHookScript(
      "scripts/claude-keyword-hook.mjs",
      workspace,
      JSON.stringify({ prompt: "use team mode for this", cwd: workspace }),
    );
    expect(code).toBe(0);
    const ctx =
      (json.hookSpecificOutput as { additionalContext?: string } | undefined)
        ?.additionalContext ?? "";
    expect(String(ctx)).toMatch(/team|Team/i);
  });

  it("claude mode-stop hook 活跃 ralph 时输出 Stop followup", () => {
    const changeDir = path.join(taiyiRoot, "changes", "hook-demo");
    fs.mkdirSync(path.join(taiyiRoot, "runtime"), { recursive: true });
    fs.writeFileSync(
      path.join(taiyiRoot, "runtime", "ralph-mode.json"),
      JSON.stringify({ active: true, slug: "hook-demo" }),
    );
    fs.writeFileSync(
      path.join(changeDir, ".ralph-state.json"),
      JSON.stringify({ round: 1 }),
    );
    const { code, json } = runHookScript(
      "scripts/claude-mode-stop-hook.mjs",
      workspace,
      JSON.stringify({ cwd: workspace }),
    );
    expect(code).toBe(0);
    const ctx =
      (json.hookSpecificOutput as { additionalContext?: string } | undefined)
        ?.additionalContext ?? "";
    expect(String(ctx)).toMatch(/RALPH|ralph|step/i);
  });

  it("cursor phase-guard 在 change 阶段拦截改 src/", () => {
    const { code, json } = runHookScript(
      "scripts/cursor-phase-guard-hook.mjs",
      workspace,
      JSON.stringify({
        tool_name: "write",
        tool_input: { path: "src/counter.js", contents: "// bad" },
      }),
      { TAIYI_PHASE_GUARD: "deny" },
    );
    expect(code).toBe(0);
    expect(json.permission).toBe("deny");
    expect(String(json.user_message ?? "")).toMatch(/change|dev/i);
  });

  it("claude phase-guard 在 change 阶段 PreToolUse deny", () => {
    const r = spawnSync(
      "node",
      [path.join(REPO, "scripts/claude-phase-guard-hook.mjs")],
      {
        cwd: workspace,
        input: JSON.stringify({
          cwd: workspace,
          tool_name: "Write",
          tool_input: { file_path: "src/counter.js" },
        }),
        encoding: "utf8",
        env: { ...process.env, TAIYI_PHASE_GUARD: "deny" },
      },
    );
    expect(r.status).toBe(2);
    const json = JSON.parse(r.stdout || "{}") as {
      hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
    };
    expect(json.hookSpecificOutput?.permissionDecision).toBe("deny");
    expect(String(json.hookSpecificOutput?.permissionDecisionReason ?? "")).toMatch(
      /change|dev/i,
    );
  });

  it("codex keyword-preflight 检测 ralph 并写 mode 文件", () => {
    const script = path.join(REPO, "scripts/codex-keyword-preflight.mjs");
    const r = spawnSync("node", [script, "ralph until green"], {
      cwd: workspace,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/ralph|Ralph/i);
    expect(fs.existsSync(path.join(taiyiRoot, "runtime", "ralph-mode.json"))).toBe(true);
  });
});
