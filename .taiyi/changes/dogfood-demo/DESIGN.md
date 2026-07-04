# DESIGN: E2E Demo

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

```text
init → write artifacts → complete × 9
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Validator drift | Shared E2E_ARTIFACTS fixture |

## Open Questions

- [ ] None for smoke test
