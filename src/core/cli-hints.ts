import type { ChangeProfile } from "./types.js";

export const VALID_PROFILES: readonly ChangeProfile[] = ["full", "api", "ui", "lite", "spike", "micro", "nano", "audit"];

export const SLUG_EXAMPLE = "my-feature";

export function formatInvalidProfile(value: string): string {
  return `无效 profile: "${value}"。合法值: ${VALID_PROFILES.join(", ")}。示例: init ${SLUG_EXAMPLE} --profile lite --title "..."`;
}

export type ParseProfileResult =
  | { ok: true; profile: ChangeProfile | undefined }
  | { ok: false; error: string };

/** Parse `--profile` from argv; absent flag → undefined (caller defaults to full). */
export function parseProfileFlag(argv: string[]): ParseProfileResult {
  const idx = argv.indexOf("--profile");
  if (idx < 0) return { ok: true, profile: undefined };
  const raw = argv[idx + 1];
  if (!raw || raw.startsWith("--")) {
    return { ok: false, error: `缺少 --profile 参数值。合法值: ${VALID_PROFILES.join(", ")}` };
  }
  if ((VALID_PROFILES as readonly string[]).includes(raw)) {
    return { ok: true, profile: raw as ChangeProfile };
  }
  return { ok: false, error: formatInvalidProfile(raw) };
}

export function formatChangeNotFound(slug: string): string {
  return `Change not found: ${slug}\n修复: init ${slug} --force 或 /taiyi:new · 查看: list / list --archived`;
}

export function formatWrongPhaseError(
  slug: string,
  currentPhase: string,
  requestedPhase: string,
): string {
  return [
    `当前阶段为 ${currentPhase}，不能 complete ${requestedPhase}。`,
    `修复: /taiyi:status ${slug} → 写完工件后 /taiyi:continue ${slug}`,
  ].join("\n");
}

export function formatMultipleActiveChanges(slugs: string[], maxShow = 5): string {
  const shown = slugs.slice(0, maxShow);
  const rest = slugs.length - shown.length;
  const list = shown.join(", ");
  const suffix = rest > 0 ? ` … 另有 ${rest} 个` : "";
  return `有 ${slugs.length} 个进行中的变更（${list}${suffix}），请指定 slug：/taiyi:continue <slug>\n查看全部: npx taiyi list`;
}

export function formatUnknownHarnessHook(hookRef: string, available: string[]): string {
  if (available.length === 0) {
    return `Unknown harness hook: ${hookRef}\n提示: taiyi harness <slug> 查看当前阶段铁三角清单`;
  }
  const show = available.slice(0, 8);
  const rest = available.length - show.length;
  const list = show.join(", ");
  const suffix = rest > 0 ? ` … +${rest}` : "";
  return `Unknown harness hook: ${hookRef}\n当前阶段可用: ${list}${suffix}\n提示: taiyi harness <slug> 查看完整清单`;
}

export function formatUnknownWorkflowSkill(skill: string, available: string[]): string {
  return `未知 workflow skill: ${skill}\n可用: ${available.join(", ")}\n示例: npx taiyi plan <slug> 或 /taiyi:ralplan`;
}
