import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SUPERPOWERS_INVOKE_PLACEHOLDER,
  renderTaiyiPrompt,
} from "../src/install/prompt-stage-protocol.js";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const promptsDir = path.join(repoRoot, "prompts");

function readPrompt(name: string): string {
  return fs.readFileSync(path.join(promptsDir, name), "utf8");
}

function rendered(name: string): string {
  return renderTaiyiPrompt(name, readPrompt(name), promptsDir);
}

/** 新增斜杠扩展 — 内容与占位符契约 */
describe("slash extensions", () => {
  it("taiyi-gstack routes named skills including user-requested four", () => {
    const body = rendered("taiyi-gstack.md");
    expect(body).toContain("/taiyi:gstack");
    for (const skill of ["design-shotgun", "autoplan", "canary", "gstack-upgrade"]) {
      expect(body, skill).toContain(skill);
    }
    expect(body).toContain("gstack Skill");
    expect(body).not.toContain("{{GSTACK_INVOKE}}");
  });

  it("taiyi-sp routes Superpowers including writing-skills", () => {
    const body = rendered("taiyi-sp.md");
    expect(body).toContain("/taiyi:sp");
    expect(body).toContain("writing-skills");
    expect(body).not.toContain(SUPERPOWERS_INVOKE_PLACEHOLDER);
    expect(body).toContain("verification-before-completion");
  });

  it("taiyi-security runs semgrep and trivy", () => {
    const body = rendered("taiyi-security.md");
    expect(body).toContain("/taiyi:security");
    expect(body).toContain("semgrep scan --config auto");
    expect(body).toContain("trivy fs .");
    expect(body).toContain("/taiyi:gstack cso");
  });

  it("taiyi-e2e runs playwright with verification skill", () => {
    const body = rendered("taiyi-e2e.md");
    expect(body).toContain("/taiyi:e2e");
    expect(body).toContain("npx playwright test");
    expect(body).toContain("verification-before-completion");
  });

  it("taiyi-resume pairs with handoff", () => {
    const body = rendered("taiyi-resume.md");
    expect(body).toContain("/taiyi:resume");
    expect(body).toContain("HANDOFF.md");
    expect(body).toContain("scripts/taiyi-forge.sh status");
    const handoff = readPrompt("taiyi-handoff.md");
    expect(handoff).toContain("/taiyi:resume");
  });

  it("taiyi-help lists catalog and scenario shortcuts", () => {
    const body = rendered("taiyi-help.md");
    expect(body).toContain("/taiyi:help");
    expect(body).toContain("slash_catalog");
    expect(body).toContain("/taiyi:security");
    expect(body).toContain("/taiyi:e2e");
    expect(body).toContain("/taiyi:gstack");
    expect(body).toContain("/taiyi:sp");
    expect(body).toContain("/taiyi:resume");
  });

  it("commands.yaml documents extension slashes", () => {
    const yaml = fs.readFileSync(
      path.join(repoRoot, "docs/taiyi/commands.yaml"),
      "utf8",
    );
    for (const needle of [
      "/taiyi:help",
      "/taiyi:write",
      "/taiyi:change",
      "/taiyi:feature",
      "/taiyi:bug",
      "/taiyi:ui-test",
      "/taiyi:resume",
      "/taiyi:security",
      "/taiyi:e2e",
      "/taiyi:ralph",
      "/taiyi:autopilot",
      "/taiyi:team",
      "/taiyi:agent",
      "/taiyi:gstack <skill>",
      "/taiyi:sp <skill>",
    ]) {
      expect(yaml, needle).toContain(needle);
    }
  });
});
