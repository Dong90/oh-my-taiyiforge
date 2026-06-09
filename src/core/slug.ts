import { SLUG_EXAMPLE } from "./cli-hints.js";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;

export function validateSlug(slug: string): { ok: true } | { ok: false; error: string } {
  const trimmed = slug.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: `slug must not be empty（示例: ${SLUG_EXAMPLE} · /taiyi:new <标题>）`,
    };
  }
  if (trimmed.includes("\0")) {
    return { ok: false, error: "slug must not contain null bytes" };
  }
  if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    return {
      ok: false,
      error: `invalid slug: ${slug}（禁止 .. / \\ · 示例: ${SLUG_EXAMPLE}）`,
    };
  }
  if (!SLUG_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: `slug must match [a-z0-9][a-z0-9-]{0,47}（示例: ${SLUG_EXAMPLE}）`,
    };
  }
  return { ok: true };
}

export function assertValidSlug(slug: string): void {
  const result = validateSlug(slug);
  if (!result.ok) {
    throw new Error(result.error);
  }
}

export function slugValidationError(slug: string): string | null {
  const result = validateSlug(slug);
  return result.ok ? null : result.error;
}
