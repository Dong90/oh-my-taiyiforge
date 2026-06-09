const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;

export function validateSlug(slug: string): { ok: true } | { ok: false; error: string } {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { ok: false, error: "slug must not be empty" };
  }
  if (trimmed.includes("\0")) {
    return { ok: false, error: "slug must not contain null bytes" };
  }
  if (trimmed.includes("..") || trimmed.includes("/") || trimmed.includes("\\")) {
    return { ok: false, error: `invalid slug: ${slug}` };
  }
  if (!SLUG_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "slug must match [a-z0-9][a-z0-9-]{0,47}",
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
