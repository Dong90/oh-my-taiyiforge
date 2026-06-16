import { describe, expect, it } from "vitest";
import { validateArtifactFile } from "../src/core/artifact-validator.js";
import { TAIYI_SEED_MARKER } from "../src/core/seed-marker.js";
import { auxiliaryArtifactSatisfied } from "../src/core/auxiliary-artifacts.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("artifact-validator", () => {
  it("seeded CONTEXT.md does not satisfy taiyi-intel-scan", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-aux-"));
    fs.writeFileSync(
      path.join(dir, "CONTEXT.md"),
      `${TAIYI_SEED_MARKER}\n# CONTEXT\n`,
      "utf8",
    );
    expect(auxiliaryArtifactSatisfied(dir, "taiyi-intel-scan")).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod CHANGE passes with valid JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "change.json"), JSON.stringify({ title: "Demo", motivation: "test", scope: { includes: ["x"] }, success_criteria: [{ id: "SC-01", description: "pass" }] }));
    fs.writeFileSync(path.join(dir, "CHANGE.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r!.scores.completeness).toBe(true);
    expect(r!.scores.consistency).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod CHANGE fails without JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "CHANGE.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r).not.toBeNull();
    expect(r!.scores.completeness).toBe(false);
    expect(r!.hints.some((h) => /缺少 change\.json/.test(h))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod CHANGE fails with corrupted JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "change.json"), "{}");
    fs.writeFileSync(path.join(dir, "CHANGE.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r).not.toBeNull();
    expect(r!.scores.completeness).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod CHANGE fails with seed template MD", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "change.json"), JSON.stringify({ title: "Demo", motivation: "test", scope: { includes: ["x"] }, success_criteria: [{ id: "SC-01", description: "pass" }] }));
    fs.writeFileSync(path.join(dir, "CHANGE.md"), `${TAIYI_SEED_MARKER}\n# CHANGE\n\ncontent for 60 chars minimum requirement here more extra text for fill to pass`);
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r!.scores.completeness).toBe(false);
    expect(r!.hints.some((h) => /模板占位/i.test(h))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod CHANGE fails with placeholder content", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "change.json"), JSON.stringify({ title: "Demo", motivation: "test", scope: { includes: ["x"] }, success_criteria: [{ id: "SC-01", description: "pass" }] }));
    fs.writeFileSync(path.join(dir, "CHANGE.md"), "{{title}} content for 60 chars minimum requirement here more extra text for fill to pass");
    const r = validateArtifactFile(path.join(dir, "CHANGE.md"), "change");
    expect(r!.scores.completeness).toBe(false);
    expect(r!.hints.some((h) => /占位符/i.test(h))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod TASK passes with valid JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "task.json"), JSON.stringify({ title: "Demo", slices: [{ id: "S1", label: "api layer", description: "add api endpoints", test_command: "npm test api" }] }));
    fs.writeFileSync(path.join(dir, "TASK.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");
    const r = validateArtifactFile(path.join(dir, "TASK.md"), "task");
    expect(r!.scores.completeness).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod TASK fails without JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "TASK.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");
    const r = validateArtifactFile(path.join(dir, "TASK.md"), "task");
    expect(r).not.toBeNull();
    expect(r!.scores.completeness).toBe(false);
    expect(r!.hints.some((h) => /缺少 task\.json/.test(h))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod TASK fails with empty slices", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "task.json"), JSON.stringify({ title: "Demo", slices: [] }));
    fs.writeFileSync(path.join(dir, "TASK.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");
    const r = validateArtifactFile(path.join(dir, "TASK.md"), "task");
    expect(r!.scores.completeness).toBe(false);
    expect(r!.hints.some((h) => /Zod 校验失败/.test(h))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod REQUIREMENT passes with valid JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "requirement.json"), JSON.stringify({ title: "Login", features: ["email login"], acceptance_criteria: [{ id: "AC-01", description: "user can login" }] }));
    fs.writeFileSync(path.join(dir, "REQUIREMENT.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");
    const r = validateArtifactFile(path.join(dir, "REQUIREMENT.md"), "requirement");
    expect(r!.scores.completeness).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod phase REQUIREMENT without JSON -> fails via validateArtifactFile", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "REQUIREMENT.md"), "content enough for 60 characters minimum fill text here more");
    const r = validateArtifactFile(path.join(dir, "REQUIREMENT.md"), "requirement");
    expect(r).not.toBeNull();
    expect(r!.scores.completeness).toBe(false);
    expect(r!.hints.some((h) => /缺少 requirement\.json/.test(h))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod phase DESIGN without JSON -> fails via validateArtifactFile", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "DESIGN.md"), "content enough for 60 characters minimum fill text here more longer");
    const r = validateArtifactFile(path.join(dir, "DESIGN.md"), "design");
    expect(r).not.toBeNull();
    expect(r!.scores.completeness).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
