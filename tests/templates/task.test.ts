import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tplPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates/task.hbs"
);

function render(data: unknown) {
  const source = fs.readFileSync(tplPath, "utf-8");
  return Handlebars.compile(source)(data);
}

describe("task.hbs", () => {
  const data = {
    title: "用户登录优化",
    slices: [
      {
        id: "T01",
        label: "数据库迁移",
        description: "新增邮箱验证码表",
        read_files: ["src/db/schema.ts"],
        write_files: ["src/db/migrations/001_email_code.ts"],
        test_command: "npm test -- db/migration",
        dependencies: "",
        parallelizable: true,
      },
    ],
    slice_risks: [
      { slice: "T01", risk: "迁移脚本失败", probability: "低", mitigation: "备份 + 回滚脚本" },
    ],
  };

  it("renders title", () => {
    const out = render(data);
    expect(out).toContain("# TASK: 用户登录优化");
  });

  it("renders read_files boundary", () => {
    const out = render(data);
    expect(out).toContain("src/db/schema.ts");
  });

  it("renders write_files boundary", () => {
    const out = render(data);
    expect(out).toContain("src/db/migrations/001_email_code.ts");
  });

  it("renders read_files label", () => {
    const out = render(data);
    expect(out).toContain("read_files");
  });

  it("renders write_files label", () => {
    const out = render(data);
    expect(out).toContain("write_files");
  });

  it("renders dependency graph section", () => {
    const out = render(data);
    expect(out).toContain("## Step 1: Dependency Graph");
    expect(out).toContain("flowchart LR");
  });

  it("renders execution plan section", () => {
    const out = render(data);
    expect(out).toContain("## Step 3: Execution Plan");
    expect(out).toContain("### Wave 1");
  });

  it("renders risk per slice section", () => {
    const out = render(data);
    expect(out).toContain("## Step 4: Risk per Slice");
    expect(out).toContain("| Slice | 风险 | 概率 | 缓解 |");
  });

  it("renders rollback per slice section", () => {
    const out = render(data);
    expect(out).toContain("## Step 5: Rollback per Slice");
    expect(out).toContain("| Slice | 回滚方式 | 时间 | 数据影响 |");
  });

  it("renders quality gate with PITFALLS and project-context checks", () => {
    const out = render(data);
    expect(out).toContain("PITFALLS.md");
    expect(out).toContain("PHASE-CONTEXT.md");
    expect(out).toContain("Refactor-first");
  });

  it("renders with empty slices (shows placeholder)", () => {
    const out = render({ title: "空任务", slices: [] });
    expect(out).toContain("# TASK: 空任务");
    expect(out).not.toMatch(/\{\{[#/]?[a-zA-Z]+\}\}/);
  });

  it("renders read_files placeholder when no files listed", () => {
    const out = render({
      title: "无文件",
      slices: [{ id: "S1", label: "纯配置", description: "" }],
    });
    expect(out).toContain("（无 — 请填写 write_files 字段）");
  });

  it("renders no unrendered Handlebars tokens", () => {
    const out = render(data);
    expect(out).not.toMatch(/\{\{[#/]?[\w]+\}\}/);
  });
});
