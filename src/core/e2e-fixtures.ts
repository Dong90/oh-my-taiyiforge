import type { PhaseId } from "./types.js";
import { listPhases } from "./phase-registry.js";

/** Zod-valid minimal JSON payloads (mirror ChangeSchema etc.) for E2E / dogfood seed. */
const E2E_JSON_ARTIFACTS: Record<Exclude<PhaseId, "dev">, object> = {
  change: {
    title: "E2E Demo",
    motivation: "Validate TaiyiForge nine-phase workflow end-to-end in CI and dogfood runs.",
    scope: {
      includes: ["workflow engine smoke"],
      excludes: ["production features"],
    },
    success_criteria: [
      { id: "SC-01", description: "All nine phases complete with gates passing", is_checked: true },
    ],
    evidence: {
      command: "taiyi-forge.sh status --json --compact",
      exitCode: 0,
      capturedAt: "2026-06-17T12:00:00Z",
    },
  },
  requirement: {
    title: "E2E Demo",
    features: ["Nine-phase workflow runs to completion"],
    acceptance_criteria: [
      { id: "AC-01", description: "State shows integration completed", is_checked: true },
    ],
    evidence: {
      command: "taiyi-forge.sh status --json --compact",
      exitCode: 0,
      capturedAt: "2026-06-17T12:00:00Z",
    },
  },
  design: {
    title: "E2E Demo",
    options: [
      { id: "A", name: "Inline script", pros: ["Fast"], cons: ["Manual"] },
      { id: "B", name: "Vitest only", pros: ["CI"], cons: ["No CLI"] },
    ],
    decision: { chosen: "B", reason: "Automated regression in every release." },
  },
  "ui-design": {
    title: "E2E Demo",
    scope: "CLI/workflow only; no user interface surfaces.",
  },
  task: {
    title: "E2E Demo",
    slices: [{ id: "S1", label: "e2e test", description: "vitest green" }],
  },
  test: {
    title: "E2E Demo",
    test_plan: [
      { id: "T-01", description: "workflow smoke", status: "passed" as const },
    ],
    evidence: {
      command: "taiyi-forge.sh status --json --compact",
      exitCode: 0,
      capturedAt: "2026-06-17T12:00:00Z",
    },
  },
  review: {
    title: "E2E Demo",
    verdict: "approved" as const,
  },
  integration: {
    title: "E2E Demo",
    changelog_entries: [
      { type: "test" as const, description: "E2E workflow regression test and dogfood script." },
    ],
    release_version: "0.0.0",
  },
};

/** Minimal valid artifact bodies for E2E / dogfood (pass artifact-validator). */
export const E2E_ARTIFACTS: Record<Exclude<PhaseId, "dev">, { md: string; json: object }> = {
  change: {
    md: `# CHANGE: E2E Demo

## Motivation
Validate TaiyiForge nine-phase workflow end-to-end in CI and dogfood runs.

## Scope
- In: workflow engine smoke
- Out: production features

## Risks
Low — docs and state only.

## Success Criteria
- [x] All nine phases complete with gates passing
`,
    json: E2E_JSON_ARTIFACTS.change,
  },
  requirement: {
    md: `# REQUIREMENT: E2E Demo

## User Stories

| ID | As a… | I want… | So that… |
|----|--------|---------|----------|
| US-1 | developer | run e2e | I trust releases |

## Acceptance Criteria (Given / When / Then)

### US-1

- **Given** a fresh change slug
- **When** I complete each phase with valid artifacts
- **Then** state shows integration completed

## Traceability

| AC | Links to CHANGE.md |
|----|-------------------|
| US-1 | Success Criteria |

## Out of Scope

External npm registry in this test only.
`,
    json: E2E_JSON_ARTIFACTS.requirement,
  },
  design: {
    md: `# DESIGN: E2E Demo

## Context

Dogfood validates WorkflowEngine and validators.

## Options

| Option | Summary | Pros | Cons | Cost |
|--------|---------|------|------|------|
| A | Inline script | Fast | Manual | Low |
| B | Vitest only | CI | No CLI | Low |

## Decision

**Chosen:** Option B for CI, script for local dogfood.

**Reason:** Automated regression in every release.

## Architecture

\`\`\`text
init → write artifacts → complete × 9
\`\`\`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Validator drift | Shared E2E_ARTIFACTS fixture |

## Open Questions

- [ ] None for smoke test
`,
    json: E2E_JSON_ARTIFACTS.design,
  },
  "ui-design": {
    md: `# UI-DESIGN: E2E Demo

## Scope

N/A — this dogfood change is CLI/workflow only; no user interface surfaces.

## Layout & Hierarchy

Not applicable.

## States

| State | Behavior |
|-------|----------|
| n/a | CLI only |

## Accessibility

- [x] N/A documented

## Links

- DESIGN.md: inline script vs vitest
- REQUIREMENT.md AC: US-1
`,
    json: E2E_JSON_ARTIFACTS["ui-design"],
  },
  task: {
    md: `# TASK: E2E Demo

## Slices (vertical, smallest shippable first)

| # | Slice | Depends | Done when |
|---|-------|---------|-----------|
| 1 | e2e test | — | vitest green |

## Checklist per slice

- [x] 测试先行（RED）
- [x] 最小实现（GREEN）
- [x] 重构（REFACTOR）
- [x] 更新追溯（REQUIREMENT AC）

## Non-goals (this change)

Shipping application UI.
`,
    json: E2E_JSON_ARTIFACTS.task,
  },
  test: {
    md: `# TEST: E2E Demo

## Test Plan

| Level | Scope | Command / Tool |
|-------|-------|----------------|
| unit | workflow | npm test |

## Coverage vs AC

| AC (REQUIREMENT) | Test evidence |
|------------------|---------------|
| US-1 | tests/e2e-workflow.test.ts |

## Results

- [x] All required suites pass
- [x] No flaky tests introduced

## Gaps / Follow-ups

None for smoke.
`,
    json: E2E_JSON_ARTIFACTS.test,
  },
  review: {
    md: `# REVIEW: E2E Demo

## Summary

E2E smoke for nine-phase TaiyiForge workflow.

## Findings

| Severity | File / Area | Issue | Suggestion |
|----------|-------------|-------|------------|
| low | docs | — | — |

## Security & Trust

- [x] 输入校验 / 鉴权边界 N/A
- [x] 无硬编码密钥

## Verdict

- [x] **Approve** — 可合并
`,
    json: E2E_JSON_ARTIFACTS.review,
  },
  integration: {
    md: `# CHANGELOG: E2E Demo

## Added

- E2E workflow regression test and dogfood script.

## Changed

- Release process includes full phase walkthrough.

## Fixed

- N/A

## Docs / Skills

- [x] README / AGENTS.md 已同步（若对外行为变化）
- [ ] OpenSpec / 规格已 archive（若适用）

## Rollback

Revert commit; no schema migration.
`,
    json: E2E_JSON_ARTIFACTS.integration,
  },
};

export const E2E_PHASE_ORDER: PhaseId[] = listPhases().map((p) => p.id);
