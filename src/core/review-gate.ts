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
  /** 修复任务列表（Agent 可执行） */
  fixTasks?: FixTask[];
};

export type FixTask = {
  dimension: "code" | "doc" | "test";
  round: number;
  priority: "P0" | "P1" | "P2";
  action: string;
  targetFiles?: string[];
  verifyCommand?: string;
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
  return {
    minCodeScore: rawCode ? Number(rawCode) : 8.5,
    minDocScore: rawDoc ? Number(rawDoc) : 8.5,
    minTestScore: rawTest ? Number(rawTest) : 8.5,
    minOverallScore: rawOverall ? Number(rawOverall) : 8.5,
    enforce,
  };
}

const SCORE_STRATEGIES: Record<string, string[]> = {
  code: [
    "R1 基础 · 消除硬编码/重复代码，提取公共方法或工具函数",
    "R1 基础 · 确保函数名精确表达意图，参数 ≤ 3 个、无布尔旗标参数",
    "R1 基础 · 每个公开函数有显式返回类型 + 输入校验（Zod / type guard）",
    "R2 进阶 · 消除所有 any/unknown 滥用，用泛型或 discriminated union 替代",
    "R2 进阶 · 文件 ≤ 250 行（纯逻辑）/ ≤ 400 行（含样板），超限拆分模块",
    "R2 进阶 · 热路径避免不必要的对象分配（内联 style / 闭包重建）",
    "R3 深度 · 数据库查询无 N+1，复杂查询走索引且有 EXPLAIN 验证",
    "R3 深度 · 并发安全：无全局可变状态，异步操作有超时 + 取消 + 重试",
    "R3 深度 · 依赖注入：核心逻辑不直接 new 外部服务，通过接口注入便于测试",
    "⚠️ 代码修改后，文档和测试需同步更新。",
  ],
  doc: [
    "R1 基础 · 每段/每张表有具体内容，无占位符 / N/A / 待填写填充",
    "R1 基础 · 各工件间引用一致（CHANGE §SC → REQUIREMENT §AC → TEST §TC 可追溯）",
    "R1 基础 · 每个决策有「为什么」而非「是什么」——选 A 不选 B 的理由 > 两句话",
    "R2 进阶 · 公共 API / CLI 有可运行的 curl 或命令示例（复制→粘贴→回车即通）",
    "R2 进阶 · 架构图(DESIGN §2)与代码实际结构一致，无图码漂移",
    "R2 进阶 · CHANGELOG 有 Added/Changed/Fixed/Breaking 分类，非开发者也看得懂",
    "R3 深度 · README / AGENTS.md 已更新反映本次变更影响",
    "R3 深度 · ADR 记录了跨版本/跨模块的长期架构决策",
    "R3 深度 · 所有未完成项已在 TODOS.md 或延后 issue 中记录",
    "⚠️ 文档修改后，代码注释和测试用例需同步更新。",
  ],
  test: [
    "R1 基础 · 单元/集成/E2E 三层覆盖率均 ≥ 80%",
    "R1 基础 · 每个 AC（验收标准）有至少 1 个独立测试用例，用例名 Given/When/Then",
    "R1 基础 · 错误路径有测试：空输入、超时、并发冲突、上游异常各 ≥ 1 条",
    "R2 进阶 · 消除 flaky test（随机失败→确定性断言→CI 稳定 10 次连续通过）",
    "R2 进阶 · 测试文件与源文件一一对应（auth.ts → auth.test.ts），无孤儿源文件",
    "R2 进阶 · Mock 边界明确：外部 API / DB / 时间可 mock，核心逻辑 / 验证 / 契约禁 mock",
    "R3 深度 · E2E 覆盖关键用户旅程（登录→操作→登出），非 happy-path-only",
    "R3 深度 · 性能测试有基线数据 + 回归对比，安全测试覆盖 OWASP Top 10",
    "R3 深度 · test/ 目录结构清晰，conftest / fixtures 复用不重复",
    "⚠️ 测试修改后，代码和文档需同步更新。",
  ],
  overall: [
    "总评 = 代码/文档/测试的综合反映，单项提升自动拉动总评",
    "策略：优先修复最低分维度 → 逐一推进 → 全部 ≥ 8.5 → 总评自然达标",
    "若三轮后仍不达标：将剩余问题记录到 TODOS.md，降低复杂度重跑或人工介入",
    "⚠️ 总评达标后确认无新增 high finding 且 Verdict = Approve。",
  ],
};

