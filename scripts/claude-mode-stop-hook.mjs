#!/usr/bin/env node
/**
 * Claude Code Stop hook — 活跃模式未完成时阻止结束（对标 OMC ralph/autopilot stop-hook）
 * TAIYI-FORGE:MODE-STOP
 */
import fs from "node:fs";
import { resolveTaiyiRoot, listActiveModes, buildModeStopFollowup } from "./mode-stop-lib.mjs";

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

async function main() {
  if (process.env.TAIYI_MODE_STOP_HOOK === "off") {
    process.exit(0);
  }

  let input = {};
  try {
    input = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0);
  }

  const cwd = input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const taiyiRoot = resolveTaiyiRoot(cwd);
  if (!fs.existsSync(taiyiRoot)) {
    process.exit(0);
  }

  const active = listActiveModes(taiyiRoot);
  const followup = buildModeStopFollowup(active, taiyiRoot);
  if (!followup) {
    process.exit(0);
  }

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext: followup,
      },
    }),
  );
}

main().catch(() => {
  process.exit(0);
});
