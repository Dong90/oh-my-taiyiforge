import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ChangeState } from "../src/core/types.js";
import { TAIYI_SEED_MARKER } from "../src/core/seed-marker.js";
import {
  mergeAuxiliaryFromArtifacts,
  syncChangeState,
  tryPromoteSeedArtifact,
} from "../src/core/state-sync.js";

function baseState(overrides: Partial<ChangeState> = {}): ChangeState {
  return {
    slug: "demo",
    currentPhase: "change",
    completedPhases: [],
    profile: "full",
    skippedPhases: [],
    strictDev: false,
    autoHarness: false,
    auxiliaryCompleted: [],
    workflowStatus: "active",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

describe("state-sync", () => {
  let changeDir: string;

  beforeEach(() => {
    changeDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sync-"));
  });

  afterEach(() => {
    fs.rmSync(changeDir, { recursive: true, force: true });
  });

  it("merges auxiliaryCompleted from CONTEXT.md on disk", () => {
    fs.writeFileSync(
      path.join(changeDir, "CONTEXT.md"),
      "# CONTEXT\n\n## Stack\nTypeScript monorepo with vitest.\n",
      "utf8",
    );
    const { state, added } = mergeAuxiliaryFromArtifacts(changeDir, baseState());
    expect(added).toContain("taiyi-intel-scan");
    expect(state.auxiliaryCompleted).toContain("taiyi-intel-scan");
  });

  it("promotes seed CHANGE when content is substantive", () => {
    const p = path.join(changeDir, "CHANGE.md");
    fs.writeFileSync(
      p,
      `${TAIYI_SEED_MARKER}
# CHANGE: Demo

## Motivation
Users need dark mode on settings page for night reading comfort.

## Scope
- In: settings toggle and CSS variables
- Out: system theme sync

## Risks
Hard-coded colors may miss some components.

## Success Criteria
- [ ] Toggle works and persists after refresh
`,
      "utf8",
    );
    expect(tryPromoteSeedArtifact(p, "change")).toBe(true);
    const text = fs.readFileSync(p, "utf8");
    expect(text.includes(TAIYI_SEED_MARKER)).toBe(false);
    expect(text.includes("dark mode")).toBe(true);
  });

  it("blocks continue when future phase artifact exists", () => {
    fs.writeFileSync(
      path.join(changeDir, "REQUIREMENT.md"),
      "# REQUIREMENT\n\n## User Stories\n| ID | As a… | I want… | So that… |\n| US-1 | user | x | y |\n\n## Acceptance Criteria\n- **Given** a\n- **When** b\n- **Then** c\n",
      "utf8",
    );
    const r = syncChangeState(changeDir, baseState());
    expect(r.blockers.some((b) => b.code === "artifacts.ahead-of-phase")).toBe(true);
  });

  it("sync reports actions when auxiliary and seed promote both apply", () => {
    fs.writeFileSync(
      path.join(changeDir, "CONTEXT.md"),
      "# CONTEXT\n\n## Modules\nsrc/settings, src/theme.\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `${TAIYI_SEED_MARKER}
# CHANGE: Demo

## Motivation
Need dark mode toggle for accessibility at night.

## Scope
- In: settings UI toggle
- Out: server sync

## Risks
None major.

## Success Criteria
- [ ] Toggle persists
`,
      "utf8",
    );
    const r = syncChangeState(changeDir, baseState());
    expect(r.changed).toBe(true);
    expect(r.actions.some((a) => /辅助完成/.test(a))).toBe(true);
    expect(r.actions.some((a) => /模板标记/.test(a))).toBe(true);
    expect(r.state.auxiliaryCompleted).toContain("taiyi-intel-scan");
  });
});
