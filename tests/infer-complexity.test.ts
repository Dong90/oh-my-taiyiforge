import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { inferComplexitySignals } from "../src/core/routing/infer-complexity.js";

describe("infer-complexity", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-infer-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("detects UI from CHANGE scope", () => {
    fs.writeFileSync(
      path.join(tmp, "CHANGE.md"),
      "## Scope\n- Redesign settings page React components\n",
    );
    const s = inferComplexitySignals(tmp);
    expect(s.hasUi).toBe(true);
  });

  it("detects backend-only", () => {
    fs.writeFileSync(
      path.join(tmp, "CHANGE.md"),
      "## Scope\n纯 API 后端，无 UI。Add REST endpoint.\n",
    );
    const s = inferComplexitySignals(tmp);
    expect(s.hasUi).toBe(false);
  });
});
