import { describe, it, expect } from "vitest";
import { TemplateEngine, renderTemplate } from "../../src/core/template-engine.js";

describe("TemplateEngine", () => {
  it("renders simple {{title}} and {{slug}}", () => {
    const engine = new TemplateEngine();
    const result = engine.render("Hello {{title}} ({{slug}})", {
      slug: "my-change",
      title: "My Change",
    });
    expect(result).toBe("Hello My Change (my-change)");
  });

  it("generates title from slug when title is omitted", () => {
    const engine = new TemplateEngine();
    const result = engine.render("{{title}}", { slug: "my-change" });
    expect(result).toBe("my change");
  });

  it("supports {{#each}} blocks", () => {
    const engine = new TemplateEngine();
    const template = "Items:\n{{#each items}}- {{this}}\n{{/each}}";
    const compiled = engine["handlebars"].compile(template, { noEscape: true });
    const result = compiled({ items: ["a", "b", "c"], slug: "x", title: "X" });
    expect(result).toContain("- a");
    expect(result).toContain("- b");
  });

  it("supports {{#if}} blocks", () => {
    const engine = new TemplateEngine();
    const template = "{{#if show}}visible{{else}}hidden{{/if}}";
    // Undefined show → falsy → renders else branch
    expect(renderTemplate(template, { slug: "x" })).toBe("hidden");
    // show=true → truthy → renders if branch
    expect(engine.render(template, { slug: "x", show: true })).toBe("visible");
  });

  it("registers custom helpers", () => {
    const engine = new TemplateEngine({
      helpers: {
        upper: (s: string) => s.toUpperCase(),
      },
    });
    const result = engine.render("{{upper title}}", { slug: "x", title: "hello" });
    expect(result).toBe("HELLO");
  });

  it("registers partials", () => {
    const engine = new TemplateEngine({
      partials: { footer: "--- end ---" },
    });
    const result = engine.render("body\n{{> footer}}", { slug: "x", title: "X" });
    expect(result).toContain("--- end ---");
  });

  it("renderTemplate uses singleton engine", () => {
    const result = renderTemplate("Project: {{title}}", { slug: "test", title: "Test" });
    expect(result).toBe("Project: Test");
  });
});

describe("renderPhaseTemplate", () => {
  it("includes phase context when provided", () => {
    const engine = new TemplateEngine();
    const result = engine.renderPhaseTemplate(
      "Phase {{phase.id}} (order {{phase.order}})",
      { slug: "test", title: "Test" },
      { id: "dev", order: 6, skill: "taiyi-dev", artifact: "DEV.md", kind: "code", requires: ["task"] },
    );
    expect(result).toContain("Phase dev (order 6)");
  });
});
