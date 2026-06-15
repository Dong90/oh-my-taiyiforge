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
};

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

/** review-loop / review-check：无未解决 high 且非 Request changes 即可停循环 */
export function evaluateReviewLoopStatus(content: string): ReviewLoopStatus {
  const verdict = parseReviewVerdict(content);
  const openHighFindings = findOpenHighFindings(content);
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

  const canStop =
    openHighFindings.length === 0 && verdict !== "request_changes" && verdict !== "missing";
  return { canStop, verdict, openHighFindings, hints };
}

export function formatReviewLoopPlain(
  status: ReviewLoopStatus,
  round?: number,
  slug?: string,
): string {
  const lines: string[] = [];
  if (round != null && round > 0) lines.push(`审查循环 · 第 ${round} 轮`);
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
