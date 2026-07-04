import { describe, expect, it } from "vitest";
import { DEFAULT_DELIVERY_CONFIG, deepMergeDeliveryConfig } from "../src/core/delivery-config.js";
import {
  renderCommitMessage,
  renderCommitSubject,
  renderTemplate,
  validateCommitSubject,
} from "../src/core/delivery-templates.js";

describe("delivery-templates", () => {
  it("renderTemplate replaces slug phase type summary", () => {
    expect(
      renderTemplate("[{slug}] {type}: {summary}", {
        slug: "my-feature",
        phase: "dev",
        type: "feat",
        summary: "add api",
      }),
    ).toBe("[my-feature] feat: add api");
  });

  it("renderCommitSubject uses config defaults", () => {
    const subject = renderCommitSubject(DEFAULT_DELIVERY_CONFIG, {
      slug: "x",
      phase: "dev",
    });
    expect(subject).toBe("feat: deliver change slice");
  });

  it("renderCommitMessage includes configured trailers", () => {
    const msg = renderCommitMessage(DEFAULT_DELIVERY_CONFIG, {
      slug: "ship-it",
      phase: "integration",
      summary: "merge slice",
    });
    expect(msg).toContain("feat: merge slice");
    expect(msg).toContain("Taiyi-Change: ship-it");
    expect(msg).toContain("Taiyi-Phase: integration");
  });

  it("custom subjectTemplate from merged config", () => {
    const cfg = deepMergeDeliveryConfig(DEFAULT_DELIVERY_CONFIG, {
      commit: { subjectTemplate: "[{slug}] {summary}" },
    });
    const msg = renderCommitMessage(cfg, {
      slug: "abc",
      phase: "dev",
      summary: "hello",
    });
    expect(msg.startsWith("[abc] hello")).toBe(true);
  });

  it("validateCommitSubject enforces maxSubjectLength", () => {
    const cfg = deepMergeDeliveryConfig(DEFAULT_DELIVERY_CONFIG, {
      commit: { maxSubjectLength: 10 },
    });
    expect(validateCommitSubject(cfg, "short").ok).toBe(true);
    expect(validateCommitSubject(cfg, "this is way too long").ok).toBe(false);
  });
});
