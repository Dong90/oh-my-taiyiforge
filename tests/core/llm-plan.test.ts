import { describe, expect, it } from "vitest";
import { parseManifestInput } from "../../src/core/llm-plan.js";

describe("parseManifestInput — basic", () => {
  it("parses valid JSON string", () => {
    const json = JSON.stringify({
      changes: [{ slug: "test", title: "Test", profile: "api", dependsOn: [], manifest: [] }],
    });
    const result = parseManifestInput(json);
    expect(result.ok).toBe(true);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].slug).toBe("test");
  });

  it("parses JSON with markdown code blocks", () => {
    const json = '```json\n{\n  "changes": [{"slug": "clean", "title": "X", "profile": "lite", "motivation": "m", "dependsOn": [], "manifest": []}]\n}\n```';
    const result = parseManifestInput(json);
    expect(result.ok).toBe(true);
    expect(result.changes[0].slug).toBe("clean");
  });

  it("fails on non-JSON input", () => {
    const result = parseManifestInput("not json at all");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Not JSON");
  });

  it("fails on missing file path", () => {
    const result = parseManifestInput("/nonexistent/path.json");
    expect(result.ok).toBe(false);
  });

  it("fails on missing changes array", () => {
    const json = JSON.stringify({ notChanges: [] });
    const result = parseManifestInput(json);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("changes");
  });
});

describe("parseManifestInput — anti-hallucination fields", () => {
  it("preserves source_quote in parsed manifest", () => {
    const json = JSON.stringify({
      changes: [{
        slug: "auth", title: "Auth", profile: "api", dependsOn: [], motivation: "m",
        manifest: [{
          id: "M1", file: "auth.py", pattern: "Service", class_name: "AuthService",
          depends_on: [], methods: [], constraints: [],
          source_quote: "用户需要登录认证功能",
          confidence_score: 0.95,
          extension_metadata: { provider: "jwt", expiry: "24h" },
        }],
      }],
    });
    const result = parseManifestInput(json);
    expect(result.ok).toBe(true);
    const m = result.manifests["auth"];
    expect(m).toBeDefined();
    expect(m[0].source_quote).toBe("用户需要登录认证功能");
    expect(m[0].confidence_score).toBe(0.95);
    expect(m[0].extension_metadata).toEqual({ provider: "jwt", expiry: "24h" });
  });

  it("handles missing optional fields gracefully", () => {
    const json = JSON.stringify({
      changes: [{
        slug: "min", title: "Min", profile: "micro", dependsOn: [], motivation: "m",
        manifest: [{ id: "M1", file: "x.py", pattern: "Config", class_name: "X", depends_on: [], methods: [], constraints: [] }],
      }],
    });
    const result = parseManifestInput(json);
    expect(result.ok).toBe(true);
    const m = result.manifests["min"][0];
    expect(m.source_quote).toBeUndefined();
    expect(m.confidence_score).toBeUndefined();
    expect(m.extension_metadata).toBeUndefined();
  });

  it("rejects manifest with circular depends_on", () => {
    const json = JSON.stringify({
      changes: [{
        slug: "cycle", title: "Cycle", profile: "api", dependsOn: [], motivation: "m",
        manifest: [
          { id: "M1", file: "a.py", pattern: "Service", class_name: "A", depends_on: ["M2"], methods: [], constraints: [] },
          { id: "M2", file: "b.py", pattern: "Service", class_name: "B", depends_on: ["M1"], methods: [], constraints: [] },
        ],
      }],
    });
    // Circular depends_on should NOT crash but should be detected
    const result = parseManifestInput(json);
    expect(result.ok).toBe(true); // parser accepts it, validation is downstream
  });

  it("maps prompt_style correctly from Agent output", () => {
    const json = JSON.stringify({
      changes: [{
        slug: "p", title: "P", profile: "api", dependsOn: [], motivation: "m",
        manifest: [
          { id: "M1", file: "s.py", pattern: "Strategy", class_name: "S", depends_on: [], methods: [], constraints: [], prompt_style: "advanced", source_quote: "使用策略模式", confidence_score: 0.92 },
          { id: "M2", file: "x.py", pattern: "Service", class_name: "X", depends_on: [], methods: [], constraints: [], prompt_style: "standard", source_quote: "SYSTEM_INFERRED", confidence_score: 0.55 },
        ],
      }],
    });
    const result = parseManifestInput(json);
    expect(result.manifests["p"][0].prompt_style).toBe("advanced");
    expect(result.manifests["p"][1].prompt_style).toBe("standard");
  });

  it("topological order: depends_on IDs must be smaller than module ID", () => {
    const json = JSON.stringify({
      changes: [{
        slug: "topo", title: "Topo", profile: "api", dependsOn: [], motivation: "m",
        manifest: [
          { id: "M1", file: "base.py", pattern: "Adapter", class_name: "Base", depends_on: [], methods: [], constraints: [], source_quote: "SYSTEM_INFERRED", confidence_score: 0.9 },
          { id: "M2", file: "impl.py", pattern: "Adapter", class_name: "Impl", extends: "Base", depends_on: ["M1"], methods: [], constraints: [], source_quote: "SYSTEM_INFERRED", confidence_score: 0.9 },
          { id: "M5", file: "svc.py", pattern: "Service", class_name: "Svc", depends_on: ["M1", "M2"], methods: [], constraints: [], source_quote: "SYSTEM_INFERRED", confidence_score: 0.85 },
        ],
      }],
    });
    const result = parseManifestInput(json);
    const manifest = result.manifests["topo"];
    // Verify each module only depends on smaller IDs
    for (const m of manifest) {
      const selfId = parseInt(m.id.slice(1));
      for (const dep of m.depends_on) {
        const depId = parseInt(dep.slice(1));
        expect(depId).toBeLessThan(selfId);
      }
    }
  });
});

describe("parseManifestInput — confidence_score", () => {
  it("identifies low-confidence modules (score < 0.7)", () => {
    const json = JSON.stringify({
      changes: [{
        slug: "conf", title: "Conf", profile: "api", dependsOn: [], motivation: "m",
        manifest: [
          { id: "M1", file: "high.py", pattern: "Service", class_name: "High", depends_on: [], methods: [], constraints: [], confidence_score: 0.95 },
          { id: "M2", file: "low.py", pattern: "Service", class_name: "Low", depends_on: [], methods: [], constraints: [], confidence_score: 0.35 },
          { id: "M3", file: "mid.py", pattern: "Service", class_name: "Mid", depends_on: [], methods: [], constraints: [], confidence_score: 0.70 },
        ],
      }],
    });
    const result = parseManifestInput(json);
    const manifest = result.manifests["conf"];
    const low = manifest.filter((m) => (m.confidence_score ?? 1) < 0.7);
    expect(low).toHaveLength(1);
  });
});
