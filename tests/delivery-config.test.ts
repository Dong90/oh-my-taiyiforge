import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  DEFAULT_DELIVERY_CONFIG,
  bundledDeliveryYamlPath,
  deepMergeDeliveryConfig,
  loadDeliveryYamlLayers,
  parseDeliveryYaml,
  projectDeliveryYamlPath,
  resolveDeliveryConfig,
  resolveDeliveryGateEnabled,
  resolveDeliveryVerifyFromConfig,
  resolveSlugTrailerKey,
} from "../src/core/delivery-config.js";

describe("delivery-config", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-delivery-"));
    fs.mkdirSync(path.join(workspace, ".taiyi"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("loads bundled defaults when project yaml missing", () => {
    const cfg = resolveDeliveryConfig(workspace);
    expect(cfg.commit.requiredTrailers[0]?.key).toBe("Taiyi-Change");
    expect(cfg.git.baseBranches).toContain("origin/main");
    expect(cfg.chain.steps[0]).toBe("commit");
  });

  it("merges project delivery.yaml over defaults", () => {
    fs.writeFileSync(
      projectDeliveryYamlPath(workspace),
      `commit:
  subjectTemplate: "[{slug}] {type}: {summary}"
ship:
  pr:
    labels:
      - taiyi
`,
    );
    const cfg = loadDeliveryYamlLayers(workspace);
    expect(cfg.commit.subjectTemplate).toBe("[{slug}] {type}: {summary}");
    expect(cfg.ship.pr.labels).toEqual(["taiyi"]);
    expect(cfg.git.baseBranches).toContain("origin/main");
  });

  it("parses requiredTrailers and baseBranches from yaml", () => {
    const partial = parseDeliveryYaml(`
version: 1
commit:
  subjectTemplate: "{type}: {summary}"
  requiredTrailers:
    - key: Jira-Id
      value: "{slug}"
git:
  baseBranches:
    - origin/release
    - origin/main
`);
    expect(partial.commit?.requiredTrailers).toEqual([{ key: "Jira-Id", value: "{slug}" }]);
    expect(partial.git?.baseBranches).toEqual(["origin/release", "origin/main"]);
  });

  it("deepMerge preserves unspecified nested fields", () => {
    const merged = deepMergeDeliveryConfig(DEFAULT_DELIVERY_CONFIG, {
      ship: { provider: "manual" },
    });
    expect(merged.ship.provider).toBe("manual");
    expect(merged.ship.push).toBe(true);
  });

  it("resolveSlugTrailerKey finds slug trailer", () => {
    const cfg = deepMergeDeliveryConfig(DEFAULT_DELIVERY_CONFIG, {
      commit: { requiredTrailers: [{ key: "Jira-Id", value: "{slug}" }] },
    });
    expect(resolveSlugTrailerKey(cfg)).toBe("Jira-Id");
  });

  it("verify precedence: env > config.json > yaml > package.json", () => {
    fs.writeFileSync(
      projectDeliveryYamlPath(workspace),
      "verify:\n  command: from-yaml\n",
    );
    fs.writeFileSync(
      path.join(workspace, ".taiyi", "config.json"),
      JSON.stringify({ deliveryVerifyCmd: "from-json" }),
    );
    fs.writeFileSync(
      path.join(workspace, "package.json"),
      JSON.stringify({ taiyi: { deliveryVerifyCmd: "from-pkg" } }),
    );
    const delivery = resolveDeliveryConfig(workspace);
    expect(resolveDeliveryVerifyFromConfig(workspace, delivery, {})).toBe("from-json");
    expect(
      resolveDeliveryVerifyFromConfig(workspace, delivery, {
        TAIYI_DELIVERY_VERIFY_CMD: "from-env",
      }),
    ).toBe("from-env");
    fs.writeFileSync(
      path.join(workspace, ".taiyi", "config.json"),
      JSON.stringify({}),
    );
    expect(resolveDeliveryVerifyFromConfig(workspace, delivery, {})).toBe("from-yaml");
  });

  it("deliveryGate: env > config.json > git presence", () => {
    fs.writeFileSync(
      path.join(workspace, ".taiyi", "config.json"),
      JSON.stringify({ deliveryGate: false }),
    );
    expect(resolveDeliveryGateEnabled(workspace, {})).toBe(false);
    expect(resolveDeliveryGateEnabled(workspace, { TAIYI_DELIVERY_GATE: "1" })).toBe(true);
  });

  it("bundled delivery.yaml parses without error", () => {
    const bundled = fs.readFileSync(bundledDeliveryYamlPath(), "utf8");
    const parsed = parseDeliveryYaml(bundled);
    expect(parsed.version).toBe(1);
    expect(parsed.commit?.requiredTrailers?.length).toBeGreaterThan(0);
    expect(parsed.git?.baseBranches?.length).toBeGreaterThan(0);
  });
});