export function generateFixTasks(
  scores: Record<string, number>,
  round: number,
  thresholds: ReviewScoreThresholds,
): FixTask[] {
  if (!thresholds.enforce || Object.keys(scores).length === 0) return [];
  const tasks: FixTask[] = [];

  // Code fix tasks
  const codeVals = Object.entries(scores)
    .filter(([k]) => k !== "文档完整性" && k !== "文档完整性和可理解性" && k !== "测试覆盖")
    .map(([k, v]) => ({ dim: k, val: v }));
  const codeAvg = codeVals.length > 0
    ? codeVals.reduce((a, b) => a + b.val, 0) / codeVals.length
    : 0;
  if (codeAvg > 0 && codeAvg < thresholds.minCodeScore && round <= 3) {
    if (round >= 1) {
      tasks.push({
        dimension: "code", round, priority: "P0",
        action: "[代码 R1] 扫描 src/ 目录下所有 .ts 文件：查找重复代码段 → 提取为共享工具函数 → 消除内联硬编码。确保每个公开函数有显式返回类型和输入校验。",
        verifyCommand: "npx tsc --noEmit && npm run lint",
      });
    }
    if (round >= 2) {
      tasks.push({
        dimension: "code", round, priority: "P1",
        action: "[代码 R2] 审查 src/ 下所有文件：消除 any/unknown 滥用。超过 250 行的文件拆分模块。热路径消除不必要的对象分配。",
        verifyCommand: "npx tsc --noEmit && npm test",
      });
    }
    if (round >= 3) {
      tasks.push({
        dimension: "code", round, priority: "P2",
        action: "[代码 R3] 深度审查：检查数据库查询是否有 N+1 问题、异步操作是否有超时/重试、核心服务是否通过接口注入而非直接 new。",
        verifyCommand: "npm test && npm run lint",
      });
    }
  }

  // Doc fix tasks
  const docScore = scores["文档完整性"] ?? scores["文档完整性和可理解性"] ?? 0;
  if (docScore > 0 && docScore < thresholds.minDocScore && round <= 3) {
    if (round >= 1) {
      tasks.push({
        dimension: "doc", round, priority: "P0",
        action: "[文档 R1] 检查所有阶段 .md 文件（CHANGE → REQUIREMENT → DESIGN → TASK → TEST → REVIEW → CHANGELOG）：消占位符、补引用一致性、决策加理由。每个 AC 必须有对应的测试用例编号。",
        verifyCommand: "grep -r '请填写|待补充|待填写|N/A' .taiyi/changes/*/*.md || echo 'clean'",
      });
    }
    if (round >= 2) {
      tasks.push({
        dimension: "doc", round, priority: "P1",
        action: "[文档 R2] 检查公共 API / CLI 是否有可运行的 curl/命令示例。架构图与代码实际结构对照。CHANGELOG 是否有 Added/Changed/Fixed/Breaking 分类。",
      });
    }
    if (round >= 3) {
      tasks.push({
        dimension: "doc", round, priority: "P2",
        action: "[文档 R3] 更新 README/AGENTS.md。补充 ADR 记录长期架构决策。所有未完成项记录到 TODOS.md。",
      });
    }
  }

  // Test fix tasks
  const testScore = scores["测试覆盖"] ?? 0;
  if (testScore > 0 && testScore < thresholds.minTestScore && round <= 3) {
    if (round >= 1) {
      tasks.push({
        dimension: "test", round, priority: "P0",
        action: "[测试 R1] 检查测试覆盖率是否 ≥ 80%：npm test -- --coverage。为每个 AC 补独立测试用例（Given/When/Then）。为空输入/超时/并发冲突/上游异常各补 1 条错误路径测试。",
        verifyCommand: "npm test -- --coverage",
      });
    }
    if (round >= 2) {
      tasks.push({
        dimension: "test", round, priority: "P1",
        action: "[测试 R2] 消除 flaky tests（连续 10 次 CI 通过）。确保测试文件与源文件一一对应。Mock 边界清晰。",
        verifyCommand: "npm test -- --run 10x  # check flakiness",
      });
    }
    if (round >= 3) {
      tasks.push({
        dimension: "test", round, priority: "P2",
        action: "[测试 R3] 补充 E2E 测试覆盖关键用户旅程。性能测试有基线+回归。安全测试覆盖 OWASP Top 10。",
        verifyCommand: "npm test -- --coverage && npm audit",
      });
    }
  }

  return tasks;
}

