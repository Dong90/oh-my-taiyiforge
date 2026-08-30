import { describe, expect, it } from "vitest";
import {
  AgentRoleDef,
  getAgentRole,
  listAgentRoleIds,
  rolesForPhase,
  rolesForLanguage,
  agentHasLanguage,
} from "../src/core/agent-roles.js";

describe("AgentRoles: multi-language skill support", () => {
  describe("rolesForPhase(phase, language?)", () => {
    it("returns all roles for a phase when no language is provided", () => {
      const roles = rolesForPhase("dev");
      const ids = roles.map((r) => r.id);
      expect(ids).toContain("executor");
      expect(ids).toContain("debugger");
    });

    it("filters roles — same result for any concrete project language (current roles are all universal)", () => {
      const ts = rolesForPhase("dev", "typescript").map((r) => r.id);
      const py = rolesForPhase("dev", "python").map((r) => r.id);
      const go = rolesForPhase("dev", "go").map((r) => r.id);
      expect(ts).toEqual(py);
      expect(ts).toEqual(go);
    });

    it("listAgentRoleIds returns the full inventory unchanged by language filter", () => {
      const total = listAgentRoleIds().length;
      expect(total).toBeGreaterThan(20);
    });
  });

  describe("Language-specific role helpers (RED)", () => {
    it("rolesForLanguage returns roles for a phase filtered by language", () => {
      const roles = rolesForLanguage("dev", "typescript");
      const ids = roles.map((r) => r.id);
      expect(ids).toContain("executor");
      expect(ids).toContain("debugger");
    });

    it("agentHasLanguage: universal role returns true for any language including undefined", () => {
      // `executor` has no `languageSkills` → universal. Documenting the
      // behavior: when project language is unknown (undefined), a universal
      // role still matches — it doesn't constrain.
      const universal = getAgentRole("executor");
      expect(universal).toBeDefined();
      if (universal) {
        expect(agentHasLanguage(universal, "typescript")).toBe(true);
        expect(agentHasLanguage(universal, "rust")).toBe(true);
        expect(agentHasLanguage(universal, undefined as unknown as string)).toBe(true);
      }
    });

    it("agentHasLanguage: undefined language against scoped role returns false", () => {
      // Mirror image of the above: a non-empty `languageSkills` requires
      // a concrete project language to match. Unknown ≠ "open the gate."
      const role: AgentRoleDef = {
        id: "rust-only",
        label: "Rust-only role",
        phases: ["dev"],
        load: ["taiyi-dev"],
        when: "rust only",
        languageSkills: ["rust"],
      };
      expect(agentHasLanguage(role, "rust")).toBe(true);
      expect(agentHasLanguage(role, "typescript")).toBe(false);
      expect(agentHasLanguage(role, "python")).toBe(false);
      expect(agentHasLanguage(role, undefined as unknown as string)).toBe(false);
    });

    it("rolesForLanguage includes universal roles for any language", () => {
      // All current AGENT_ROLES are universal (no languageSkills), so all
      // appear for any language filter.
      const tsRoles = rolesForLanguage("dev", "typescript").map((r) => r.id);
      const rustRoles = rolesForLanguage("dev", "rust").map((r) => r.id);
      expect(tsRoles.sort()).toEqual(rustRoles.sort());
    });
  });

  describe("format helpers do not break with language arg", () => {
    it("formatAgentRoleProtocol can be invoked with the existing API", async () => {
      const { formatAgentRoleProtocol } = await import(
        "../src/core/agent-roles.js"
      );
      const out = formatAgentRoleProtocol("executor", "test-slug", "dev");
      expect(out).toContain("executor");
      expect(out).toContain("TDD");
    });
  });
});
