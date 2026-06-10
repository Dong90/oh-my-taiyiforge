#!/usr/bin/env node
/**
 * 从 docs/taiyi/commands.yaml 生成文档产物：
 * - prompts/inc/slash-catalog.generated.md
 * - docs/taiyi/inc/canonical-tables.generated.md
 * - 同步 canonical-commands.md 标记块
 *
 * 用法：npm run generate:docs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findByChatNeedle,
  findByVerb,
  firstSentence,
  formatEngineCell,
  parseChatSlashes,
  parseDeliveryCommands,
  parseDeliveryChain,
  formatDeliveryChainText,
  parseProfileCommands,
  parseSlashCatalogLists,
  slashVerb,
  validateV28CatalogSync,
} from "./lib/parse-commands-yaml.mjs";

const pkgRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const yamlPath = path.join(pkgRoot, "docs/taiyi/commands.yaml");
const slashOut = path.join(pkgRoot, "prompts/inc/slash-catalog.generated.md");
const canonicalTablesOut = path.join(pkgRoot, "docs/taiyi/inc/canonical-tables.generated.md");
const diagramPipelineOut = path.join(pkgRoot, "docs/taiyi/inc/diagram-pipeline.generated.md");
const browserE2eOut = path.join(pkgRoot, "docs/taiyi/inc/browser-e2e.generated.md");
const deliveryChainOut = path.join(pkgRoot, "docs/taiyi/inc/delivery-chain.generated.md");
const canonicalDoc = path.join(pkgRoot, "docs/taiyi/canonical-commands.md");
const checkOnly = process.argv.includes("--check");

const BEGIN = "<!-- BEGIN GENERATED canonical-tables -->";
const END = "<!-- END GENERATED canonical-tables -->";
const BEGIN_DIAGRAM = "<!-- BEGIN GENERATED diagram-pipeline -->";
const END_DIAGRAM = "<!-- END GENERATED diagram-pipeline -->";
const BEGIN_BROWSER = "<!-- BEGIN GENERATED browser-e2e -->";
const END_BROWSER = "<!-- END GENERATED browser-e2e -->";
const BEGIN_DELIVERY = "<!-- BEGIN GENERATED delivery-chain -->";
const END_DELIVERY = "<!-- END GENERATED delivery-chain -->";

const BROWSER_E2E_ROWS = [
  { label: "/taiyi:test smoke", needle: "/taiyi:browser-smoke", source: "aux", desc: "内置 Playwright 冒烟（v28 伞形 `test smoke`）" },
  { label: "/taiyi:test e2e", needle: "/taiyi:e2e", source: "delivery", desc: "目标项目 `npx playwright test`（v28 伞形 `test e2e`）" },
  { label: "/taiyi:test qa", needle: "gstack qa", source: "delivery", desc: "gstack browse 走查（v28 伞形 `test qa`）" },
  { label: "/taiyi:test ui", needle: "/taiyi:ui-test", source: "aux", desc: "test 阶段 UI QA（v28 伞形 `test ui`）" },
];

const DIAGRAM_SLASHES = [
  { verb: "/taiyi:diagram pipeline", needle: "/taiyi:diagram-pipeline", step: "①②③" },
  { verb: "/taiyi:diagram c4", needle: "/taiyi:diagram-c4", step: "①" },
  { verb: "/taiyi:diagram arch", needle: "/taiyi:diagram-arch", step: "②" },
  { verb: "/taiyi:diagram render", needle: "/taiyi:diagram-render", step: "③" },
  { verb: "/taiyi:diagram flow", needle: "/taiyi:diagram-flow", step: "—" },
];

const V28_SECTION_LABELS = {
  main_chain: "1. 主链（6）",
  session: "2. 会话（4）",
  triage: "3. 排查（3）",
  delivery: "4. 交付（4）",
  routers: "5. 外挂路由（2）",
  phase_shortcuts: "6. 阶段捷径（3）",
  umbrellas: "7. 伞形命令（6）",
};

const LEGACY_SECTION_LABELS = {
  legacy_scenarios: "Legacy · 场景",
  legacy_auxiliary: "Legacy · 旧顶栏（仍可用 prompt）",
  legacy_phase_write: "Legacy · phase_write",
};

function renderSlashCatalog(sections) {
  const lines = [
    "<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->",
    "",
    "## 斜杠目录（generated · canonical v28）",
    "",
    "推荐顶栏 **28 条**；旧斜杠见 Legacy 段。叙事：[`canonical-commands.md`](../../docs/taiyi/canonical-commands.md)",
    "",
  ];
  for (const [key, label] of Object.entries(V28_SECTION_LABELS)) {
    const items = sections[key];
    if (!items?.length) continue;
    lines.push(`### ${label}`, "", "| 斜杠 |", "|------|");
    for (const slash of items) lines.push(`| \`${slash}\` |`);
    lines.push("");
  }
  lines.push("### Legacy（兼容，勿新增同类入口）", "");
  for (const [key, label] of Object.entries(LEGACY_SECTION_LABELS)) {
    const items = sections[key];
    if (!items?.length) continue;
    lines.push(`#### ${label}`, "", "| 斜杠 |", "|------|");
    for (const slash of items) lines.push(`| \`${slash}\` |`);
    lines.push("");
  }
  const engine = sections.engine_slash;
  if (engine?.length) {
    lines.push("### 引擎斜杠（脚本/CI）", "", "| 斜杠 |", "|------|");
    for (const slash of engine) lines.push(`| \`${slash}\` |`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function escCell(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

function renderCanonicalTables(yaml, coreCmds, auxCmds, scenarios) {
  const byVerb = (cmds, verb) => findByVerb(cmds, verb);
  const note = (cmds, verb, fallback = "") =>
    escCell(firstSentence(byVerb(cmds, verb)?.meaning ?? "") || fallback);

  const coreRows = [
    ["新建变更", "`/taiyi:new <标题>`", note(coreCmds, "/taiyi:new", "默认手动九阶段")],
    [
      "看进度",
      "`/taiyi:status`",
      "Agent 默认 `status --json --compact`；人类可读用无前缀 status",
    ],
    ["写当前阶段工件", "`/taiyi:write`", "引擎输出应加载的 `@taiyi-*` Skill"],
    ["过关", "`/taiyi:continue`", note(coreCmds, "/taiyi:continue", "人工门须 `--approver`")],
    ["dev/test 实现清单", "`/taiyi:apply`", note(coreCmds, "/taiyi:apply", "不写代码，只列 harness")],
    ["归档", "`/taiyi:archive`", note(coreCmds, "/taiyi:archive", "integration 完成后")],
  ];

  const scenarioLabels = {
    "/taiyi:feature": "新功能 full 九阶段（`/taiyi:flow feature`）",
    "/taiyi:bug": "lite 修 bug（`/taiyi:flow bug`）",
    "/taiyi:ui-test": "test UI QA（`/taiyi:test ui`）",
  };

  const v28SessionRows = [
    ["暂停", "`/taiyi:handoff`"],
    ["恢复", "`/taiyi:resume`"],
    ["放弃变更", "`/taiyi:cancel`"],
    ["多变更列表", "`/taiyi:list`"],
  ];

  const v28TriageRows = [
    ["安装自检", "`/taiyi:doctor`（Agent `doctor --json --compact`）"],
    ["流程/交付排查", "`/taiyi:audit`（Agent `audit --json --compact`）"],
    ["PR/CI 工件门禁", "`/taiyi:verify`"],
  ];

  const v28DeliveryRows = [
    ["带 trailer 提交", "`/taiyi:commit`"],
    ["创建 PR", "`/taiyi:ship`"],
    ["合并部署", "`/taiyi:land`"],
    ["文档/CHANGELOG", "`/taiyi:release`"],
  ];

  const v28UmbrellaRows = [
    ["Token", "`/taiyi:token status|record|scan|compress`"],
    ["测试", "`/taiyi:test smoke|e2e|qa|ui|security`"],
    ["Review", "`/taiyi:review loop|check|health|gstack`"],
    ["架构图", "`/taiyi:diagram pipeline|c4|arch|render|flow`"],
    ["多 Agent / OMC", "`/taiyi:mode ralph|autopilot|…`"],
    ["工作流扩展", "`/taiyi:workflow plan|loop|sync|…`"],
  ];

  const lines = [
    "<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->",
    "",
    "## v28 主链（6）",
    "",
    "| 意图 | 推荐斜杠 | 说明 |",
    "|------|----------|------|",
  ];
  for (const [intent, slash, note] of coreRows) {
    lines.push(`| ${intent} | ${slash} | ${note} |`);
  }

  lines.push("", "## v28 会话（4）", "", "| 意图 | 推荐斜杠 |", "|------|----------|");
  for (const [intent, slash] of v28SessionRows) {
    lines.push(`| ${intent} | ${slash} |`);
  }

  lines.push("", "## v28 排查（3）", "", "| 意图 | 推荐斜杠 |", "|------|----------|");
  for (const [intent, slash] of v28TriageRows) {
    lines.push(`| ${intent} | ${slash} |`);
  }

  lines.push("", "## v28 交付（4）", "", "| 意图 | 推荐斜杠 |", "|------|----------|");
  for (const [intent, slash] of v28DeliveryRows) {
    lines.push(`| ${intent} | ${slash} |`);
  }

  lines.push("", "## v28 路由与捷径", "", "| 分组 | 斜杠 |", "|------|------|");
  lines.push("| 外挂 | `/taiyi:gstack <skill>` · `/taiyi:sp <skill>` |");
  lines.push("| 阶段 | `/taiyi:explore` · `/taiyi:tdd plan|dev` · `/taiyi:flow` |");

  lines.push("", "## v28 伞形命令（6）", "", "| 域 | 斜杠 |", "|----|------|");
  for (const [label, slash] of v28UmbrellaRows) {
    lines.push(`| ${label} | ${slash} |`);
  }

  lines.push("", "## 场景（legacy → flow）", "", "| 旧斜杠 | v28 入口 |", "|--------|----------|");
  for (const slash of scenarios) {
    const verb = slashVerb(slash);
    const label = scenarioLabels[verb] ?? slash;
    lines.push(`| \`${verb}\` | ${label} |`);
  }
  lines.push(
    "",
    "列表/清理：`list --archived` · `list --all` · `prune --aborted`（CLI，无独立顶栏）。",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function renderDiagramPipeline(auxCmds) {
  const byVerb = (verb) => findByVerb(auxCmds, verb);
  const byNeedle = (needle) => findByVerb(auxCmds, needle) ?? findByChatNeedle(auxCmds, needle);
  const lines = [
    "<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->",
    "",
    "## 架构图（v28 · `/taiyi:diagram`）",
    "",
    "| v28 子命令 | 步骤 | 说明 | legacy 斜杠 |",
    "|------------|------|------|-------------|",
  ];
  for (const row of DIAGRAM_SLASHES) {
    const cmd = byNeedle(row.needle);
    const desc = escCell(firstSentence(cmd?.meaning ?? ""));
    lines.push(
      `| \`${row.verb}\` | ${row.step} | ${desc} | \`${row.needle}\` |`,
    );
  }
  lines.push(
    "",
    "详见 `docs/diagrams/pipeline.md` · `commands.yaml` → `auxiliary.commands`。",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function renderBrowserE2e(auxCmds, deliveryCmds) {
  const pick = (row) =>
    row.source === "delivery"
      ? findByChatNeedle(deliveryCmds, row.needle)
      : findByVerb(auxCmds, row.needle) ?? findByChatNeedle(auxCmds, row.needle);

  const lines = [
    "<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->",
    "",
    "## 浏览器 / E2E",
    "",
    "Token 纪律：全量 `playwright test` / probe 在 **CI 或后台**跑；聊天只写 TEST.md 摘要，勿灌日志。",
    "",
    "| 斜杠 | 引擎 | 说明 |",
    "|------|------|------|",
  ];
  for (const row of BROWSER_E2E_ROWS) {
    const cmd = pick(row);
    const engine = formatEngineCell(cmd);
    const desc = escCell(row.desc ?? (firstSentence(cmd?.meaning ?? "") || "见 commands.yaml"));
    lines.push(`| \`${row.label}\` | ${engine} | ${desc} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderDeliveryChain(yamlText) {
  const chain = parseDeliveryChain(yamlText);
  const chainText = formatDeliveryChainText(chain);
  const lines = [
    "<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->",
    "",
    "## 交付链（gstack）",
    "",
    "```text",
    chainText,
    "```",
    "",
    "详见 [delivery-slash.md](./delivery-slash.md)。",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function spliceBlock(src, begin, end, bodyMd) {
  if (!src.includes(begin) || !src.includes(end)) {
    throw new Error(`${canonicalDoc} missing ${begin} … ${end} markers`);
  }
  const replacement = `${begin}\n\n${bodyMd.trimEnd()}\n\n${end}`;
  return src.replace(new RegExp(`${escapeRe(begin)}[\\s\\S]*?${escapeRe(end)}`), replacement);
}

function spliceCanonicalDoc(tablesMd, diagramMd, browserMd, deliveryMd) {
  let src = spliceBlock(fs.readFileSync(canonicalDoc, "utf8"), BEGIN, END, tablesMd);
  src = spliceBlock(src, BEGIN_DIAGRAM, END_DIAGRAM, diagramMd);
  src = spliceBlock(src, BEGIN_DELIVERY, END_DELIVERY, deliveryMd);
  src = spliceBlock(src, BEGIN_BROWSER, END_BROWSER, browserMd);
  return src;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function writeOrCheck(label, filePath, content, checkOnly) {
  if (checkOnly) {
    if (!fs.existsSync(filePath)) {
      console.error(`missing ${filePath} — run npm run generate:docs`);
      process.exit(1);
    }
    if (fs.readFileSync(filePath, "utf8") !== content) {
      console.error(`${label} stale — run npm run generate:docs`);
      process.exit(1);
    }
    console.log(`${label} OK`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`wrote ${filePath}`);
}

const yaml = fs.readFileSync(yamlPath, "utf8");
const sections = parseSlashCatalogLists(yaml);
sections.delivery_gstack = parseChatSlashes(yaml, /^  delivery_gstack:/);
sections.engine_slash = parseChatSlashes(yaml, /^    engine_slash:/);

const v28Sync = validateV28CatalogSync(yaml, sections);
if (!v28Sync.ok) {
  console.error("canonical_v28 ↔ recommended_v28 不一致 — 修 docs/taiyi/commands.yaml:");
  for (const e of v28Sync.errors) console.error(`  · ${e}`);
  process.exit(1);
}

const slashMd = renderSlashCatalog(sections);
const coreCmds = parseProfileCommands(yaml, "core");
const auxCmds = parseProfileCommands(yaml, "auxiliary");
const deliveryCmds = parseDeliveryCommands(yaml);
const scenarios = sections.legacy_scenarios ?? sections.scenarios ?? [];
const tablesMd = renderCanonicalTables(yaml, coreCmds, auxCmds, scenarios);
const diagramMd = renderDiagramPipeline(auxCmds);
const browserMd = renderBrowserE2e(auxCmds, deliveryCmds);
const deliveryMd = renderDeliveryChain(yaml);
const canonicalPatched = spliceCanonicalDoc(tablesMd, diagramMd, browserMd, deliveryMd);

writeOrCheck("slash-catalog.generated.md", slashOut, slashMd, checkOnly);
writeOrCheck("canonical-tables.generated.md", canonicalTablesOut, tablesMd, checkOnly);
writeOrCheck("diagram-pipeline.generated.md", diagramPipelineOut, diagramMd, checkOnly);
writeOrCheck("delivery-chain.generated.md", deliveryChainOut, deliveryMd, checkOnly);
writeOrCheck("browser-e2e.generated.md", browserE2eOut, browserMd, checkOnly);

if (checkOnly) {
  if (fs.readFileSync(canonicalDoc, "utf8") !== canonicalPatched) {
    console.error("canonical-commands.md GENERATED block stale — run npm run generate:docs");
    process.exit(1);
  }
  console.log("canonical-commands.md OK");
} else {
  fs.writeFileSync(canonicalDoc, canonicalPatched);
  console.log(`updated ${canonicalDoc}`);
}
