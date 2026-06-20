/** 用户面斜杠命令 */
export function loopSlash(slug?: string, times?: number): string {
  if (times && times > 1) {
    return slug ? `/taiyi:continue ${slug} x${times}` : `/taiyi:continue x${times}`;
  }
  return slug ? `/taiyi:continue ${slug}` : "/taiyi:continue";
}

export function withRepeatSuffix(base: string, times: number): string {
  if (times <= 1) return base;
  return `${base} x${times}`;
}

/** Agent 代跑引擎 */
export function loopForge(slug?: string, times?: number): string {
  const base = "scripts/taiyi-forge.sh loop";
  const parts = [base];
  if (slug) parts.push(slug);
  if (times && times > 1) parts.push(`x${times}`);
  return parts.join(" ");
}
