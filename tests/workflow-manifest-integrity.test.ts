import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getWorkflowManifest,
  resetWorkflowManifestCache,
} from "../src/integrations/workflow-manifest.js";
import type { PhaseId } from "../src/core/types.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(REPO, "skills");
const PROMPTS_DIR = path.join(REPO, "prompts");

const TAIYI_SKILLS = new Set(
  fs.readdirSync(SKILLS_DIR).filter((d) => d.startsWith("taiyi-")),
);
const TAIYI_PROMPTS = new Set(
  fs
    .readdirSync(PROMPTS_DIR)
    .filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, "")),
);

/** workflow-manifest.yaml 引用的 Skill / prompt / 阶段工件 均可在仓库解析 */
describe("workflow-manifest integrity", () => {
  it("九阶段 taiyi_skill 均有 skills/ 对应物（写工件聊天入口统一 /taiyi:write）", () => {
    resetWorkflowManifestCache();
    const m = getWorkflowManifest();
    const missing: string[] = [];

    for (const [phaseId, phase] of Object.entries(m.phases)) {
      const skillId = phase.taiyi_skill;
      if (!TAIYI_SKILLS.has(skillId)) {
        missing.push(`${phaseId}: skills/${skillId}`);
      }
      if (phase.artifact && !phase.artifact.includes("(")) {
        expect(phase.artifact.length, phaseId).toBeGreaterThan(3);
      }
    }

    expect(TAIYI_PROMPTS.has("taiyi-write")).toBe(true);
    expect(missing, missing.join("\n")).toEqual([]);
    expect(Object.keys(m.phases)).toHaveLength(9);
  });

  it("auxiliary_skills 均在 skills/ 存在", () => {
    resetWorkflowManifestCache();
    const m = getWorkflowManifest();
    const missing = m.auxiliary_skills
      .map((a) => a.id)
      .filter((id) => !TAIYI_SKILLS.has(id));
    expect(missing, missing.join(", ")).toEqual([]);
  });

  it("各 phase.harness 中 tool=taiyi 的 skill 可解析", () => {
    resetWorkflowManifestCache();
    const m = getWorkflowManifest();
    const bad: string[] = [];

    for (const [phaseId, phase] of Object.entries(m.phases)) {
      for (const h of phase.harness) {
        if (h.tool === "taiyi" && h.skill.startsWith("taiyi-") && !TAIYI_SKILLS.has(h.skill)) {
          bad.push(`${phaseId}: harness taiyi/${h.skill}`);
        }
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("profile skip_phases 均为合法 PhaseId", () => {
    resetWorkflowManifestCache();
    const m = getWorkflowManifest();
    const valid = new Set(Object.keys(m.phases) as PhaseId[]);

    for (const [profile, cfg] of Object.entries(m.profiles)) {
      for (const p of cfg.skip_phases) {
        expect(valid.has(p), `${profile} skips unknown ${p}`).toBe(true);
      }
    }
  });

  it("orchestrator.skill 存在且 gates.human_phases 与 manifest 一致", () => {
    resetWorkflowManifestCache();
    const m = getWorkflowManifest();
    expect(TAIYI_SKILLS.has("taiyi-orchestrator")).toBe(true);

    for (const hp of m.gates.human_phases) {
      const phase = m.phases[hp];
      expect(phase?.human_gate, hp).toBe(true);
    }
  });
});
