import { formatChangeNotFound, formatMultipleActiveChanges } from "./cli-hints.js";
import { listChanges } from "./list-changes.js";
import { validateSlug } from "./slug.js";
import { resolveChangeDir } from "./taiyi-archive.js";

export type ResolveSlugResult =
  | { ok: true; slug: string; inferred: boolean }
  | { ok: false; error: string };

/** 未传 slug 时：唯一进行中变更 → 最近更新；0 个或多于 1 个则报错（对齐 OpenSpec apply 推断规则） */
export function resolveActiveSlug(taiyiRoot: string, explicit?: string): ResolveSlugResult {
  if (explicit?.trim()) {
    const slug = explicit.trim();
    const valid = validateSlug(slug);
    if (!valid.ok) return { ok: false, error: valid.error };
    return { ok: true, slug, inferred: false };
  }

  const allActive = listChanges(taiyiRoot).filter((c) => c.workflowActive);
  const nonSeedActive = allActive.filter((c) => !c.isSeed);

  if (nonSeedActive.length === 1) {
    return { ok: true, slug: nonSeedActive[0]!.slug, inferred: true };
  }

  if (allActive.length === 0) {
    return {
      ok: false,
      error: "没有进行中的变更。先用 /taiyi:new <名称> 创建。",
    };
  }
  if (nonSeedActive.length > 1) {
    return {
      ok: false,
      error: formatMultipleActiveChanges(nonSeedActive.map((c) => c.slug)),
    };
  }
  if (allActive.length === 1) {
    return { ok: true, slug: allActive[0]!.slug, inferred: true };
  }
  return {
    ok: false,
    error: formatMultipleActiveChanges(allActive.map((c) => c.slug)),
  };
}

/** 显式 slug 时在 changes 或 archive 查找；未传则回退 resolveActiveSlug */
export function resolveChangeSlug(taiyiRoot: string, explicit?: string): ResolveSlugResult {
  if (explicit?.trim()) {
    const slug = explicit.trim();
    const valid = validateSlug(slug);
    if (!valid.ok) return { ok: false, error: valid.error };
    if (!resolveChangeDir(taiyiRoot, slug)) {
      return { ok: false, error: formatChangeNotFound(slug) };
    }
    return { ok: true, slug, inferred: false };
  }
  return resolveActiveSlug(taiyiRoot);
}

/** 从标题生成 slug（OMX/OpenSpec 的 new <name> 惯例） */
export function slugifyTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return `ty-${Date.now()}`;

  const ascii = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  if (ascii.length >= 2) return ascii;

  const hash = Buffer.from(trimmed, "utf8").toString("base64url").slice(0, 8).toLowerCase();
  return `ty-${hash}`;
}
