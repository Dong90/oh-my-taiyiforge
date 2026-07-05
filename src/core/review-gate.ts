import { reviewCheckForge } from "./review-invoke.js";

/** complete review 阶段工件门禁（严格 Approve checkbox） */

export type MachineReviewVerdict = "approve" | "request_changes" | "missing" | "ambiguous";

export type MachineReviewResult = {
  passed: boolean;
  verdict: MachineReviewVerdict;
  openHighFindings: string[];
  hints: string[];
};

/** /taiyi:review-loop 循环终止：审查是否还有 blocking 项（非「机器审查」） */
export type ReviewLoopStatus = {
  canStop: boolean;
  verdict: MachineReviewVerdict;
  openHighFindings: string[];
  hints: string[];
  /** 各维度评分（从 code_quality 表解析） */
  scores?: Record<string, number>;
  /** 综合代码评分（非文档维度均值） */
  codeScore?: number;
  /** 文档质量评分 */
  docScore?: number;
  /** 测试覆盖评分 */
  testScore?: number;
  /** 总评分数 */
  overallScore?: number;
};

export type ReviewScoreThresholds = {
  minCodeScore: number;
  minDocScore: number;
  minTestScore: number;
  minOverallScore: number;
  enforce: boolean;
};

function scoreThresholds(): ReviewScoreThresholds {
  const rawCode = process.env.TAIYI_REVIEW_MIN_CODE_SCORE;
  const rawDoc = process.env.TAIYI_REVIEW_MIN_DOC_SCORE;
  const rawTest = process.env.TAIYI_REVIEW_MIN_TEST_SCORE;
  const rawOverall = process.env.TAIYI_REVIEW_MIN_OVERALL_SCORE;
  const enforce = process.env.TAIYI_REVIEW_ENFORCE_SCORES !== "0";
  const d = rawCode ?? rawDoc ?? rawTest ?? rawOverall;
  return {
    minCodeScore: rawCode ? Number(rawCode) : d ? Number(d) : 9,
    minDocScore: rawDoc ? Number(rawDoc) : d ? Number(d) : 9,
    minTestScore: rawTest ? Number(rawTest) : d ? Number(d) : 9,
    minOverallScore: rawOverall ? Number(rawOverall) : d ? Number(d) : 9,
    enforce,
  };
}

const SCORE_STRATEGIES: Record<string, string[]> = {
  code: [
    "• 消除硬编码/重复代码，提取公共方法或工具函数",
    "• 确保函数名称精确表达意图，参数简洁、职责单一",
    "• 确保错误处理完整（try-catch + 用户可见提示），边界条件有测试覆盖",
    "• 使用给定框架的最佳实践（React hooks 规则 / FastAPI 依赖注入 / …）",
    "• 运行 linter + typecheck，消除所有 warning",
    "⚠️ 代码修改后，文档和测试可能需要同步更新。",
  ],
  doc: [
    "• 确保每段/每张表都有具体内容，无占位符或 N/A 填充",
    "• 各阶段工件间引用一致（CHANGE → REQUIREMENT → DESIGN → TEST 可追溯）",
    "• 为关键决策添加 ADR 风格的「为什么选择这个方案」说明",
    "• 如有公共 API / CLI，确保有可运行的示例命令或请求",
    "⚠️ 文档修改后，代码注释和测试用例可能需要同步更新。",
  ],
  test: [
    "• 补全缺失的单元/集成/E2E 测试用例，确保覆盖率 ≥ 80%",
    "• 为边缘路径（空输入/超时/并发/异常）添加独立测试",
    "• 测试用例名称使用 Given/When/Then 结构，一眼读懂验证什么",
    "• 消除 flaky test（随机失败 → 确定性断言 → 稳定 CI）",
    "⚠️ 测试修改后，代码和文档可能需要同步更新。",
  ],
  overall: [
    "• 总评是代码/文档/测试的综合反映，单项提升会拉动总评",
    "• 优先修复最低分维度，再逐一推进其余维度至 ≥ 9.0",
    "⚠️ 总评达标后，仍需确认无新增 high finding 和 Verdict 为 Approve。",
  ],
};

function scoreHints(status: ReviewLoopStatus, thresholds: ReviewScoreThresholds): string[] {
  const hints: string[] = [];
  if (!thresholds.enforce) return hints;
  if (status.codeScore != null && status.codeScore < thresholds.minCodeScore) {
    hints.push(`\n📋 代码评分 ${status.codeScore}/10 不达标（需 ≥ ${thresholds.minCodeScore}）`);
    hints.push(...SCORE_STRATEGIES.code.map(s => `   ${s}`));
  }
  if (status.docScore != null && status.docScore < thresholds.minDocScore) {
    hints.push(`\n📋 文档评分 ${status.docScore}/10 不达标（需 ≥ ${thresholds.minDocScore}）`);
    hints.push(...SCORE_STRATEGIES.doc.map(s => `   ${s}`));
  }
  if (status.testScore != null && status.testScore < thresholds.minTestScore) {
    hints.push(`\n📋 测试评分 ${status.testScore}/10 不达标（需 ≥ ${thresholds.minTestScore}）`);
    hints.push(...SCORE_STRATEGIES.test.map(s => `   ${s}`));
  }
  if (status.overallScore != null && status.overallScore > 0 && status.overallScore < thresholds.minOverallScore) {
    hints.push(`\n📋 总评 ${status.overallScore}/10 不达标（需 ≥ ${thresholds.minOverallScore}）`);
    hints.push(...SCORE_STRATEGIES.overall.map(s => `   ${s}`));
  }
  return hints;
}

