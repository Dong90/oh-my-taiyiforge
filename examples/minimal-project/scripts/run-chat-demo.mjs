#!/usr/bin/env node
/**
 * 聊天动词演示：/taiyi:new → status → continue（未就绪时指引）→ check
 * Usage: node scripts/run-chat-demo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(__dirname, "..");
const pkgRoot = path.resolve(workspace, "../..");
const forgeSh = path.join(pkgRoot, "scripts/taiyi-forge.sh");
const title = "Chat Verb Demo";

const taiyi = (args) => {
  const r = spawnSync(forgeSh, args, {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: pkgRoot },
  });
  return { code: r.status ?? 1, out: (r.stdout || "") + (r.stderr || "") };
};

function banner(label, chat) {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`${label}`);
  console.log(`💬 ${chat}`);
  console.log("─".repeat(50));
}

// 清理旧 chat-demo 变更
const taiyiRoot = path.join(workspace, ".taiyi", "changes");
if (fs.existsSync(taiyiRoot)) {
  for (const ent of fs.readdirSync(taiyiRoot)) {
    if (ent.includes("chat-verb") || ent === "chat-verb-demo") {
      fs.rmSync(path.join(taiyiRoot, ent), { recursive: true, force: true });
    }
  }
}

banner("1. 创建变更", "/taiyi:new Chat Verb Demo");
let r = taiyi(["new", title, "--auto"]);
console.log(r.out.trimEnd());
if (r.code !== 0) process.exit(1);

banner("2. 查看进度（含意图分析）", "/taiyi:status");
r = taiyi(["status"]);
console.log(r.out.trimEnd());

banner("3. 铁三角清单", "/taiyi:check");
r = taiyi(["check"]);
console.log(r.out.trimEnd());

banner("4. 推进（工件未就绪 → 应输出指引）", "/taiyi:continue");
r = taiyi(["continue"]);
console.log(r.out.trimEnd());
if (r.code === 0) {
  console.error("预期 continue 在空 CHANGE 时应非零退出");
  process.exit(1);
}

console.log("\n✓ 聊天动词路径演示完成");
console.log("完整九阶段请运行: npm run walkthrough");
