import { describe, expect, it } from "vitest";
import { formatTaiyiArchivePlain } from "../src/core/taiyi-archive.js";

describe("archive result contract", () => {
  it("reports partial external archive failures explicitly", () => {
    const text = formatTaiyiArchivePlain("demo", {
      ok: false,
      taiyiArchived: true,
      externalArchived: false,
      partial: true,
      retryable: true,
      reason: "OpenSpec archive failed",
    });
    expect(text).toContain("partial");
    expect(text).toContain("retryable");
    expect(text).toContain("OpenSpec archive failed");
  });
});
