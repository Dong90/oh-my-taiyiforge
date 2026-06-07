import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  STAGE_PROTOCOL_PLACEHOLDER,
  loadStageProtocol,
  renderTaiyiPrompt,
} from "../src/install/prompt-stage-protocol.js";
import { resolvePackageRoot } from "../src/core/package-root.js";

const pkgRoot = resolvePackageRoot(new URL("../src/install/prompt-stage-protocol.ts", import.meta.url).href);
const promptsDir = path.join(pkgRoot, "prompts");

describe("prompt-stage-protocol", () => {
  it("loads inc/stage-protocol.md", () => {
    const text = loadStageProtocol(promptsDir);
    expect(text).toContain("## Agent 协议");
    expect(text).toContain("dev/test 之前禁止改业务代码");
  });

  it("replaces placeholder", () => {
    const out = renderTaiyiPrompt(
      "taiyi-continue.md",
      `body\n\n${STAGE_PROTOCOL_PLACEHOLDER}\n`,
      promptsDir,
    );
    expect(out).not.toContain(STAGE_PROTOCOL_PLACEHOLDER);
    expect(out).toContain("默认手动九阶段");
  });

  it("replaces inline duplicate section", () => {
    const out = renderTaiyiPrompt(
      "taiyi-new.md",
      "intro\n\n## Agent 协议（必须遵守）\n\n1. old rule\n",
      promptsDir,
    );
    expect(out).not.toContain("1. old rule");
    expect(out).toContain("以 `/taiyi:status` 引擎输出为准");
  });

  it("appends to taiyi prompts without protocol", () => {
    const out = renderTaiyiPrompt("taiyi-archive.md", "archive body\n", promptsDir);
    expect(out).toContain("archive body");
    expect(out).toContain("## Agent 协议");
  });

  it("replaces gstack invoke placeholder", () => {
    const out = renderTaiyiPrompt(
      "taiyi-ship.md",
      `ship\n\n{{GSTACK_INVOKE}}\n`,
      promptsDir,
    );
    expect(out).not.toContain("{{GSTACK_INVOKE}}");
    expect(out).toContain("gstack Skill");
  });
});
