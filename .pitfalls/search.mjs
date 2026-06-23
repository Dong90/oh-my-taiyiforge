#!/usr/bin/env node
/**
 * PITFALLS 优化检索引擎
 * - 中文 bigram 分词 (状态机 → 状态/态机)
 * - 精准关键词 Boost (命中条目标题词 → 分数 ×1.5)
 * - 零依赖，纯 Node.js
 *
 * 用法: node .pitfalls/search.mjs "查询描述"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = [".pitfalls/GLOBAL.md","src/core/PITFALLS.md","src/cli/PITFALLS.md","src/templates/PITFALLS.md","src/schemas/PITFALLS.md","src/install/PITFALLS.md","src/integrations/PITFALLS.md"];

// ── Bigram tokenizer ──
function tokenize(text) {
  const cleaned = (text||"").toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g," ");
  const tokens = [];
  for (const seg of cleaned.split(/\s+/).filter(Boolean)) {
    if (/[\u4e00-\u9fff]/.test(seg)) {
      for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i+2));
      for (const ch of seg) tokens.push(ch);
    } else {
      tokens.push(seg);
    }
  }
  return tokens.filter(t=>t.length>0);
}

// ── TF-IDF + Keyword Boost Engine ──
class PitfallSearch {
  constructor() {
    this.entries = this._parse();
    this.idf = {}; this.kwMap = {};
    this._build();
  }
  _parse() {
    const entries = [];
    for (const rel of DIRS) {
      const fp = path.join(REPO, rel);
      if (!fs.existsSync(fp)) continue;
      const c = fs.readFileSync(fp, "utf8");
      for (const m of c.matchAll(/^### ((?:G|C|T|CLI|I|S|INT)-\d+)[^\n]*/gm)) {
        const id = m[1], start = m.index;
        const next = c.slice(start+1).match(/^### (?:G|C|T|CLI|I|S|INT)-\d+/m);
        const end = next ? start+1+next.index : c.length;
        const block = c.slice(start, end);
        const title = (block.match(/^### .+?·\s*\[.+?\]\s*(.+)/m)??[,])[1]?.trim()??m[0];
        const kw = (block.match(/- \*\*关键词\*\*:\s*(.+)/m)??[,])[1]?.trim()??"";
        const prob = (block.match(/\*\*问题场景\*\*\n(.+?)(?=\n\*\*)/s)??[,])[1];
        const why = (block.match(/\*\*为什么不行\*\*\n(.+?)(?=\n\*\*)/s)??[,])[1];
        entries.push({id,file:rel,title,keywords:kw,text:[title,kw,prob,why].filter(Boolean).join(" ")});
      }
    }
    return entries;
  }
  _build() {
    for (const doc of this.entries) {
      const seen = new Set();
      for (const t of tokenize(doc.text)) { if (!seen.has(t)) { this.idf[t]=(this.idf[t]||0)+1; seen.add(t); } }
      for (const kw of doc.keywords.split(/\s+/).filter(Boolean)) {
        this.kwMap[kw.toLowerCase()]=(this.kwMap[kw.toLowerCase()]||[]).concat(doc.id);
      }
    }
    const N = this.entries.length;
    for (const k of Object.keys(this.idf)) this.idf[k]=Math.log((N+1)/(this.idf[k]+1))+1;
  }
  _embed(text) {
    const tokens = tokenize(text); const tf = {};
    for (const tk of tokens) tf[tk] = (tf[tk]||0)+1;
    const norm = Math.sqrt(Object.values(tf).reduce((s,v)=>s+v*v,0))||1;
    const vec = {};
    for (const [k,f] of Object.entries(tf)) vec[k] = (f/norm)*(this.idf[k]||1);
    return vec;
  }
  _cos(a,b) { let d=0,na=0,nb=0; for(const k of new Set([...Object.keys(a),...Object.keys(b)])){d+=(a[k]||0)*(b[k]||0);na+=(a[k]||0)**2;nb+=(b[k]||0)**2;} return d/(Math.sqrt(na)*Math.sqrt(nb))||0; }
  search(query, topK=5) {
    const qv = this._embed(query);
    const qt = tokenize(query).map(t=>t.toLowerCase());
    const keywordHits = new Set();
    for (const t of qt) { const ids = this.kwMap[t]||[]; for(const id of ids) keywordHits.add(id); }
    return this.entries.map((d,i)=>{let s=this._cos(qv,this._embed(d.text));if(keywordHits.has(d.id))s*=1.5;return{...d,score:s};}).sort((a,b)=>b.score-a.score).slice(0,topK);
  }
}

const q = process.argv.slice(2).join(" ");
if (!q) { console.log("用法: node .pitfalls/search.mjs \"查询\""); process.exit(0); }

const engine = new PitfallSearch();
console.log(`${engine.entries.length} 条目 | 查询: "${q}"\n`);
for (let i=0; i<Math.min(5, engine.entries.length); i++) {
  const r = engine.search(q, 5)[i];
  console.log(`${i+1}. [${r.score.toFixed(3)}] ${r.id} — ${r.title}`);
  console.log(`   ${r.file}  |  ${r.keywords}\n   ${"█".repeat(Math.round(r.score*30))}\n`);
}
