import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_ROLES,
  PHASE_AGENT_ROLES,
  formatAgentRoleProtocol,
  getAgentRole,
  listAgentRoleIds,
  rolesForPhase,
} from "../src/core/agent-roles.js";
import { MANUAL_ONLY_AGENT_ROLES, renderAgentRolesYaml } from "../src/core/agent-roles-yaml.js";
import type { PhaseId } from "../src/core/types.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const TAIYI_SKILLS = new Set(
  fs
    .readdirSync(path.join(ROOT, "skills"))
    .filter((d) => d.startsWith("taiyi-")),
);
const PROMPTS = new Set(
  fs
    .readdirSync(path.join(ROOT, "prompts"))
    .filter((f) => f.startsWith("taiyi-") && f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, "")),
);

const SLASH_TO_PROMPT: Record<string, string> = {
  "/taiyi:security": "taiyi-security",
  "/taiyi:gstack qa": "taiyi-gstack-qa",
  "/taiyi:e2e": "taiyi-e2e",
  "/taiyi:commit": "taiyi-commit",
  "/taiyi:ship": "taiyi-ship",
  "/taiyi:land": "taiyi-land",
  "/taiyi:review-loop": "taiyi-review-loop",
  "/taiyi:visual-verdict": "taiyi-visual-verdict",
};

const MANUAL_ONLY = new Set<string>(MANUAL_ONLY_AGENT_ROLES);

describe("agent-roles", () => {
  it("defines exactly 29 native specialist roles", () => {
    expect(listAgentRoleIds().length).toBe(29);
    expect(Object.keys(AGENT_ROLES).length).toBe(29);
  });

  it("maps every phase to at least one role", () => {
    for (const [phase, ids] of Object.entries(PHASE_AGENT_ROLES)) {
      expect(ids.length, phase).toBeGreaterThan(0);
      for (const id of ids) {
        expect(getAgentRole(id), `${phase}:${id}`).toBeDefined();
      }
    }
  });

  it("every role has id, label, phases, load, when and unique id key", () => {
    for (const [key, role] of Object.entries(AGENT_ROLES)) {
      expect(key).toBe(role.id);
      expect(role.label.length).toBeGreaterThan(0);
      expect(role.phases.length).toBeGreaterThan(0);
      expect(role.load.length).toBeGreaterThan(0);
      expect(role.when.length).toBeGreaterThan(0);
    }
  });

  it("phase defaults reference only known roles; manual-only roles excluded", () => {
    const inDefaults = new Set(Object.values(PHASE_AGENT_ROLES).flat());
    for (const id of listAgentRoleIds()) {
      if (MANUAL_ONLY.has(id)) {
        expect(inDefaults.has(id), `${id} should be manual-only`).toBe(false);
      }
    }
    expect(inDefaults.size + MANUAL_ONLY.size).toBe(29);
  });

  it("load[] taiyi skills and slash prompts resolve in repo", () => {
    for (const role of Object.values(AGENT_ROLES)) {
      for (const item of role.load) {
        if (item.startsWith("/taiyi:")) {
          const prompt = SLASH_TO_PROMPT[item];
          expect(prompt, `${role.id} slash ${item}`).toBeDefined();
          expect(PROMPTS.has(prompt!), `${role.id} missing ${prompt}.md`).toBe(true);
        } else if (item.startsWith("taiyi-")) {
          expect(TAIYI_SKILLS.has(item), `${role.id} missing skill ${item}`).toBe(true);
        }
      }
    }
  });

  it("formatAgentRoleProtocol includes load hints for dev executor", () => {
    const text = formatAgentRoleProtocol("executor", "demo-slug", "dev");
    expect(text).toContain("executor");
    expect(text).toContain("taiyi-dev");
    expect(text).toContain("demo-slug");
    expect(text).not.toContain("⚠");
  });

  it("warns when role invoked outside recommended phases", () => {
    const text = formatAgentRoleProtocol("architect", "demo-slug", "dev");
    expect(text).toContain("architect");
    expect(text).toContain("⚠");
  });

  it("strict phase env blocks protocol text", () => {
    const prev = process.env.TAIYI_AGENT_STRICT_PHASE;
    process.env.TAIYI_AGENT_STRICT_PHASE = "1";
    try {
      const text = formatAgentRoleProtocol("architect", "demo-slug", "dev");
      expect(text).toContain("阶段门禁");
      expect(text).not.toContain("加载:");
    } finally {
      if (prev === undefined) delete process.env.TAIYI_AGENT_STRICT_PHASE;
      else process.env.TAIYI_AGENT_STRICT_PHASE = prev;
    }
  });

  it("docs/taiyi/agent-roles.yaml matches renderAgentRolesYaml()", () => {
    const yamlPath = path.join(ROOT, "docs/taiyi/agent-roles.yaml");
    const onDisk = fs.readFileSync(yamlPath, "utf8");
    expect(onDisk).toBe(renderAgentRolesYaml());
  });

  it("rolesForPhase returns architect in design", () => {
    const ids = rolesForPhase("design").map((r) => r.id);
    expect(ids).toContain("architect");
    expect(ids).toContain("critic");
  });

  it("getAgentRole is case-insensitive", () => {
    expect(getAgentRole("EXECUTOR")?.id).toBe("executor");
  });

  it("every phase id in role.phases is valid", () => {
    const phases: PhaseId[] = [
      "change",
      "requirement",
      "design",
      "ui-design",
      "task",
      "dev",
      "test",
      "review",
      "integration",
    ];
    for (const role of Object.values(AGENT_ROLES)) {
      for (const p of role.phases) {
        expect(phases).toContain(p);
      }
    }
  });

  it("docs/taiyi/agent-roles.yaml phase_defaults matches TS", () => {
    const yamlPath = path.join(ROOT, "docs/taiyi/agent-roles.yaml");
    const yaml = fs.readFileSync(yamlPath, "utf8");
    const block = yaml.match(/phase_defaults:\n([\s\S]*?)(?:\n#|\nmanual_only:|\nparallel:)/)?.[1];
    expect(block).toBeTruthy();
    for (const [phase, ids] of Object.entries(PHASE_AGENT_ROLES)) {
      const line = block!.match(new RegExp(`^  ${phase.replace("-", "\\-")}: \\[(.+?)\\]`, "m"));
      expect(line, `yaml missing phase_defaults.${phase}`).toBeTruthy();
      const yamlIds = line![1].split(",").map((s) => s.trim());
      expect(yamlIds).toEqual(ids);
    }
  });
});
