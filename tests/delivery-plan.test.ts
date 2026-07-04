import { describe, expect, it } from "vitest";
import { DEFAULT_DELIVERY_CONFIG, deepMergeDeliveryConfig } from "../src/core/delivery-config.js";
import {
  formatDeliveryPlanPlain,
  planDeliveryChain,
} from "../src/core/delivery-plan.js";

describe("delivery-plan", () => {
  it("plans commit ship land chain with gh steps", () => {
    const plan = planDeliveryChain(DEFAULT_DELIVERY_CONFIG, "my-slug", "review", {
      summary: "ship feature",
    });
    expect(plan.chain).toContain("commit");
    expect(plan.chain).toContain("ship");
    expect(plan.steps.some((s) => s.id === "ship-push")).toBe(true);
    expect(plan.steps.some((s) => s.id === "ship-pr" && s.kind === "confirm")).toBe(true);
    expect(plan.steps.some((s) => s.command?.includes("gh pr create"))).toBe(true);
  });

  it("uses manual ship when gh unavailable", () => {
    const plan = planDeliveryChain(DEFAULT_DELIVERY_CONFIG, "x", "dev", {
      ghAvailable: false,
    });
    expect(plan.steps.some((s) => s.id === "ship-manual")).toBe(true);
    expect(plan.steps.some((s) => s.command?.includes("gh pr create"))).toBe(false);
  });

  it("includes verify step when command configured", () => {
    const cfg = deepMergeDeliveryConfig(DEFAULT_DELIVERY_CONFIG, {
      verify: { command: "npm test" },
    });
    const plan = planDeliveryChain(cfg, "x", "dev");
    expect(plan.steps.some((s) => s.id === "verify" && s.command === "npm test")).toBe(true);
  });

  it("formatDeliveryPlanPlain is human readable", () => {
    const plan = planDeliveryChain(DEFAULT_DELIVERY_CONFIG, "demo", "dev");
    const text = formatDeliveryPlanPlain(plan);
    expect(text).toContain("Delivery plan — demo");
    expect(text).toContain("Chain:");
  });
});
