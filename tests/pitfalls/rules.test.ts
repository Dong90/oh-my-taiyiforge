import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RULES_DIR = path.join(REPO, ".pitfalls/rules");

function loadRule(relPath: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(RULES_DIR, relPath), "utf8");
  return YAML.parse(raw) as Record<string, unknown>;
}

describe("PITFALLS — ast-grep rules", () => {
  it("rules directory structure is correct", () => {
    expect(fs.existsSync(path.join(RULES_DIR, "performance"))).toBe(true);
    expect(fs.existsSync(path.join(RULES_DIR, "safety"))).toBe(true);
  });

  it("has exactly 8 rule files", () => {
    const count = (rulePath: string) => {
      return fs.readdirSync(path.join(RULES_DIR, rulePath), { recursive: true })
        .filter((f: string) => f.endsWith(".yml")).length;
    };
    expect(count("performance")).toBe(3);
    expect(count("safety")).toBe(5);
  });

  describe("performance rules", () => {
    it("n-plus-one.yml has required fields", () => {
      const rule = loadRule("performance/n-plus-one.yml");
      expect(rule.id).toBe("n-plus-one-query");
      expect(rule.language).toBe("typescript");
      expect(rule.severity).toBe("warning");
      expect(rule.message).toContain("N+1");
      expect(rule.rule).toBeDefined();
    });

    it("sync-io-block.yml has required fields", () => {
      const rule = loadRule("performance/sync-io-block.yml");
      expect(rule.id).toBe("sync-io-in-async");
      expect(rule.language).toBe("typescript");
      expect(rule.rule).toBeDefined();
    });

    it("large-module.yml has required fields", () => {
      const rule = loadRule("performance/large-module.yml");
      expect(rule.id).toBe("large-module");
      expect(rule.language).toBe("typescript");
      expect(rule.severity).toBe("info");
    });
  });

  describe("safety rules", () => {
    it("empty-catch.yml is error severity", () => {
      const rule = loadRule("safety/empty-catch.yml");
      expect(rule.id).toBe("empty-catch");
      expect(rule.severity).toBe("error");
      expect(rule.message).toContain("空的 catch 块");
    });

    it("missing-await.yml detects async without await", () => {
      const rule = loadRule("safety/missing-await.yml");
      expect(rule.id).toBe("missing-await");
      expect(rule.severity).toBe("error");
    });

    it("hardcoded-secret.yml detects API keys and tokens", () => {
      const rule = loadRule("safety/hardcoded-secret.yml");
      expect(rule.id).toBe("hardcoded-secret");
      expect(rule.severity).toBe("error");
      expect(rule.rule.any).toBeDefined();
    });

    it("as-any.yml detects type assertions", () => {
      const rule = loadRule("safety/as-any.yml");
      expect(rule.id).toBe("as-any");
      expect(rule.rule.pattern).toContain("as any");
    });

    it("unsafe-eval.yml detects eval() and new Function()", () => {
      const rule = loadRule("safety/unsafe-eval.yml");
      expect(rule.id).toBe("unsafe-eval");
      expect(rule.severity).toBe("error");
      expect(rule.rule.any).toBeDefined();
    });
  });

  describe("rule quality checks", () => {
    const allYmls: string[] = [];
    for (const dir of ["performance", "safety"]) {
      for (const f of fs.readdirSync(path.join(RULES_DIR, dir))) {
        if (f.endsWith(".yml")) allYmls.push(path.join(dir, f));
      }
    }

    for (const yml of allYmls) {
      const rule = loadRule(yml);

      it(`${yml} has id`, () => expect(rule.id).toBeTruthy());
      it(`${yml} has language`, () => expect(rule.language).toBe("typescript"));
      it(`${yml} has severity`, () => {
        expect(["error", "warning", "info"]).toContain(rule.severity);
      });
      it(`${yml} has message`, () => {
        expect(typeof rule.message).toBe("string");
        expect(rule.message.length).toBeGreaterThan(10);
      });
      it(`${yml} has rule definition`, () => {
        expect(rule.rule).toBeDefined();
      });
    }
  });
});
