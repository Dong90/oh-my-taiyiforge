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
    techStack: {
      selected: "Next.js 14 全栈",
      reason: "团队已有 Next.js 经验",
      frontend: "Next.js 14.2 / React 18 / TypeScript 5",
      backend: "Next.js API Routes",
      database: "PostgreSQL 16 via Supabase",
      deployment: "Vercel + Supabase",
      keyDeps: "Tailwind v4 / Drizzle ORM / next-auth",
      excluded: "Python FastAPI（团队无 Python 经验）",
    },
    options: [
      { id: "A", name: "JWT Token", pros: ["无状态"], cons: ["无法失效"] },
      { id: "B", name: "Session", pros: ["可控"], cons: ["需要 Redis"] },
    ],
    decision: { chosen: "B", reason: "安全审计需要主动失效能力" },
    existingArchitecture: {
      touchedModules: ["src/services/user.ts", "src/api/auth/*"],
      newModules: ["src/features/notifications/*"],
      doNotTouch: ["src/services/payment.ts"],
    },
  };

  it("renders title as H1", () => {
    expect(render(data)).toContain("# DESIGN: 登录方案设计");
  });

  it("renders options table", () => {
    const out = render(data);
    expect(out).toContain("| A | JWT Token |");
    expect(out).toContain("| B | Session |");
  });

  it("renders decision section", () => {
    const out = render(data);
    expect(out).toContain("- **Chosen:** B");
    expect(out).toContain("- **Reason:** 安全审计需要主动失效能力");
  });

  it("renders expanded tech stack card", () => {
    const out = render(data);
    expect(out).toContain("Next.js 14.2 / React 18 / TypeScript 5");
    expect(out).toContain("PostgreSQL 16 via Supabase");
    expect(out).toContain("Vercel + Supabase");
    expect(out).toContain("Python FastAPI");
  });

  it("renders existing architecture alignment section", () => {
    const out = render(data);
    expect(out).toContain("src/services/user.ts");
    expect(out).toContain("src/features/notifications/*");
  });

  it("renders no-touch list", () => {
    const out = render(data);
    expect(out).toContain("src/services/payment.ts");
  });

  it("renders options analysis table with pros/cons", () => {
    const out = render(data);
    expect(out).toContain("| A | JWT Token");
    expect(out).toContain("无状态");
    expect(out).toContain("无法失效");
  });

  it("renders detailed design section", () => {
    const out = render(data);
    expect(out).toContain("## Step 5: Detailed Design");
    expect(out).toContain("### 数据模型");
    expect(out).toContain("### API 设计");
  });

  it("renders blast radius section", () => {
    const out = render(data);
    expect(out).toContain("## Step 6: Blast Radius");
    expect(out).toContain("| 决策 | 半径 | 最坏情况 | 隔离 |");
  });

  it("renders innovation token accounting section", () => {
    const out = render(data);
    expect(out).toContain("## Step 7: Innovation Token Accounting");
    expect(out).toContain("_累计:");
  });

  it("renders trade-off analysis section", () => {
    const out = render(data);
    expect(out).toContain("## Step 8: Trade-off Analysis");
    expect(out).toContain("| 权衡点 | 选择 | 接受理由 |");
  });

  it("renders distribution & deployment section", () => {
    const out = render(data);
    expect(out).toContain("## Step 9: Distribution & Deployment");
    expect(out).toContain("**新artifact**");
    expect(out).toContain("**CI/CD变更**");
  });

  it("renders security model section", () => {
    const out = render(data);
    expect(out).toContain("## Step 10: Security Model");
    expect(out).toContain("| 威胁 | 攻击向量 | 缓解 |");
  });

  it("renders rollout strategy section", () => {
    const out = render(data);
    expect(out).toContain("## Step 11: Rollout Strategy");
  });

  it("renders quality gate with 2-week and refactor checks", () => {
    const out = render(data);
    expect(out).toContain("2-week smell");
    expect(out).toContain("Refactor-first");
  });

  it("renders with minimal data (no techStack, no existingArchitecture)", () => {
    const out = render({ title: "最小设计", options: [], decision: { chosen: "", reason: "" } });
    expect(out).toContain("# DESIGN: 最小设计");
    expect(out).toContain("[待定]");
    expect(out).not.toMatch(/\{\{[#/]?[a-zA-Z]+\}\}/);
  });

  it("renders no unrendered Handlebars tokens", () => {
    const out = render(data);
    expect(out).not.toMatch(/\{\{[#/]?[\w]+\}\}/);
  });
});
