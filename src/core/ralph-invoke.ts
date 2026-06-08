export function ralphSlash(slug?: string): string {
  return slug ? `/taiyi:ralph ${slug}` : "/taiyi:ralph";
}

export function ralphForge(slug?: string): string {
  const base = "scripts/taiyi-forge.sh ralph";
  return slug ? `${base} ${slug}` : base;
}

export function formatAgentRalphProtocol(
  slug: string,
  round: number,
  maxRounds: number,
  verifyCmd: string,
): string {
  return [
    "Ralph 协议（Taiyi 原生 · 验证不过就修，直到通过）:",
    "  1. /taiyi:sp systematic-debugging + /taiyi:tdd dev",
    "  2. /taiyi:agent debugger · /taiyi:agent executor",
    `  3. 运行验证: ${verifyCmd}（引擎已执行一次）`,
    "  4. 失败 → 最小修复 → 再次 /taiyi:ralph",
    `  5. 通过 → /taiyi:continue`,
    `  6. 会话上限 ${maxRounds} 轮（当前 ${round}/${maxRounds}，见 .ralph-state.json）`,
    "",
    "review 机器审查: /taiyi:review-loop · 全局自动推进: /taiyi:autopilot",
  ].join("\n");
}
