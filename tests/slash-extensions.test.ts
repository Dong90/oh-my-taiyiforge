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

/** v30 斜杠扩展 — 单一 /taiyi:skill 伞形吸收原 gstack/sp/explore/tdd/flow */
describe("slash extensions", () => {
  it("taiyi-skill routes umbrella for gstack + sp + explore + tdd + flow", () => {
    const body = rendered("taiyi-skill.md");
    expect(body).toContain("/taiyi:skill");
    for (const skill of ["design-shotgun", "autoplan", "canary", "gstack-upgrade"]) {
      expect(body, skill).toContain(skill);
    }
    expect(body).toContain("brainstorming");
    expect(body).toContain("writing-skills");
    expect(body).not.toContain(SUPERPOWERS_INVOKE_PLACEHOLDER);
    expect(body).toContain("verification-before-completion");
  });

  it("taiyi-security|e2e|smoke moved to test umbrella", () => {
    const body = rendered("taiyi-test.md");
    expect(body).toContain("/taiyi:test");
  });

  it("commands.yaml documents v30 umbrella + legacy slashes", () => {
    const yaml = fs.readFileSync(
      path.join(repoRoot, "docs/taiyi/commands.yaml"),
      "utf8",
    );
    for (const needle of [
      "/taiyi:write",
      "/taiyi:plan",
      "/taiyi:skill <name>",
      "/taiyi:ralph",
      "/taiyi:autopilot",
      "/taiyi:team",
    ]) {
      expect(yaml, needle).toContain(needle);
    }
  });
});
