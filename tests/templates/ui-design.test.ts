import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tplPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates/ui-design.hbs"
);

function render(data: unknown) {
  const source = fs.readFileSync(tplPath, "utf-8");
  return Handlebars.compile(source)(data);
}

describe("ui-design.hbs", () => {
  const fullData = {
    title: "登录页面 UI",
    scope: "登录页/注册页/忘记密码",
    states: [
      { name: "Default", description: "表单可见，输入框空白" },
      { name: "Loading", description: "提交按钮 spinning" },
    ],
    accessibility: [
      "表单有语义化label",
      "键盘完整可操作",
    ],
    links: ["DESIGN.md", "Figma mockup"],
  };

  it("renders title as H1 with prefix", () => {
    const out = render(fullData);
    expect(out).toContain("# UI-DESIGN: 登录页面 UI");
  });

  it("renders scope in header", () => {
    const out = render(fullData);
    expect(out).toContain("登录页/注册页/忘记密码");
  });

  it("renders component inventory section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 1: Component Inventory");
    expect(out).toContain("| 页面/组件 | 操作 | 路径 | 变更 |");
  });

  it("renders component tree section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 2: Component Tree");
    expect(out).toContain("ComponentRoot");
  });

  it("renders state matrix with custom states", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 3: State Matrix");
    expect(out).toContain("**Default**");
    expect(out).toContain("**Loading**");
  });

  it("renders interaction edge cases with 9 boundaries", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 4: Interaction Edge Cases");
    expect(out).toContain("Double-click");
    expect(out).toContain("Navigate away");
    expect(out).toContain("Slow (>3s)");
    expect(out).toContain("Offline");
  });

  it("renders responsive breakpoints section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 5: Responsive Breakpoints");
    expect(out).toContain("768px");
    expect(out).toContain(">1024px");
  });

  it("renders motion spec section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 6: Motion Spec");
    expect(out).toContain("prefers-reduced-motion");
  });

  it("renders accessibility section with custom items", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 7: Accessibility");
    expect(out).toContain("表单有语义化label");
    expect(out).toContain("键盘完整可操作");
  });

  it("renders design token alignment section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 8: Design Token Alignment");
    expect(out).toContain("| Token | 值 | 来源 |");
  });

  it("renders references section with links", () => {
    const out = render(fullData);
    expect(out).toContain("## References");
    expect(out).toContain("DESIGN.md");
  });

  it("renders quality gate with all entries", () => {
    const out = render(fullData);
    expect(out).toContain("## Quality Gate");
    expect(out).toContain("S8 Design Token对齐");
  });

  it("renders no unrendered Handlebars tokens", () => {
    const out = render(fullData);
    expect(out).not.toMatch(/\{\{[#/]?[\w]+\}\}/);
  });

  it("renders with minimal data (no states, no a11y, no links)", () => {
    const out = render({ title: "最小UI", scope: "" });
    expect(out).toContain("# UI-DESIGN: 最小UI");
    expect(out).toContain("## Step 1: Component Inventory");
    // Should show default state matrix with 6-state table
    expect(out).toContain("N/A");
    expect(out).toContain("N/A");
    // Should show default accessibility checklist
    expect(out).toContain("表单有语义化label");
    expect(out).not.toMatch(/\{\{[#/]?[a-zA-Z]+\}\}/);
  });
});
