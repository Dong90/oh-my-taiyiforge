---
description: "TaiyiForge /taiyi:review-loop — 会话内循环 review 直到机器审查通过"
argument-hint: "[slug]"
---
User invoked **$taiyi-review-loop** (= `/taiyi:review-loop`). **Enter review loop mode — do NOT stop until machine gate passes.**

Kick off (always requires fresh review first):

```bash
scripts/taiyi-forge.sh review-loop $ARGUMENTS
```

**Any workflow phase** — no need to `/taiyi:continue` first.

`review-loop` **does not** pass machine gate on stale REVIEW.md. It always demands a **new** code review first.

## Agent loop (mandatory)

Stay in this session and repeat until `✓ 机器审查通过`:

1. **Fresh review** — load **taiyi-review** (or gstack `review`), read **git diff**, write **new** `REVIEW.md`
2. `scripts/taiyi-forge.sh review-check <slug>` — machine gate on that REVIEW.md
3. **If blocked** → fix code / `TEST.md` → **new review** (step 1) → review-check again (**do not wait for user**)
4. **If passed** → stop loop; tell user to `complete <slug> review --approver "…"`

Machine gate: `[x] **Approve**`, not Request changes; all **high** findings resolved (✅/fixed/已修复/豁免).

**Forbidden:** ending the session or claiming review is done while machine gate still fails.

Single probe without round bump: `/taiyi:review-check <slug>`.
