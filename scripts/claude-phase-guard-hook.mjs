#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook — dev 前阻止/询问改业务代码（对标 Cursor taiyi-phase-guard）。
 * 安装: npx taiyi-forge-install --claude（写入 .claude/settings.json + hooks/）
 *
 * TAIYI_PHASE_GUARD=deny|ask|off|allow
 * TAIYI_EARLY_CODE_BLOCK=0|false  → 软约束（ask）
 */
// TAIYI-FORGE:PHASE-GUARD
import fs from "node:fs";
import { evaluatePhaseGuard } from "./phase-guard-lib.mjs";

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

async function main() {
  let input = {};
  try {
    input = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0);
  }

  const cwd = input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const result = evaluatePhaseGuard(input, cwd);
  if (result.action === "allow") {
    process.exit(0);
  }

  const decision = result.mode === "deny" ? "deny" : "ask";
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: result.message,
      },
    }),
  );
  if (decision === "deny") {
    process.exit(2);
  }
}

main().catch(() => {
  process.exit(0);
});
