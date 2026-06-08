#!/usr/bin/env node
/**
 * Cursor stop hook — 活跃模式未完成时注入 followup（对标 OMC ralph/autopilot stop-hook）
 * TAIYI-FORGE:MODE-STOP
 */
import fs from "node:fs";
import { resolveTaiyiRoot, listActiveModes, buildModeStopFollowup } from "./mode-stop-lib.mjs";

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

async function main() {
  if (process.env.TAIYI_MODE_STOP_HOOK === "off") {
    console.log(JSON.stringify({}));
    return;
  }

  try {
    JSON.parse(readStdin() || "{}");
  } catch {
    /* ignore */
  }

  const taiyiRoot = resolveTaiyiRoot(process.cwd());
  if (!fs.existsSync(taiyiRoot)) {
    console.log(JSON.stringify({}));
    return;
  }

  const active = listActiveModes(taiyiRoot);
  const followup = buildModeStopFollowup(active, taiyiRoot);
  if (!followup) {
    console.log(JSON.stringify({}));
    return;
  }

  const maxLoops = Number(process.env.TAIYI_MODE_STOP_MAX ?? "50");
  console.log(
    JSON.stringify({
      followup_message: followup,
      loop_limit: maxLoops,
    }),
  );
}

main().catch(() => {
  console.log(JSON.stringify({}));
});
