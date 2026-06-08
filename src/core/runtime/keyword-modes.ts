import type { TaiyiModeId } from "./mode-state.js";

export type WorkflowKeywordId =
  | "ccg"
  | "sciomc"
  | "deepinit"
  | "ai-slop-cleaner"
  | "external-context"
  | "ultrathink"
  | "deepsearch";

export type DetectedKeyword = {
  type: TaiyiModeId | "cancel-mode" | "tdd" | "code-review" | "security-review" | WorkflowKeywordId;
  keyword: string;
  slash: string;
  priority: number;
};

type KeywordDef = {
  type: DetectedKeyword["type"];
  pattern: RegExp;
  slash: string;
  priority: number;
};

/** 对标 OMC keyword-detector；Taiyi 映射到 /taiyi:* 斜杠 */
const KEYWORDS: KeywordDef[] = [
  { type: "cancel-mode", pattern: /\b(cancelomc|stopomc|stop-mode)\b/i, slash: "/taiyi:stop-mode", priority: 1 },
  { type: "ralph", pattern: /\b(ralph)\b(?!-)/i, slash: "/taiyi:ralph", priority: 2 },
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

const SLASH_ALIASES: Record<string, DetectedKeyword["type"]> = {
  ralph: "ralph",
  autopilot: "autopilot",
  ultrawork: "ultrawork",
  team: "team",
  ralplan: "ralplan",
  ultraqa: "ultraqa",
  plan: "plan",
  ccg: "ccg",
  sciomc: "sciomc",
  deepinit: "deepinit",
  "external-context": "external-context",
  "ai-slop-cleaner": "ai-slop-cleaner",
  "deep-interview": "deep-interview",
  "stop-mode": "cancel-mode",
  cancel: "cancel-mode",
};

export function detectKeywords(text: string): DetectedKeyword[] {
  const found: DetectedKeyword[] = [];
  for (const def of KEYWORDS) {
    const m = def.pattern.exec(text);
    if (m) {
      found.push({
        type: def.type,
        keyword: m[0],
        slash: def.slash,
        priority: def.priority,
      });
    }
  }
  found.sort((a, b) => a.priority - b.priority);
  return found;
}

export function detectSlashCommand(text: string): DetectedKeyword | null {
  const m = text.match(/\/taiyi:([\w-]+)/i);
  if (!m) return null;
  const verb = m[1].toLowerCase();
  const type = SLASH_ALIASES[verb];
  if (!type) return null;
  return {
    type,
    keyword: m[0],
    slash: `/taiyi:${verb}`,
    priority: 0,
  };
}

export function resolveKeywordActivation(text: string): DetectedKeyword | null {
  const slash = detectSlashCommand(text);
  if (slash) return slash;
  const keywords = detectKeywords(text);
  return keywords[0] ?? null;
}

export function formatKeywordHint(keyword: DetectedKeyword): string {
  return [
    `检测到关键词「${keyword.keyword}」→ 建议 ${keyword.slash}`,
    keyword.type === "cancel-mode"
      ? "  停止 ralph/autopilot/team/ultrawork 等运行时模式"
      : "  Agent 代跑 scripts/taiyi-forge.sh 对应命令",
  ].join("\n");
}
