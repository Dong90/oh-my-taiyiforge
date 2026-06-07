#!/usr/bin/env node
/**
 * Cursor preToolUse hook — dev 前阻止/警告改业务代码（对标 OMC 运行时约束）。
 * 安装: npx taiyi-forge-install --cursor（写入 .cursor/hooks/）
 *
 * TAIYI_PHASE_GUARD=deny|ask|off|allow
 * TAIYI_EARLY_CODE_BLOCK=0|false  （默认硬拦 dev 前改业务代码；等同旧版 =1）
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
    console.log(JSON.stringify({ permission: "allow" }));
    return;
  }

  const result = evaluatePhaseGuard(input, process.cwd());
  if (result.action === "allow") {
    console.log(JSON.stringify({ permission: "allow" }));
    return;
  }

  console.log(
    JSON.stringify({
      permission: result.mode,
      user_message: result.message,
      agent_message: result.message,
    }),
  );
}

main().catch(() => {
  console.log(JSON.stringify({ permission: "allow" }));
});
