/** Shared keyword detection for Cursor + Claude hooks (keep aligned with src/core/runtime/keyword-modes.ts) */

const KEYWORDS = [
  { type: "cancel-mode", pattern: /\b(cancelomc|stopomc|stop-mode)\b/i, slash: "/taiyi:stop-mode", priority: 1 },
  { type: "ralph", pattern: /\b(ralph)\b(?!-)|\b(don't stop|dont stop|keep going until|must complete|finish this)\b/i, slash: "/taiyi:ralph", priority: 2 },
  { type: "autopilot", pattern: /\b(autopilot|auto[\s-]?pilot|fullsend|full\s+auto)\b/i, slash: "/taiyi:autopilot", priority: 3 },
  { type: "team", pattern: /\b(\/team\b|team\s+mode|team\s+\d|use\s+team)\b/i, slash: "/taiyi:team", priority: 4 },
  { type: "ultrawork", pattern: /\b(ultrawork|ulw)\b/i, slash: "/taiyi:ultrawork", priority: 5 },
  { type: "ccg", pattern: /\b(ccg|codex\s+gemini\s+claude)\b/i, slash: "/taiyi:ccg", priority: 6 },
  { type: "ultrathink", pattern: /\b(ultrathink|ultra[\s-]?think|deep[\s-]?reason)\b/i, slash: "/taiyi:explore", priority: 6.2 },
  { type: "deepsearch", pattern: /\b(deepsearch|deep[\s-]?search)\b/i, slash: "/taiyi:explore", priority: 6.3 },
  { type: "plan", pattern: /\b(strategic\s+plan|\/taiyi:plan\b)\b/i, slash: "/taiyi:plan", priority: 7 },
  { type: "ralplan", pattern: /\b(ralplan)\b/i, slash: "/taiyi:ralplan", priority: 8 },
  { type: "tdd", pattern: /\b(tdd)\b|\btest\s+first\b/i, slash: "/taiyi:tdd", priority: 9 },
  { type: "code-review", pattern: /\b(code\s+review|review\s+code)\b/i, slash: "/taiyi:review-loop", priority: 10 },
  { type: "security-review", pattern: /\b(security\s+review|review\s+security)\b/i, slash: "/taiyi:security", priority: 10.5 },
  { type: "ai-slop-cleaner", pattern: /\b(deslop|anti[\s-]?slop|ai[\s-]?slop)\b/i, slash: "/taiyi:ai-slop-cleaner", priority: 12 },
  { type: "deep-interview", pattern: /\b(deep[\s-]interview|ouroboros)\b/i, slash: "/taiyi:deep-interview", priority: 13 },
  { type: "ultraqa", pattern: /\b(ultraqa)\b/i, slash: "/taiyi:ultraqa", priority: 14 },
  { type: "sciomc", pattern: /\b(sciomc|science\s+omc)\b/i, slash: "/taiyi:sciomc", priority: 15 },
  { type: "deepinit", pattern: /\b(deepinit|deep[\s-]?init)\b/i, slash: "/taiyi:deepinit", priority: 16 },
  { type: "external-context", pattern: /\b(external[\s-]?context|ext[\s-]?context)\b/i, slash: "/taiyi:external-context", priority: 17 },
];

const MODE_ACTIVATE = new Set([
  "ralph",
  "autopilot",
  "ultrawork",
  "team",
  "ralplan",
  "ultraqa",
  "plan",
  "deep-interview",
]);

export function detectKeyword(text) {
  if (!text || typeof text !== "string") return null;
  const found = [];
  for (const def of KEYWORDS) {
    const m = def.pattern.exec(text);
    if (m) found.push({ ...def, keyword: m[0] });
  }
  found.sort((a, b) => a.priority - b.priority);
  return found[0] ?? null;
}

export function buildKeywordInject(hit) {
  const extra =
    hit.type === "ultrathink"
      ? "\n深度推理：加载 @taiyi-design / @taiyi-plan · /taiyi:sp brainstorming"
      : hit.type === "deepsearch"
        ? "\n深度搜索：加载 @taiyi-intel-scan · Grep/SemanticSearch 全库后再写工件"
        : "";
  const modeLine = MODE_ACTIVATE.has(hit.type)
    ? `\n激活模式后 Agent **必须**代跑: scripts/taiyi-forge.sh step\n禁止在 verify/九阶段完成前结束会话。`
    : "";
  return [
    `<system-reminder>`,
    `[MAGIC KEYWORD: ${hit.keyword}] → ${hit.slash}`,
    `对标 OMC keyword-detector。加载对应 prompt / Skill，代跑 taiyi-forge.sh。${modeLine}${extra}`,
    `停止模式: /taiyi:stop-mode · 放弃变更: /taiyi:cancel`,
    `</system-reminder>`,
  ].join("\n");
}

export function modeIdFromKeyword(type) {
  if (type === "cancel-mode") return null;
  if (MODE_ACTIVATE.has(type)) return type;
  return null;
}
