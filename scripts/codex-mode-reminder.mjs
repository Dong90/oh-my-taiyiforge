#!/usr/bin/env node
/**
 * Codex 回合结束前检查活跃模式 — 无 Stop hook 时的 step 提醒
 * Usage: node scripts/codex-mode-reminder.mjs
 * Exit 0 = 无活跃模式；stdout 有内容 = 须继续 step
 * TAIYI-FORGE:CODEX-MODE-REMINDER
 */
import fs from "node:fs";
import { resolveTaiyiRoot, listActiveModes, buildModeStopFollowup } from "./mode-stop-lib.mjs";

const taiyiRoot = resolveTaiyiRoot(process.cwd());
if (!fs.existsSync(taiyiRoot)) {
  process.exit(0);
}

const active = listActiveModes(taiyiRoot);
const followup = buildModeStopFollowup(active, taiyiRoot);
if (!followup) {
  process.exit(0);
}

console.log("[CODEX MODE REMINDER — 对标 OMC Stop hook]");
console.log(followup);
console.log("");
console.log("结束前必须代跑: scripts/taiyi-forge.sh step");
process.exit(0);
