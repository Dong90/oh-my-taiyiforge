/** 标记 init/过关后自动铺的模板，不计入辅助工件完成或质量过关。 */
export const TAIYI_SEED_MARKER = "<!-- taiyi:seed-template -->";

export function isSeedTemplate(content: string): boolean {
  return content.includes(TAIYI_SEED_MARKER);
}

export function wrapSeedTemplate(body: string): string {
  const trimmed = body.trimStart();
  if (isSeedTemplate(trimmed)) return trimmed;
  return `${TAIYI_SEED_MARKER}\n${trimmed}`;
}