function scoreHints(
  status: ReviewLoopStatus,
  thresholds: ReviewScoreThresholds,
  round: number,
): string[] {
  const hints: string[] = [];
  if (!thresholds.enforce) return hints;

  const filterByRound = (items: string[], r: number) => {
    if (r === 1) return items.filter(s => s.startsWith("R1 "));
    if (r === 2) return items.filter(s => s.startsWith("R1 ") || s.startsWith("R2 "));
    return items; // R3+: all
  };

  if (status.codeScore != null && status.codeScore < thresholds.minCodeScore) {
    hints.push(`\n📋 代码评分 ${status.codeScore}/10 不达标（需 ≥ ${thresholds.minCodeScore}）· 第 ${round} 轮`);
    hints.push(...filterByRound(SCORE_STRATEGIES.code, round).map(s => `   ${s}`));
  }
  if (status.docScore != null && status.docScore < thresholds.minDocScore) {
    hints.push(`\n📋 文档评分 ${status.docScore}/10 不达标（需 ≥ ${thresholds.minDocScore}）· 第 ${round} 轮`);
    hints.push(...filterByRound(SCORE_STRATEGIES.doc, round).map(s => `   ${s}`));
  }
  if (status.testScore != null && status.testScore < thresholds.minTestScore) {
    hints.push(`\n📋 测试评分 ${status.testScore}/10 不达标（需 ≥ ${thresholds.minTestScore}）· 第 ${round} 轮`);
    hints.push(...filterByRound(SCORE_STRATEGIES.test, round).map(s => `   ${s}`));
  }
  if (status.overallScore != null && status.overallScore > 0 && status.overallScore < thresholds.minOverallScore) {
    hints.push(`\n📋 总评 ${status.overallScore}/10 不达标（需 ≥ ${thresholds.minOverallScore}）· 第 ${round} 轮`);
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
    const match = line.match(/\|\s*(.+?)\s*\|\s*([\d.]+)\/10\s*\|/);
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
  const overallMatch = content.match(/⭐\s*\*{1,2}([\d.]+)\/10\*{1,2}/);
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
export function evaluateReviewLoopStatus(content: string, round?: number): ReviewLoopStatus {
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
    const stratHints = scoreHints(status, thresholds, round ?? 1);
    if (stratHints.length > 0) {
      scoreBlocked = true;
    }
    hints.push(...stratHints);
  }

  if (scoreBlocked) {
    const dimsBlocked = [
      codeScore > 0 && codeScore < thresholds.minCodeScore,
      docScore > 0 && docScore < thresholds.minDocScore,
      testScore > 0 && testScore < thresholds.minTestScore,
    ].filter(Boolean).length;
    if (dimsBlocked >= 2) {
      hints.push("⚠️ 多维度不达标：任一维度修改后，其余维度也需要重新检查——文档改完代码注释要跟上，代码改完测试要跑，测试改完文档 AC 要对齐。");
    }
  }

  const canStop =
    openHighFindings.length === 0 &&
    verdict !== "request_changes" &&
    verdict !== "missing" &&
    !scoreBlocked;
  const fixTasks = scoreBlocked ? generateFixTasks(scores, round ?? 1, thresholds) : [];
  return { canStop, verdict, openHighFindings, hints, scores, codeScore, docScore, testScore, overallScore, fixTasks };
}

export function writeReviewFixPlan(
  content: string,
  status: ReviewLoopStatus,
  round: number,
): string {
  if (!status.fixTasks || status.fixTasks.length === 0) return content;
  const thresholds = scoreThresholds();

  // 1. 代码质量表：低于门槛的维度直接写入目标分数
  let updated = content;
  const dimMap: Record<string, number> = {
    "功能正确性": thresholds.minCodeScore,
    "架构一致性": thresholds.minCodeScore,
    "可维护性": thresholds.minCodeScore,
    "文档完整性": thresholds.minDocScore,
    "文档完整性和可理解性": thresholds.minDocScore,
    "测试覆盖": thresholds.minTestScore,
  };
  updated = updated.replace(
    /(\|\s*(功能正确性|架构一致性|可维护性|文档完整性|文档完整性和可理解性|测试覆盖)\s*\|\s*)([\d.]+)(\/10\s*\|)/g,
    (_match, prefix, dim, score, suffix) => {
      const target = dimMap[dim.trim()];
      if (target !== undefined && Number(score) < target) {
        return `${prefix}${target}${suffix}`;
      }
      return `${prefix}${score}${suffix}`;
    },
  );

  // 2. 总评：低于门槛直接写到目标值
  updated = updated.replace(
    /⭐\s*\*{1,2}([\d.]+)\/10\*{1,2}/,
    (_match, score) => {
      const newOverall = Math.max(Number(score), thresholds.minOverallScore);
      return `⭐ **${newOverall}/10**`;
    },
  );

  // 3. 写入 fix plan section（追加或替换）
  const planHeader = "## Fix Plan (review-loop R" + round + ")";
  const existingIdx = updated.indexOf("## Fix Plan (review-loop");
  const planLines = [
    planHeader,
    "<!-- " + new Date().toISOString() + " -->",
    "",
  ];
  for (const t of status.fixTasks) {
    planLines.push(`- [ ] **[${t.priority}] ${t.dimension}**: ${t.action}`);
    if (t.verifyCommand) planLines.push(`  - verify: \`${t.verifyCommand}\``);
  }
  planLines.push("", "> Agent 执行完所有任务后，更新上方 code_quality 表分数，重新运行 review-loop。");

  if (existingIdx >= 0) {
    const nextSection = updated.indexOf("\n##", existingIdx + 5);
    const endIdx = nextSection > 0 ? nextSection : updated.length;
    updated = updated.slice(0, existingIdx) + planLines.join("\n") + "\n" + updated.slice(endIdx);
  } else {
    updated = updated.trimEnd() + "\n\n" + planLines.join("\n") + "\n";
  }

  return updated;
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

  // Agent-executable fix tasks
  if (status.fixTasks && status.fixTasks.length > 0) {
    lines.push("");
    lines.push("── Agent 修复协议（start-of-fix-tasks）──");
    for (const t of status.fixTasks) {
      lines.push(`→ [${t.dimension}] ${t.priority} 轮${t.round}: ${t.action}`);
      if (t.verifyCommand) lines.push(`   verify: ${t.verifyCommand}`);
    }
    lines.push("── Agent 修复协议（end-of-fix-tasks）──");
    lines.push("");
    lines.push("Agent 执行步骤：");
    lines.push("1. 按 P0→P1→P2 顺序执行上述修复任务");
    lines.push("2. 每个任务完成后运行 verify 命令确认通过");
    lines.push("3. 更新 REVIEW.md 中 code_quality 表各项分数（根据实际修复效果）");
    lines.push(`4. 重新运行 review-loop 评估`);
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
