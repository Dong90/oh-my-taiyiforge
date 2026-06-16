import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { persistAndRender, getHash } from "../../src/core/state-manager.js";

const templatesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates"
);

describe("state-manager", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-state-mgr-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("getHash", () => {
    it("same content produces same hash", () => {
      const h1 = getHash("hello");
      const h2 = getHash("hello");
      expect(h1).toBe(h2);
    });

    it("different content produces different hash", () => {
      const h1 = getHash("hello");
      const h2 = getHash("world");
      expect(h1).not.toBe(h2);
    });

    it("hash is a 64-character hex string", () => {
      const h = getHash("hello");
      expect(h).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("persistAndRender", () => {
    const data = {
      title: "用户登录",
      features: ["邮箱登录", "手机号登录"],
      acceptance_criteria: [
        { id: "AC-01", description: "用户能输入邮箱和密码登录", is_checked: false },
      ],
    };

    it("writes JSON file", async () => {
      await persistAndRender("requirement", data, tmpDir, templatesDir);
      const jsonPath = path.join(tmpDir, "requirement.json");
      expect(fs.existsSync(jsonPath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      expect(parsed.title).toBe("用户登录");
    });

    it("renders and writes Markdown file", async () => {
      await persistAndRender("requirement", data, tmpDir, templatesDir);
      const mdPath = path.join(tmpDir, "REQUIREMENT.md");
      expect(fs.existsSync(mdPath)).toBe(true);
      const md = fs.readFileSync(mdPath, "utf-8");
      expect(md).toContain("# 用户登录");
    });

    it("writes hash snapshot", async () => {
      await persistAndRender("requirement", data, tmpDir, templatesDir);
      const hashPath = path.join(tmpDir, ".taiyi", "snapshots", "requirement.hash");
      expect(fs.existsSync(hashPath)).toBe(true);
      expect(fs.readFileSync(hashPath, "utf-8")).toMatch(/^[a-f0-9]{64}$/);
    });

    it("same data produces same hash on re-render", async () => {
      await persistAndRender("requirement", data, tmpDir, templatesDir);
      const hash1 = fs.readFileSync(
        path.join(tmpDir, ".taiyi", "snapshots", "requirement.hash"),
        "utf-8"
      );
      await persistAndRender("requirement", data, tmpDir, templatesDir);
      const hash2 = fs.readFileSync(
        path.join(tmpDir, ".taiyi", "snapshots", "requirement.hash"),
        "utf-8"
      );
      expect(hash1).toBe(hash2);
    });

    it("different data produces different hash", async () => {
      await persistAndRender("requirement", data, tmpDir, templatesDir);
      const h1 = fs.readFileSync(
        path.join(tmpDir, ".taiyi", "snapshots", "requirement.hash"),
        "utf-8"
      );
      const data2 = { ...data, title: "修改后的标题" };
      await persistAndRender("requirement", data2, tmpDir, templatesDir);
      const h2 = fs.readFileSync(
        path.join(tmpDir, ".taiyi", "snapshots", "requirement.hash"),
        "utf-8"
      );
      expect(h1).not.toBe(h2);
    });
  });
});
