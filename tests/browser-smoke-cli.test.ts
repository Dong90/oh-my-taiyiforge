import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runBrowserSmoke } from "../src/core/browser-smoke.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("browser-smoke CLI", () => {
  it("fixture script exists under examples/browser-e2e-smoke", () => {
    const script = path.join(REPO, "examples", "browser-e2e-smoke", "run-verify.mjs");
    expect(fs.existsSync(script)).toBe(true);
  });

  it("runBrowserSmoke executes Playwright smoke", () => {
    const r = runBrowserSmoke(REPO, true);
    if (!r.ok) {
      // eslint-disable-next-line no-console
      console.error("text" in r ? r.text : r.error);
    }
    expect(r.ok, r.ok ? "" : ("error" in r ? r.error : "")).toBe(true);
    expect(r.text).toMatch(/passed|✓/i);
  }, 300_000);
});
