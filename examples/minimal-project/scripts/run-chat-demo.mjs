#!/usr/bin/env node
/**
 * 聊天动词演示：/taiyi:new → status → token → check → continue → loop
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
const slug = "chat-verb-demo";
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

const taiyiRoot = path.join(workspace, ".taiyi", "changes");
if (fs.existsSync(taiyiRoot)) {
  for (const ent of fs.readdirSync(taiyiRoot)) {
    if (ent.includes("chat-verb")) {
      fs.rmSync(path.join(taiyiRoot, ent), { recursive: true, force: true });
    }
  }
}

banner("1. 创建变更", "/taiyi:new Chat Verb Demo");
let r = taiyi(["new", title, "--auto"]);
console.log(r.out.trimEnd());
if (r.code !== 0) process.exit(1);

banner("2. 查看进度", `/taiyi:status ${slug}`);
r = taiyi(["status", slug]);
console.log(r.out.trimEnd());

banner("3. Token 扫描与压缩", "/taiyi:token scan + compress");
r = taiyi(["token", "scan", slug]);
console.log(r.out.trimEnd());
r = taiyi(["token", "compress", slug]);
console.log(r.out.trimEnd());

banner("4. 铁三角清单", `/taiyi:check ${slug}`);
r = taiyi(["check", slug]);
console.log(r.out.trimEnd());

banner("5. 推进（未就绪 → 指引）", `/taiyi:continue ${slug}`);
r = taiyi(["continue", slug]);
console.log(r.out.trimEnd());
if (r.code === 0) {
  console.error("预期 continue 在空 CHANGE 时应非零退出");
  process.exit(1);
}

banner("6. 循环推进", `/taiyi:loop ${slug} x2`);
r = taiyi(["loop", slug, "x2"]);
console.log(r.out.trimEnd());
if (r.code === 0) {
  console.error("预期 loop 在阻塞时应非零退出");
  process.exit(1);
}

banner("7. 重复 check", `/taiyi:check ${slug} x2`);
r = taiyi(["check", slug, "x2"]);
console.log(r.out.trimEnd().split("\n").slice(0, 12).join("\n") + "\n  …");

console.log("\n✓ 聊天动词 + Token + Loop 演示完成");
console.log("完整九阶段请运行: npm run walkthrough");
