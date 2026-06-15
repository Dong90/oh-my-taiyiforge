import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  loadProjectConfig,
  profileForScenario,
  resolveDefaultProfile,
} from "../src/core/project-config.js";
import { deliveryGateEnabled } from "../src/core/gates/delivery-gate.js";
import { resolveDeliveryVerifyCmd } from "../src/core/gates/consumer-config.js";
import { commitTrailersEnabled } from "../src/core/gates/commit-trailer.js";

describe("project-config", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-cfg-"));
    fs.mkdirSync(path.join(workspace, ".taiyi"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("loads defaults when config missing", () => {
    expect(loadProjectConfig(workspace)).toEqual({});
    expect(resolveDefaultProfile(workspace)).toBe("full");
  });

  it("reads micro scenario profile mapping", () => {
    fs.writeFileSync(
      path.join(workspace, ".taiyi", "config.json"),
      JSON.stringify({
        scenario: "micro",
        defaultProfile: "micro",
        deliveryGate: false,
        deliveryVerifyCmd: "npm run check",
        commitTrailers: false,
      }),
    );
    const cfg = loadProjectConfig(workspace);
    expect(cfg.defaultProfile).toBe("micro");
    expect(profileForScenario("mvp")).toBe("spike");
    expect(profileForScenario("service")).toBe("api");
    expect(resolveDefaultProfile(workspace)).toBe("micro");
    expect(deliveryGateEnabled(workspace)).toBe(false);
    expect(resolveDeliveryVerifyCmd(workspace)).toBe("npm run check");
    expect(commitTrailersEnabled(workspace)).toBe(false);
  });
});
