import type { PhaseId } from "./types.js";
import { listPhases } from "./phase-registry.js";

/** Minimal valid artifact bodies for E2E / dogfood (pass artifact-validator). */
export const E2E_ARTIFACTS: Record<Exclude<PhaseId, "dev">, string> = {
  change: `# CHANGE: E2E Demo

## Motivation
Validate TaiyiForge nine-phase workflow end-to-end in CI and dogfood runs.

## Scope
- In: workflow engine smoke
- Out: production features

## Risks
Low — docs and state only.

## Success Criteria
- [ ] All nine phases complete with gates passing
`,
  requirement: `# REQUIREMENT: E2E Demo

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
  design: `# DESIGN: E2E Demo

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
  "ui-design": `# UI-DESIGN: E2E Demo

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
  task: `# TASK: E2E Demo

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
  test: `# TEST: E2E Demo

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
  review: `# REVIEW: E2E Demo

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
  integration: `# CHANGELOG: E2E Demo

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
};

export const E2E_PHASE_ORDER: PhaseId[] = listPhases().map((p) => p.id);
