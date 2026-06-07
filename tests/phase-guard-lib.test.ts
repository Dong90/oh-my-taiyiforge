import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  evaluatePhaseGuard,
  guardMode,
  isTaiyiPath,
} from "../scripts/phase-guard-lib.mjs";

describe("phase-guard-lib", () => {
  it("allows edits under .taiyi/", () => {
    expect(isTaiyiPath(".taiyi/changes/foo/CHANGE.md")).toBe(true);
    const r = evaluatePhaseGuard(
      { tool_name: "Write", tool_input: { path: ".taiyi/changes/x/CHANGE.md" } },
      process.cwd(),
      { TAIYI_PHASE_GUARD: "deny" },
    );
    expect(r.action).toBe("allow");
  });

  it("blocks product code before dev phase", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-pg-"));
    fs.mkdirSync(path.join(dir, ".taiyi", "changes", "demo"), { recursive: true });
    fs.writeFileSync(
      path.join(dir, ".taiyi", "changes", "demo", "state.json"),
      JSON.stringify({
        slug: "demo",
        currentPhase: "design",
        workflowStatus: "active",
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    );
    const r = evaluatePhaseGuard(
      { tool_name: "Write", tool_input: { path: "src/app.ts" } },
      dir,
      { TAIYI_PHASE_GUARD: "deny" },
    );
    expect(r.action).toBe("block");
    if (r.action === "block") {
      expect(r.mode).toBe("deny");
      expect(r.phase).toBe("design");
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("defaults to deny when TAIYI_EARLY_CODE_BLOCK unset", () => {
    expect(guardMode({})).toBe("deny");
    expect(guardMode({ TAIYI_EARLY_CODE_BLOCK: "0" })).toBe("ask");
  });
});
