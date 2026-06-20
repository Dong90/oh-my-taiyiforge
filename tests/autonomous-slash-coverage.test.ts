import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROMPTS = path.join(REPO, "prompts");
const COMMANDS_YAML = path.join(REPO, "docs/taiyi/commands.yaml");

/** OMC 自主编排核心斜杠 — 须有 prompt + catalog + 引擎子命令 */
const OMC_AUTONOMOUS_SLASHES: { slash: string; prompt: string; engine: string }[] = [
  { slash: "/taiyi:ralph", prompt: "taiyi-ralph.md", engine: "ralph" },
  { slash: "/taiyi:autopilot", prompt: "taiyi-autopilot.md", engine: "autopilot" },
  { slash: "/taiyi:daemon", prompt: "taiyi-daemon.md", engine: "daemon run" },
  { slash: "/taiyi:team", prompt: "taiyi-team.md", engine: "team" },
  { slash: "/taiyi:ultrawork", prompt: "taiyi-ultrawork.md", engine: "ultrawork" },
  { slash: "/taiyi:agent", prompt: "taiyi-agent.md", engine: "agent" },
  { slash: "/taiyi:step", prompt: "taiyi-step.md", engine: "step" },
  { slash: "/taiyi:stop-mode", prompt: "taiyi-stop-mode.md", engine: "stop-mode" },
];

describe("OMC autonomous slash coverage", () => {
  const yaml = fs.readFileSync(COMMANDS_YAML, "utf8");

  it("each core OMC slash has prompt file mentioning the slash", () => {
    for (const { slash, prompt } of OMC_AUTONOMOUS_SLASHES) {
      const p = path.join(PROMPTS, prompt);
      expect(fs.existsSync(p), prompt).toBe(true);
      const body = fs.readFileSync(p, "utf8");
      expect(body, prompt).toContain(slash.split(" ")[0]);
    }
  });

  it("each core OMC slash is listed in commands.yaml legacy_slash or canonical_v28", () => {
    for (const { slash } of OMC_AUTONOMOUS_SLASHES) {
      expect(yaml, slash).toContain(slash);
    }
  });

  it("each core OMC slash has engine entry in commands.yaml auxiliary", () => {
    for (const { slash, engine } of OMC_AUTONOMOUS_SLASHES) {
      if (engine === "preflight") continue;
      expect(yaml, `${slash} engine`).toMatch(new RegExp(`taiyi-forge\\.sh ${engine.replace("-", "\\-")}`));
    }
  });

  it("canonical-commands documents OMC diff and v28 mode umbrella", () => {
    const canon = fs.readFileSync(path.join(REPO, "docs/taiyi/canonical-commands.md"), "utf8");
    expect(canon).toContain("与 OMC 的差异");
    expect(canon).toContain("spawn 计划");
    expect(canon).toContain("无 tmux");
    expect(canon).toContain("canonical v28");
    expect(canon).toContain("/taiyi:mode");
    for (const { slash } of OMC_AUTONOMOUS_SLASHES) {
      expect(canon, slash).toContain(slash.split(" ")[0]);
    }
  });
});
