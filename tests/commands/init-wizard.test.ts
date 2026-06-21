import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const OLD_ENV = { ...process.env };

// We import from source (TypeScript) directly; vitest handles transpilation.
import { runInitWizard, type InitWizardAnswers } from "../../src/commands/init-wizard.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "init-wizard-"));
});

afterEach(() => {
  process.env = { ...OLD_ENV };
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("init wizard", () => {
  it("creates .taiyi/config.json with defaults", async () => {
    const answers = await runInitWizard(tmpDir);
    expect(answers.scenario).toBe("default");
    expect(answers.defaultProfile).toBe("api");
    expect(answers.deliveryGate).toBe(false);
    expect(answers.commitTrailers).toBe(true);

    const configPath = path.join(tmpDir, ".taiyi", "config.json");
    expect(fs.existsSync(configPath)).toBe(true);
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(config.scenario).toBe("default");
    expect(config.defaultProfile).toBe("api");
  });

  it("respects TAIYI_SCENARIO env var", async () => {
    process.env.TAIYI_SCENARIO = "service";
    const answers = await runInitWizard(tmpDir);
    expect(answers.scenario).toBe("service");
    expect(answers.defaultProfile).toBe("api"); // unchanged
  });

  it("respects TAIYI_DEFAULT_PROFILE env var", async () => {
    process.env.TAIYI_DEFAULT_PROFILE = "lite";
    const answers = await runInitWizard(tmpDir);
    expect(answers.defaultProfile).toBe("lite");
  });

  it("respects TAIYI_DELIVERY_GATE=1", async () => {
    process.env.TAIYI_DELIVERY_GATE = "1";
    const answers = await runInitWizard(tmpDir);
    expect(answers.deliveryGate).toBe(true);
  });

  it("respects TAIYI_COMMIT_TRAILERS=0", async () => {
    process.env.TAIYI_COMMIT_TRAILERS = "0";
    const answers = await runInitWizard(tmpDir);
    expect(answers.commitTrailers).toBe(false);
  });

  it("handles invalid scenario gracefully", async () => {
    process.env.TAIYI_SCENARIO = "invalid-scenario";
    const answers = await runInitWizard(tmpDir);
    expect(answers.scenario).toBe("default"); // falls back
  });

  it("preserves existing config keys when partial env vars set", async () => {
    process.env.TAIYI_SCENARIO = "mvp";
    const answers = await runInitWizard(tmpDir);
    expect(answers.scenario).toBe("mvp");
    expect(answers.defaultProfile).toBe("api"); // default
  });

  it("all env vars set non-interactive mode", async () => {
    process.env.TAIYI_SCENARIO = "devops";
    process.env.TAIYI_DEFAULT_PROFILE = "full";
    process.env.TAIYI_DELIVERY_GATE = "0";
    process.env.TAIYI_COMMIT_TRAILERS = "0";
    const answers = await runInitWizard(tmpDir);
    expect(answers).toEqual({
      scenario: "devops",
      defaultProfile: "full",
      deliveryGate: false,
      commitTrailers: false,
    });
  });
});
