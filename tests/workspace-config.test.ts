import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  listWorkspaceConfigPaths,
  resolveWorkspaceConfig,
  workspaceConfigDoctorChecks,
} from "../src/core/workspace-config.js";

describe("workspace-config", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-wscfg-"));
    fs.mkdirSync(path.join(workspace, ".taiyi"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("lists canonical .taiyi paths", () => {
    const paths = listWorkspaceConfigPaths(workspace);
    expect(paths.configJson).toBe(path.join(workspace, ".taiyi", "config.json"));
    expect(paths.deliveryYaml).toBe(path.join(workspace, ".taiyi", "delivery.yaml"));
    expect(paths.providersYaml).toBe(path.join(workspace, ".taiyi", "providers.yaml"));
  });

  it("resolveWorkspaceConfig merges project + bundled delivery defaults", () => {
    fs.writeFileSync(
      path.join(workspace, ".taiyi", "config.json"),
      JSON.stringify({ scenario: "micro", deliveryGate: false }),
    );
    fs.writeFileSync(
      path.join(workspace, ".taiyi", "delivery.yaml"),
      "commit:\n  subjectTemplate: \"[{slug}] {summary}\"\n",
    );
    const snap = resolveWorkspaceConfig(workspace);
    expect(snap.project.scenario).toBe("micro");
    expect(snap.project.deliveryGate).toBe(false);
    expect(snap.delivery.commit.subjectTemplate).toBe("[{slug}] {summary}");
    expect(snap.delivery.commit.requiredTrailers.length).toBeGreaterThan(0);
    expect(snap.files.deliveryYaml).toBe(true);
    expect(snap.files.configJson).toBe(true);
  });

  it("works with no project files (bundled defaults only)", () => {
    const snap = resolveWorkspaceConfig(workspace);
    expect(snap.files.configJson).toBe(false);
    expect(snap.files.deliveryYaml).toBe(false);
    expect(snap.delivery.version).toBe(1);
    expect(snap.project).toEqual({});
  });

  it("workspaceConfigDoctorChecks flags missing optional files as info", () => {
    const snap = resolveWorkspaceConfig(workspace);
    const checks = workspaceConfigDoctorChecks(snap);
    const configCheck = checks.find((c) => c.id === "workspace-config-json");
    expect(configCheck?.ok).toBe(true);
    expect(configCheck?.detail).toMatch(/可选|未配置/);
  });

  it("workspaceConfigDoctorChecks ok when config.json present", () => {
    fs.writeFileSync(
      path.join(workspace, ".taiyi", "config.json"),
      JSON.stringify({ deliveryGate: true }),
    );
    const snap = resolveWorkspaceConfig(workspace);
    const checks = workspaceConfigDoctorChecks(snap);
    expect(checks.find((c) => c.id === "workspace-config-json")?.ok).toBe(true);
    expect(checks.find((c) => c.id === "workspace-config-json")?.detail).toMatch(/deliveryGate/);
  });
});