const RESOLVED_MARKERS = /✅|fixed|resolved|已修复|已解决|豁免|wontfix|N\/A/i;

function verdictSection(content: string): string {
  const idx = content.indexOf("## Verdict");
  if (idx < 0) return "";
  return content.slice(idx);
}

export function parseReviewVerdict(content: string): MachineReviewVerdict {
  const section = verdictSection(content);
  if (!section) return "missing";

  const approveChecked = /\[[xX]\]\s*\*\*Approve\*\*/.test(section);
  const requestChecked = /\[[xX]\]\s*\*\*Request changes\*\*/.test(section);

  if (approveChecked && requestChecked) return "ambiguous";
  if (requestChecked) return "request_changes";
  if (approveChecked) return "approve";

  return "ambiguous";
}

export function findOpenHighFindings(content: string): string[] {
  const open: string[] = [];
  for (const line of content.split("\n")) {
    if (!/\|\s*high\s*\|/i.test(line)) continue;
    if (/Severity|严重度|----/.test(line)) continue;
    if (RESOLVED_MARKERS.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    open.push(cells.slice(0, 4).join(" | "));
  }
  return open;
}

export function parseCodeQualityScores(content: string): Record<string, number> {
  const scores: Record<string, number> = {};
  const tableStart = content.indexOf("| 维度 | 评分 | 备注 |");
  if (tableStart < 0) return scores;
  const tableEnd = content.indexOf("\n\n", tableStart);
  const table = tableEnd > 0 ? content.slice(tableStart, tableEnd) : content.slice(tableStart);
  for (const line of table.split("\n")) {
    const match = line.match(/\|\s*(.+?)\s*\|\s*(\d+)\/10\s*\|/);
    if (match) {
      scores[match[1].trim()] = Number(match[2]);
    }
  }
  return scores;
}

function computeReviewScores(content: string): {
  codeScore: number;
  docScore: number;
  testScore: number;
  overallScore: number;
  scores: Record<string, number>;
} {
  const scores = parseCodeQualityScores(content);
  const codeVals = Object.entries(scores)
    .filter(([k]) => k !== "文档完整性" && k !== "文档完整性和可理解性" && k !== "测试覆盖")
    .map(([, v]) => v);
  const codeScore = codeVals.length > 0
    ? Math.round(codeVals.reduce((a, b) => a + b, 0) / codeVals.length * 10) / 10
    : scores["功能正确性"] ?? scores["架构一致性"] ?? scores["可维护性"] ?? 0;
  const docScore = scores["文档完整性"] ?? scores["文档完整性和可理解性"] ?? 0;
  const testScore = scores["测试覆盖"] ?? 0;

  // Parse overall_score from header: ⭐ **8/10**
  let overallScore = 0;
  const overallMatch = content.match(/⭐\s*\*{1,2}(\d+)\/10\*{1,2}/);
  if (overallMatch) overallScore = Number(overallMatch[1]);

  return { codeScore, docScore, testScore, overallScore, scores };
}

export function evaluateMachineReview(content: string): MachineReviewResult {
  const hints: string[] = [];
  const verdict = parseReviewVerdict(content);
  const openHighFindings = findOpenHighFindings(content);

  if (verdict === "missing") {
    hints.push("REVIEW.md 缺少 ## Verdict 节");
  } else if (verdict === "request_changes") {
    hints.push("Verdict 为 Request changes，修复后更新 REVIEW.md 再审查");
  } else if (verdict === "ambiguous") {
    hints.push("Verdict 须明确勾选 [x] **Approve**（且勿同时勾选 Request changes）");
  }

  if (openHighFindings.length > 0) {
    hints.push(`仍有 ${openHighFindings.length} 条未关闭的 high finding`);
  }

  const passed = verdict === "approve" && openHighFindings.length === 0;
  return { passed, verdict, openHighFindings, hints };
}

/** review-loop / review-check：无未解决 high、非 Request changes、分数达标即可停循环 */
export function evaluateReviewLoopStatus(content: string): ReviewLoopStatus {
  const verdict = parseReviewVerdict(content);
  const openHighFindings = findOpenHighFindings(content);
  const { codeScore, docScore, testScore, overallScore, scores } = computeReviewScores(content);
  const thresholds = scoreThresholds();
  const hints: string[] = [];

  if (openHighFindings.length > 0) {
    hints.push(`仍有 ${openHighFindings.length} 条未解决的 high 问题，须修代码后重新 review`);
  }
  if (verdict === "request_changes") {
    hints.push("审查结论为 Request changes，须修复后重新 review");
  }
  if (verdict === "missing") {
    hints.push("REVIEW.md 缺少审查结论（## Verdict）");
  }

  // 分数门槛检查（四维：代码/文档/测试/总评），附带针对性优化策略
  let scoreBlocked = false;
  if (thresholds.enforce && Object.keys(scores).length > 0) {
    const status = { codeScore, docScore, testScore, overallScore, scores } as ReviewLoopStatus;
    const stratHints = scoreHints(status, thresholds);
    if (stratHints.length > 0) {
      scoreBlocked = true;
    }
    hints.push(...stratHints);
  }

  if (scoreBlocked && !hints.some(h => h.includes("⚠️") || h.includes("同步更新"))) {
    hints.push("⚠️ 任一维度修改后，其余维度也需要重新检查——文档改完代码注释要跟上，代码改完测试要跑，测试改完文档 AC 要对齐。");
  }

  const canStop =
    openHighFindings.length === 0 &&
    verdict !== "request_changes" &&
    verdict !== "missing" &&
    !scoreBlocked;
  return { canStop, verdict, openHighFindings, hints, scores, codeScore, docScore, testScore, overallScore };
}

export function formatReviewLoopPlain(
  status: ReviewLoopStatus,
  round?: number,
  slug?: string,
): string {
  const lines: string[] = [];
  const thresholds = scoreThresholds();
  if (round != null && round > 0) lines.push(`审查循环 · 第 ${round} 轮`);

  // 分数展示
  if (status.codeScore != null) {
    const t = thresholds;
    const codeOk = !t.enforce || (status.codeScore ?? 0) >= t.minCodeScore;
    const docOk = !t.enforce || (status.docScore ?? 0) >= t.minDocScore;
    const testOk = !t.enforce || (status.testScore ?? 0) >= t.minTestScore;
    const overallOk = !t.enforce || (status.overallScore ?? 0) >= t.minOverallScore;
    const parts = [
      `代码 ${status.codeScore}/10 ${codeOk ? "✓" : "✗"}`,
      `文档 ${status.docScore}/10 ${docOk ? "✓" : "✗"}`,
      `测试 ${status.testScore}/10 ${testOk ? "✓" : "✗"}`,
    ];
    if (status.overallScore) parts.push(`总评 ${status.overallScore}/10 ${overallOk ? "✓" : "✗"}`);
    lines.push(parts.join("  "));
    lines.push(`  门槛: 代码≥${t.minCodeScore} 文档≥${t.minDocScore} 测试≥${t.minTestScore} 总评≥${t.minOverallScore}`);
    if (status.scores && Object.keys(status.scores).length > 0) {
      for (const [dim, score] of Object.entries(status.scores)) {
        lines.push(`  · ${dim}: ${score}/10`);
      }
    }
  }

  if (status.canStop) {
    lines.push("✓ 审查完成，无 blocking 项");
    lines.push("→ review 循环可结束；正式过关: /taiyi:continue <slug> review --approver \"你的名字\"");
    return lines.join("\n");
  }
  lines.push("✗ 仍有 blocking 项，继续 review 循环");
  lines.push(`  结论: ${status.verdict}`);
  for (const h of status.hints) lines.push(`  · ${h}`);
  for (const f of status.openHighFindings.slice(0, 5)) {
    lines.push(`  · high: ${f}`);
  }
  lines.push("");
  lines.push("→ 修代码/TEST.md → taiyi-review 重新审查 → review-check");
  if (slug) lines.push(`→ ${reviewCheckForge(slug)}`);
  return lines.join("\n");
}

export function formatMachineReviewPlain(
  result: MachineReviewResult,
  round?: number,
  slug?: string,
): string {
  const lines: string[] = [];
  if (round != null) lines.push(`机器审查 · 第 ${round} 轮`);
  if (result.passed) {
    lines.push("✓ 机器审查通过");
    lines.push("→ 可执行: /taiyi:continue <slug> review --approver \"你的名字\"");
    return lines.join("\n");
  }
  lines.push("✗ 机器审查未通过");
  lines.push(`  Verdict: ${result.verdict}`);
  for (const h of result.hints) lines.push(`  · ${h}`);
  for (const f of result.openHighFindings.slice(0, 5)) {
    lines.push(`  · high: ${f}`);
  }
  lines.push("");
  lines.push("→ 本会话继续：修代码/TEST.md → taiyi-review 更新 REVIEW.md → 再跑机器审查");
  if (slug) lines.push(`→ 探测: ${reviewCheckForge(slug)}`);
  return lines.join("\n");
}
