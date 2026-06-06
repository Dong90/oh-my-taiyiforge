/** 用户面斜杠命令（review 循环） */
export function reviewLoopSlash(slug?: string): string {
  return slug ? `/taiyi:review-loop ${slug}` : "/taiyi:review-loop";
}

export function reviewCheckSlash(slug: string): string {
  return `/taiyi:review-check ${slug}`;
}

/** Agent 代跑引擎 */
export function reviewLoopForge(slug?: string): string {
  const base = "scripts/taiyi-forge.sh review-loop";
  return slug ? `${base} ${slug}` : base;
}

export function reviewCheckForge(slug: string): string {
  return `scripts/taiyi-forge.sh review-check ${slug}`;
}

/** Agent 在同一会话内重复 review 直至机器门禁通过 */
export function formatAgentReviewLoopProtocol(slug: string, round?: number, maxRounds?: number): string {
  const max = maxRounds ?? Number(process.env.TAIYI_REVIEW_LOOP_MAX_ROUNDS ?? "20");
  const r = round ?? 0;
  return [
    "Review 循环协议（先新一轮 review，直到无 blocking 项才停）:",
    "  0. 无需先推进到 review 阶段 — 直接审查当前代码/变更",
    "  1. 【必须】taiyi-review / gstack review — 基于最新 git diff 写新一轮 REVIEW.md",
    `  2. ${reviewCheckForge(slug)} — 检查是否仍有未解决 high / Request changes`,
    "  3. 若仍有 blocking → 修代码/TEST.md → 回到步骤 1 重新 review（勿停下来等用户）",
    "  4. 若无 blocking → 循环结束；正式过关 complete review --approver",
    `  5. 会话上限约 ${max} 轮（当前 ${r}/${max}，见 .review-loop-state.json）`,
    "",
    "禁止：未做新一轮 review 就直接用旧 REVIEW.md 过关。",
  ].join("\n");
}
