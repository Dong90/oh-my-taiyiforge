import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tplPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates/design.hbs"
);

function render(data: unknown) {
  const source = fs.readFileSync(tplPath, "utf-8");
  return Handlebars.compile(source)(data);
}

describe("design.hbs", () => {
  const data = {
    title: "登录方案设计",
    options: [
      { id: "A", name: "JWT Token", pros: ["无状态"], cons: ["无法失效"] },
      { id: "B", name: "Session", pros: ["可控"], cons: ["需要 Redis"] },
    ],
    decision: { chosen: "B", reason: "安全审计需要主动失效能力" },
  };

  it("renders title as H1", () => {
    expect(render(data)).toContain("# 登录方案设计");
  });

  it("renders options table", () => {
    const out = render(data);
    expect(out).toContain("| A | JWT Token |");
    expect(out).toContain("| B | Session |");
  });

  it("renders decision section", () => {
    const out = render(data);
    expect(out).toContain("- **Chosen**: B");
    expect(out).toContain("- **Reason**: 安全审计需要主动失效能力");
  });
});
