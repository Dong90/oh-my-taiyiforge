/** Agent 代跑 taiyi-forge 命令（用户面用 /taiyi:* 斜杠） */
const FORGE = "scripts/taiyi-forge.sh";

export function forgeHarnessCheck(slug: string, key: string): string {
  return `${FORGE} harness-check ${slug} ${key}`;
}

export function forgeHarness(slug: string): string {
  return `${FORGE} harness ${slug}`;
}

export function forgeComplete(slug: string, phase: string): string {
  return `${FORGE} complete ${slug} ${phase}`;
}
