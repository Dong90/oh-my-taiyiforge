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
  { label: "/taiyi:browser-smoke", needle: "/taiyi:browser-smoke", source: "aux" },
  { label: "/taiyi:e2e", needle: "/taiyi:e2e", source: "delivery", desc: "目标项目 `npx playwright test`（Agent 代跑；摘要写 TEST.md）" },
  { label: "/taiyi:gstack qa", needle: "gstack qa", source: "delivery", desc: "gstack browse 走查" },
  { label: "/taiyi:ui-test", needle: "/taiyi:ui-test", source: "aux" },
];

const DIAGRAM_SLASHES = [
  "/taiyi:diagram-pipeline",
  "/taiyi:diagram-c4",
  "/taiyi:diagram-arch",
  "/taiyi:diagram-render",
  "/taiyi:diagram-flow",
];

const DIAGRAM_STEP = {
  "/taiyi:diagram-pipeline": "①②③",
  "/taiyi:diagram-c4": "①",
  "/taiyi:diagram-arch": "②",
  "/taiyi:diagram-render": "③",
  "/taiyi:diagram-flow": "—",
};

const SECTION_LABELS = {
  core: "1. 主流程（core）",
  auxiliary: "2. 辅助与排查（auxiliary）",
  phase_write: "3. 阶段写工件（phase_write）",
  scenarios: "4. 场景捷径（scenarios）",
  delivery_gstack: "5. 交付链 / gstack / Superpowers",
  engine_slash: "6. 引擎斜杠（engine_slash）",
};

function renderSlashCatalog(sections) {
  const lines = [
    "<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->",
    "",
    "## 斜杠目录（generated · slash_catalog）",
    "",
  ];
  for (const [key, label] of Object.entries(SECTION_LABELS)) {
    const items = sections[key];
    if (!items?.length) continue;
    lines.push(`### ${label}`, "", "| 斜杠 |", "|------|");
    for (const slash of items) lines.push(`| \`${slash}\` |`);
    lines.push("");
  }
  lines.push(
    "完整叙事与去重说明：[`docs/taiyi/canonical-commands.md`](../../docs/taiyi/canonical-commands.md)",
    "",
  );
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

  const sessionRows = [
    ["暂停", "`/taiyi:handoff`"],
    ["恢复", "`/taiyi:resume`"],
    ["放弃变更", "`/taiyi:cancel`"],
    ["多变更列表", "`/taiyi:list`"],
    ["仅归档列表", "CLI：`list --archived`；全量：`list --all [--archived]`"],
    ["清理 aborted", "`prune --aborted`"],
    ["安装自检", "`/taiyi:doctor`（Agent `doctor --json --compact`）"],
    ["流程/交付排查", "`/taiyi:audit`（Agent `audit --json --compact`）"],
    ["PR/CI 工件门禁", "`/taiyi:verify`"],
  ];

  const scenarioLabels = {
    "/taiyi:feature": "新功能 full 九阶段剧本",
    "/taiyi:bug": "lite 五阶段修 bug",
    "/taiyi:ui-test": "test 阶段 UI QA（gstack qa + e2e）",
  };

  const lines = [
    "<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->",
    "",
    "## 日常主链",
    "",
    "| 意图 | 推荐斜杠 | 说明 |",
    "|------|----------|------|",
  ];
  for (const [intent, slash, note] of coreRows) {
    lines.push(`| ${intent} | ${slash} | ${note} |`);
  }

  lines.push("", "## 会话与排查", "", "| 意图 | 推荐斜杠 |", "|------|----------|");
  for (const [intent, slash] of sessionRows) {
    lines.push(`| ${intent} | ${slash} |`);
  }

  lines.push("", "## 场景捷径", "", "| 斜杠 | 用途 |", "|------|------|");
  for (const slash of scenarios) {
    const label = scenarioLabels[slashVerb(slash)] ?? slash;
    lines.push(`| \`${slashVerb(slash)}\` | ${label} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderDiagramPipeline(auxCmds) {
  const byVerb = (verb) => findByVerb(auxCmds, verb);
  const lines = [
    "<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->",
    "",
    "## 架构图流水线",
    "",
    "| 斜杠 | 步骤 | 说明 |",
    "|------|------|------|",
  ];
  for (const verb of DIAGRAM_SLASHES) {
    const step = DIAGRAM_STEP[verb] ?? "—";
    const desc = escCell(firstSentence(byVerb(verb)?.meaning ?? ""));
    lines.push(`| \`${verb}\` | ${step} | ${desc} |`);
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

const slashMd = renderSlashCatalog(sections);
const coreCmds = parseProfileCommands(yaml, "core");
const auxCmds = parseProfileCommands(yaml, "auxiliary");
const deliveryCmds = parseDeliveryCommands(yaml);
const scenarios = sections.scenarios ?? [];
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
