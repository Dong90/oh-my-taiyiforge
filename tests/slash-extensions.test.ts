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

  it("taiyi-browser-smoke runs forge browser-smoke script", () => {
    const body = rendered("taiyi-browser-smoke.md");
    expect(body).toContain("/taiyi:browser-smoke");
    expect(body).toContain("browser-smoke");
    expect(body).toContain("playwright");
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

  it("taiyi-help lists full slash_catalog (not abbreviated)", () => {
    const body = rendered("taiyi-help.md");
    expect(body).toContain("/taiyi:help");
    expect(body).toContain("slash_catalog");
    expect(body).toContain("/taiyi:write");
    expect(body).toContain("/taiyi:apply");
    expect(body).toContain("/taiyi:doctor");
    expect(body).toContain("/taiyi:browser-smoke");
    expect(body).toContain("/taiyi:daemon");
    expect(body).toContain("/taiyi:init");
    expect(body).toContain("/taiyi:commit");
    expect(body).toContain("/taiyi:ralph");
    expect(body).toContain("/taiyi:autopilot");
    expect(body).toContain("/taiyi:team");
    expect(body).toContain("/taiyi:ultrawork");
    expect(body).toContain("/taiyi:agent");
    expect(body).toContain("/taiyi:keyword");
    expect(body).toContain("/taiyi:step");
    expect(body).toContain("/taiyi:stop-mode");
    expect(body).toContain("/taiyi:modes");
    expect(body).toContain("/taiyi:e2e");
    expect(body).toContain("/taiyi:gstack");
    expect(body).toContain("/taiyi:sp");
    expect(body).toContain("/taiyi:resume");
    expect(body).toMatch(/taiyi-xxx|连字符/);
  });

  it("commands.yaml documents extension slashes", () => {
    const yaml = fs.readFileSync(
      path.join(repoRoot, "docs/taiyi/commands.yaml"),
      "utf8",
    );
    for (const needle of [
      "/taiyi:help",
      "/taiyi:write",
      "/taiyi:feature",
      "/taiyi:bug",
      "/taiyi:ui-test",
      "/taiyi:resume",
      "/taiyi:security",
      "/taiyi:e2e",
      "/taiyi:browser-smoke",
      "/taiyi:ralph",
      "/taiyi:autopilot",
      "/taiyi:daemon",
      "/taiyi:diagram-arch",
      "/taiyi:diagram-flow",
      "/taiyi:team",
      "/taiyi:agent",
      "/taiyi:gstack <skill>",
      "/taiyi:sp <skill>",
    ]) {
      expect(yaml, needle).toContain(needle);
    }
  });
});
