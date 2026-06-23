#!/usr/bin/env node
/**
 * PITFALLS 智能清理 — 分类型生命周期管理
 *
 * active → stale → archive  (immortal 永不过期)
 *
 * 状态转换规则 (按条目 tag):
 *   [process] → immortal, 永不过期
 *   [lib]     → 检查 package.json 对应库的大版本, 升级即 stale
 *   [sec]     → 过 N 个月 stale (阈值减半, 保守)
 *   [arch]/[perf]/[tool] → 过 N 个月 stale (默认阈值)
 *
 * 用法: node .pitfalls/prune.mjs                 # dry-run
 *       node .pitfalls/prune.mjs --apply           # 执行
 *       node .pitfalls/prune.mjs --months 6        # 阈值(默认12)
 *       node .pitfalls/prune.mjs --fixture-dir <dir>  # 测试专用：扫描 fixture 目录
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const mi = process.argv.indexOf("--months");
const BASE = mi >= 0 ? parseInt(process.argv[mi+1])||12 : 12;
const fi = process.argv.indexOf("--fixture-dir");
const FIXTURE_DIR = fi >= 0 ? process.argv[fi+1] : null;

const DEFAULT_DIRS = [".pitfalls/GLOBAL.md","src/core/PITFALLS.md","src/cli/PITFALLS.md","src/templates/PITFALLS.md","src/schemas/PITFALLS.md","src/install/PITFALLS.md","src/integrations/PITFALLS.md"];
const DIRS = FIXTURE_DIR
  ? fs.readdirSync(FIXTURE_DIR).filter(f=>f.endsWith(".md")).map(f=>path.join(FIXTURE_DIR,f))
  : DEFAULT_DIRS;
const PKG = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"));
const ARCHIVE = path.join(REPO, ".pitfalls/archive.md");
const now = new Date();

function monthsForTag(tag) {
  if (tag === "process") return Infinity;
  if (tag === "sec" || tag === "ops") return Math.ceil(BASE/2);
  return BASE;
}

function majorVersion(dep) {
  const all = {...PKG.dependencies,...PKG.devDependencies};
  const v = all[dep]; return v ? parseInt(v.replace(/^[^0-9]*/,"").split(".")[0]) : null;
}

const findings = { immortal:[], libStale:[], timeStale:[], resolved:[] };

for (const rel of DIRS) {
  const fp = path.isAbsolute(rel) ? rel : path.join(REPO, rel);
  if(!fs.existsSync(fp))continue;
  const c = fs.readFileSync(fp,"utf8");
  for(const m of c.matchAll(/^### ((?:G|C|T|X|CLI|I|S|INT)-\d+)[^\n]*/gm)){
    const id=m[1],start=m.index,next=c.slice(start+1).match(/^### (?:G|C|T|CLI|I|S|INT)-\d+/m);
    const end=next?start+1+next.index:c.length,block=c.slice(start,end);
    if(/- \*\*状态\*\*:\s*resolved/.test(block)){findings.resolved.push(id);continue;}
    if(/- \*\*状态\*\*:\s*superseded/.test(block))continue;
    const tag=(block.match(/·\s*\[(arch|lib|tool|data|perf|sec|ux|ops|process)\]/)??[])[1]??"arch";
    if(tag==="process"){findings.immortal.push({id,tag});continue;}
    if(tag==="lib"){
      const stack=(block.match(/- \*\*适用栈\*\*:\s*(.+)/)??[])[1]??"";
      let mismatch=false;
      for(const[,name,old] of stack.matchAll(/([a-z@][\w/-]+)\s+(\d+)\+/gi)){
        const cur=majorVersion(name); if(cur&&cur>parseInt(old)){findings.libStale.push({id,tag,reason:`${name} v${cur} (条目针对 v${old})`,file:rel});mismatch=true;break;}
      }
      if(mismatch)continue;
    }
    const dateMatch=block.match(/- \*\*首发\*\*:\s*(?:[^·]+·\s*)?(\d{4}-\d{2}-\d{2})/);
    if(!dateMatch)continue;
    const mths=(now-new Date(dateMatch[1]))/(1000*60*60*24*30.44);
    const thresh=monthsForTag(tag);
    if(mths>=thresh)findings.timeStale.push({id,tag,date:dateMatch[1],monthsAgo:Math.round(mths),threshold:thresh,file:rel});
  }
}

if(findings.immortal.length) { console.log(`🛡 immortal: ${findings.immortal.length}`); for(const s of findings.immortal) console.log(`   ${s.id} [${s.tag}]`); }
if(findings.libStale.length)   { console.log(`\n📦 库升级过时: ${findings.libStale.length}`); for(const s of findings.libStale) console.log(`   ${s.id} ${s.reason}`); }
if(findings.timeStale.length)  { console.log(`\n⏰ 时间过时: ${findings.timeStale.length}`); for(const s of findings.timeStale) console.log(`   ${s.id} [${s.tag}] ${s.date} (${s.monthsAgo}mo > ${s.threshold}mo)`); }
if(findings.resolved.length)   { console.log(`\n✅ resolved: ${findings.resolved.length} (跳过)`); }

const total = findings.libStale.length + findings.timeStale.length;
if(total===0){console.log(`\n✅ 无需清理`);process.exit(0);}
if(!APPLY){console.log(`\n⚠ dry-run。执行: node .pitfalls/prune.mjs --apply`);process.exit(0);}

for(const rel of DIRS){
  const fp = path.isAbsolute(rel) ? rel : path.join(REPO, rel); if(!fs.existsSync(fp))continue;
  let c=fs.readFileSync(fp,"utf8"),changed=false;
  for(const s of [...findings.libStale,...findings.timeStale].filter(e=>e.file===rel)){
    const reason=s.reason||`>${s.threshold}mo`;
    if(c.includes("### "+s.id) && /- \*\*状态\*\*:\s*active/.test(c)){
      c=c.replace(new RegExp(`(### ${s.id}[^]*?)- \\*\\*状态\\*\\*: active`,'m'),`\$1- **状态**: stale (${reason})`);changed=true;
    }
  }
  if(changed)fs.writeFileSync(fp,c,"utf8");
}
const archiveBlock=[...findings.libStale,...findings.timeStale].map(s=>`### ${s.id} · ${s.file} · ${s.date||'?'}\n- **原因**: ${s.reason||'时间过时'}\n- **日期**: ${now.toISOString().slice(0,10)}\n`).join("\n");
if(fs.existsSync(ARCHIVE))fs.appendFileSync(ARCHIVE,"\n"+archiveBlock,"utf8");
else fs.writeFileSync(ARCHIVE,`# PITFALLS Archive\n\n${archiveBlock}`,"utf8");
console.log(`\n✅ ${total} → stale | 归档: ${ARCHIVE}`);
