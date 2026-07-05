// Verify review score thresholds, progressive strategies, 3-round cap, and delivery confirm gate.
// Usage: npx tsx examples/verification-suite/verify-review-delivery.ts
import { evaluateReviewLoopStatus, parseCodeQualityScores } from "../../src/core/review-gate.js";
import { formatReviewLoopPlain } from "../../src/core/review-gate.js";
import { planDeliveryChain, formatDeliveryPlanPlain } from "../../src/core/delivery-plan.js";
import { DEFAULT_DELIVERY_CONFIG } from "../../src/core/delivery-config.js";
import { defaultReviewLoopMaxRounds } from "../../src/core/review-loop-state.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

function section(name: string) {
  console.log(`\n📋 ${name}`);
}

// ── Test 1: parseCodeQualityScores ──
section("Test 1: parseCodeQualityScores");

const reviewMd = `
## Verdict
- [x] **Approve**

| 维度 | 评分 | 备注 |
|------|------|------|
| 功能正确性 | 8/10 | 核心逻辑正确 |
| 架构一致性 | 7/10 | 结构良好 |
| 测试覆盖 | 9/10 | 覆盖充分 |
| 文档完整性 | 6/10 | 需完善 |
| 可维护性 | 8/10 | 代码清晰 |

⭐ **8/10**
`;

const scores = parseCodeQualityScores(reviewMd);
assert(scores["功能正确性"] === 8, "scores 功能正确性 = 8");
assert(scores["架构一致性"] === 7, "scores 架构一致性 = 7");
assert(scores["测试覆盖"] === 9, "scores 测试覆盖 = 9");
assert(scores["文档完整性"] === 6, "scores 文档完整性 = 6");
assert(scores["可维护性"] === 8, "scores 可维护性 = 8");

// ── Test 2: Scores below 8.5 → canStop=false ──
section("Test 2: Scores below 8.5 → blocked");

const result = evaluateReviewLoopStatus(reviewMd, 1);
assert(result.canStop === false, "canStop = false (code 7.7 < 8.5)");
assert(result.codeScore === 7.7, `codeScore = ${result.codeScore} (expected 7.7)`);
assert(result.docScore === 6, `docScore = ${result.docScore} (expected 6)`);
assert(result.testScore === 9, `testScore = ${result.testScore} (expected 9)`);
assert(result.overallScore === 8, `overallScore = ${result.overallScore} (expected 8)`);
assert(result.hints.length >= 8, `hints count >= 8 (got ${result.hints.length})`);
assert(result.hints.some(h => h.includes("R1 基础")), "contains R1 基础 strategies");

// ── Test 3: Round 1 → only basic strategies ──
section("Test 3: Round 1 → only R1 strategies (no R2/R3)");

const r1 = evaluateReviewLoopStatus(reviewMd, 1);
const hasR2 = r1.hints.some(h => h.includes("R2 进阶"));
const hasR3 = r1.hints.some(h => h.includes("R3 深度"));
assert(!hasR2, "Round 1 has no R2 strategies");
assert(!hasR3, "Round 1 has no R3 strategies");

// ── Test 4: Round 3 → all strategies ──
section("Test 4: Round 3 → R1+R2+R3 all strategies");

const r3 = evaluateReviewLoopStatus(reviewMd, 3);
const r3hasR2 = r3.hints.some(h => h.includes("R2 进阶"));
const r3hasR3 = r3.hints.some(h => h.includes("R3 深度"));
assert(r3hasR2, "Round 3 has R2 strategies");
assert(r3hasR3, "Round 3 has R3 strategies");
assert(r3.hints.length > r1.hints.length, "Round 3 has more hints than Round 1");

// ── Test 5: All scores 8.5+ → canStop=true ──
section("Test 5: All scores ≥ 8.5 → passes");

const perfectMd = `
## Verdict
- [x] **Approve**

| 维度 | 评分 | 备注 |
|------|------|------|
| 功能正确性 | 9/10 | great |
| 架构一致性 | 9/10 | great |
| 测试覆盖 | 9/10 | great |
| 文档完整性 | 9/10 | great |
| 可维护性 | 9/10 | great |

⭐ **9/10**
`;
const perfect = evaluateReviewLoopStatus(perfectMd, 1);
assert(perfect.canStop === true, "canStop = true (all scores ≥ 8.5)");
assert(perfect.hints.length === 0, "no hints when passing");

// ── Test 6: Cascading reminder when 2+ dims fail ──
section("Test 6: Multi-dimension failure → cascading reminder");

const twoFailMd = `
## Verdict
- [x] **Approve**

| 维度 | 评分 | 备注 |
|------|------|------|
| 功能正确性 | 5/10 | bad |
| 架构一致性 | 8/10 | ok |
| 测试覆盖 | 5/10 | bad |
| 文档完整性 | 5/10 | bad |
| 可维护性 | 8/10 | ok |

⭐ **6/10**
`;
const twoFail = evaluateReviewLoopStatus(twoFailMd, 1);
assert(twoFail.canStop === false, "canStop = false (3 dims fail)");
const hasCascade = twoFail.hints.some(h => h.includes("多维度不达标"));
assert(hasCascade, "cascading reminder shown for 3 dim failures");

// ── Test 7: 3-round cap ──
section("Test 7: defaultReviewLoopMaxRounds = 3");

const maxRounds = defaultReviewLoopMaxRounds();
assert(maxRounds === 3, `maxRounds = 3 (got ${maxRounds})`);

// ── Test 8: Single dimension fail → no cascade ──
section("Test 8: Single dimension failure → no cascading reminder");

const oneFailMd = `
## Verdict
- [x] **Approve**

| 维度 | 评分 | 备注 |
|------|------|------|
| 功能正确性 | 9/10 | ok |
| 架构一致性 | 9/10 | ok |
| 测试覆盖 | 9/10 | ok |
| 文档完整性 | 5/10 | bad |
| 可维护性 | 9/10 | ok |

⭐ **9/10**
`;
const oneFail = evaluateReviewLoopStatus(oneFailMd, 1);
assert(oneFail.canStop === false, "canStop = false (doc < 9)");
const noCascade = !oneFail.hints.some(h => h.includes("多维度不达标"));
assert(noCascade, "no cascading reminder for single dim failure");

// ── Test 9: Delivery confirmation gate ──
section("Test 9: Delivery chain confirmation gate");

const config = DEFAULT_DELIVERY_CONFIG;
assert(config.chain.requireConfirmBeforeStart === true, "requireConfirmBeforeStart = true (default)");

const plan = planDeliveryChain(config, "my-change", "integration");
const firstStep = plan.steps[0];
assert(firstStep.id === "confirm-delivery", `first step is confirm-delivery (got ${firstStep.id})`);
assert(firstStep.kind === "confirm", `step kind is confirm (got ${firstStep.kind})`);
assert(firstStep.description.includes("commit → verify → ship"), "description shows full chain");

const planText = formatDeliveryPlanPlain(plan);
assert(planText.includes("confirm-delivery"), "plan output includes confirm-delivery step");

// ── Test 10: Delivery confirm can be disabled ──
section("Test 10: requireConfirmBeforeStart = false → no confirm step");

const disabledConfig = { ...config, chain: { ...config.chain, requireConfirmBeforeStart: false } };
const disabledPlan = planDeliveryChain(disabledConfig, "my-change", "integration");
assert(disabledPlan.steps[0].id === "commit", "first step is commit when disabled");

// ── Summary ──
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) {
  console.log("❌ SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("✅ ALL TESTS PASSED");
}
