#!/usr/bin/env node
/**
 * docs ↔ src 一致性校验 — 自动检测文档与根代码 drift。
 *
 * 检查 5 类:
 *   1. `src/plugin/handlers.ts` 导出 `taiyi*` 函数名 vs `docs/taiyi/canonical-commands.md`
 *      §「引擎 CLI 真源」段是否有列。
 *   2. `src/` 中 `process.env.TAIYI_*` 引用 vs `docs/taiyi/configuration.md` §5.1 表格。
 *   3. `src/config/providers.ts` `CapabilityId` 联合类型 vs
 *      `docs/taiyi/integrations.md` §CapabilityId 表格。
 *   4. `docs/taiyi/workflow-manifest.yaml` `skill:` 字段 vs `skills/` 实际目录。
 *   5. `src/core/builtin-profiles.ts` `ui.auxiliaryHints` vs
 *      `docs/USAGE.md` Profile 表描述。
 *
 * 退出码:
 *   0 = PASS（warn 允许）
 *   1 = FAIL（缺实现/缺文档）
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

const checks = [];
function record(category, kind, detail) {
  checks.push({ category, kind, detail });
}

/** ---------- Check 1: handlers.ts ↔ canonical-commands.md ---------- */
async function check1() {
  try {
    const handlers = fs.readFileSync(path.join(ROOT, "src/plugin/handlers.ts"), "utf8");
    const handlerNames = new Set(
      [...handlers.matchAll(/^export function taiyi([A-Z][A-Za-z]+)/gm)].map((m) => "taiyi" + m[1]),
    );

    const canonical = fs.readFileSync(path.join(ROOT, "docs/taiyi/canonical-commands.md"), "utf8");
    const documented = new Set(
      [...canonical.matchAll(/\btaiyi([A-Z][A-Za-z]+)\b/g)].map((m) => "taiyi" + m[1]),
    );

    for (const h of handlerNames) {
      if (!documented.has(h)) {
        record("handlers", "MISSING_DOC", `handler ${h} 未在 canonical-commands.md §「引擎 CLI 真源」中列出`);
      }
    }
  } catch (e) {
    record("handlers", "READ_ERROR", e.message);
  }
}

/** ---------- Check 2: env vars ↔ configuration.md §5.1 ---------- */
async function check2() {
  try {
    const srcEnvVars = new Set();
    const re = /(?:env|process\.env)\.TAIYI_[A-Z_]+|TAIYI_[A-Z_]+=/g;
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|mjs|js)$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf8");
          for (const m of text.matchAll(re)) {
            const v = m[0].replace(/^(env|process\.env)\./, "").replace(/=$/, "");
            srcEnvVars.add(v);
          }
        }
      }
    }
    walk(path.join(ROOT, "src"));

    const config = fs.readFileSync(path.join(ROOT, "docs/taiyi/configuration.md"), "utf8");
    const documented = new Set(
      [...config.matchAll(/`TAIYI_[A-Z_]+`/g)].map((m) => m[0].replace(/`/g, "")),
    );

    for (const v of srcEnvVars) {
      if (!documented.has(v)) {
        record("env", "MISSING_DOC", `${v} 在 src/ 引用但 configuration.md 未列`);
      }
    }
  } catch (e) {
    record("env", "READ_ERROR", e.message);
  }
}

/** ---------- Check 3: CapabilityId ↔ integrations.md §CapabilityId ---------- */
async function check3() {
  try {
    const providers = fs.readFileSync(path.join(ROOT, "src/config/providers.ts"), "utf8");
    const m = providers.match(/export type CapabilityId =([\s\S]*?);/);
    if (!m) {
      record("capability", "PARSE_ERROR", "providers.ts: 无法定位 CapabilityId 类型");
      return;
    }
    const caps = new Set([...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]));

    const integrations = fs.readFileSync(path.join(ROOT, "docs/taiyi/integrations.md"), "utf8");
    const documented = new Set([...integrations.matchAll(/`([a-z_]+)`/g)].map((x) => x[1]));

    for (const c of caps) {
      if (!documented.has(c)) {
        record("capability", "MISSING_DOC", `CapabilityId "${c}" 在 providers.ts 但 integrations.md 未列`);
      }
    }
  } catch (e) {
    record("capability", "READ_ERROR", e.message);
  }
}

/** ---------- Check 4: workflow-manifest skill references ---------- */
async function check4() {
  // manifest 引用形态:
  //   skill: brainstorming          (superpowers canonical name, 不在 skills/ 物理目录)
  //   superpowers: [brainstorming]  (superpowers 列表)
  //   ecc/foo                       (ECC canonical name, 不在仓库 skills/ — 通过 npx ecc-universal 装)
  //   taiyi-foo                     (本地 skill, skills/taiyi-foo/ 物理存在)
  // 物理目录约定: 只校验 skills/taiyi-*/. superpowers/* 与 ecc/* 在运行时装。
  try {
    const manifest = fs.readFileSync(path.join(ROOT, "docs/taiyi/workflow-manifest.yaml"), "utf8");
    const taiyiExists = (n) => fs.existsSync(path.join(ROOT, `skills/taiyi-${n}`));

    // 仅匹配 `taiyi-<name>` 字面（既无 ecc/ 前缀也无 superpowers/ 前缀）
    for (const m of manifest.matchAll(/\btaiyi-([a-z][a-z0-9-]+)\b/g)) {
      const name = m[1];
      // 排除已在 skills/taiyi-name 存在的；剩余即物理缺失
      if (!taiyiExists(name)) {
        record("manifest", "TAIYI_SKILL_MISSING", `taiyi-${name} 在 manifest 引用但 skills/taiyi-${name}/ 不存在`);
      }
    }
  } catch (e) {
    record("manifest", "READ_ERROR", e.message);
  }
}

/** ---------- Check 5: profile ui auxiliaryHints ↔ USAGE.md ---------- */
async function check5() {
  try {
    const profiles = fs.readFileSync(path.join(ROOT, "src/core/builtin-profiles.ts"), "utf8");
    const uiMatch = profiles.match(/id:\s*"ui"[\s\S]*?\n\s*\{/);
    if (!uiMatch) return;
    const uiBlock = profiles.slice(profiles.indexOf('id: "ui"'), profiles.indexOf('id: "ui"') + 600);
    const hasAux = /auxiliaryHints:\s*\[[^\]]+\]/.test(uiBlock);

    const usage = fs.readFileSync(path.join(ROOT, "docs/USAGE.md"), "utf8");
    const claimsRestyle = /restyle.*?(默认|加载)/i.test(usage);

    if (claimsRestyle && !hasAux) {
      record("profile", "MISSING_AUX", `ui profile 文档承诺 restyle 默认加载，但 builtin-profiles.ts 未设 auxiliaryHints`);
    }
  } catch (e) {
    record("profile", "READ_ERROR", e.message);
  }
}

(async () => {
  await check1();
  await check2();
  await check3();
  await check4();
  await check5();

  const byCat = {};
  for (const c of checks) {
    (byCat[c.category] ??= []).push(c);
  }

  process.stdout.write(`docs ↔ src 一致性校验 — ${checks.length === 0 ? "PASS" : "FAIL"}\n`);
  process.stdout.write(`  checks: ${Object.keys(byCat).length} categories, ${checks.length} issues\n\n`);

  for (const [cat, items] of Object.entries(byCat)) {
    process.stdout.write(`[${cat}] ${items.length} issue(s):\n`);
    for (const it of items) process.stdout.write(`  · [${it.kind}] ${it.detail}\n`);
    process.stdout.write("\n");
  }

  process.exit(checks.length === 0 ? 0 : 1);
})();