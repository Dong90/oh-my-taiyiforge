import { describe, expect, it } from "vitest";
import { validateSlug } from "../src/core/slug.js";

describe("slug", () => {
  it("accepts valid slugs", () => {
    expect(validateSlug("auth-timeout").ok).toBe(true);
    expect(validateSlug("a1").ok).toBe(true);
  });

  it("rejects traversal and invalid characters", () => {
    expect(validateSlug("../escape").ok).toBe(false);
    expect(validateSlug("Bad_Slug").ok).toBe(false);
    expect(validateSlug("").ok).toBe(false);
    expect(validateSlug("a\u0000b").ok).toBe(false);
  });
});
