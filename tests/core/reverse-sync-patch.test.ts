import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAndSyncHumanEdits } from "../../src/core/reverse-sync.js";
import { persistAndRender } from "../../src/core/state-manager.js";
import { RequirementSchema } from "../../src/schemas/requirement.js";
import type { LlmClient } from "../../src/core/executor-types.js";

const templatesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates"
);

function makeClient(patches: Array<{ op: string; path: string; value?: unknown }>) {
  return {
    createChatCompletion: vi.fn(async () => ({
      toolCalls: [
        {
          functionName: "commit_requirement_patch",
          arguments: JSON.stringify(patches),
        },
      ],
    })),
  };
}

describe("reverse-sync with JSON Patch", () => {
  let tmpDir: string;

  const baseData = {
    title: "用户登录",
    features: ["邮箱登录", "手机号登录"],
    acceptance_criteria: [
      { id: "AC-01", description: "用户能登录", is_checked: false },
      { id: "AC-02", description: "错误提示", is_checked: false },
    ],
  };

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rsp-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("LLM returns patch array → patches applied to existing JSON", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    // Human adds a feature → LLM returns a patch instead of full JSON
    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md += "\n* 微信登录";
    fs.writeFileSync(mdPath, md);

    const client = makeClient([
      { op: "replace", path: "/title", value: "用户登录功能" },
      { op: "add", path: "/features/-", value: "微信登录" },
    ]);

    const didSync = await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    expect(didSync).toBe(true);

    const newJson = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "requirement.json"), "utf-8")
    );
    expect(newJson.title).toBe("用户登录功能");
    expect(newJson.features).toEqual(["邮箱登录", "手机号登录", "微信登录"]);
    // Unchanged data preserved
    expect(newJson.acceptance_criteria).toHaveLength(2);
  });

  it("LLM returns invalid patch → throws and does not corrupt JSON", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md += "\n* 微信登录";
    fs.writeFileSync(mdPath, md);

    const client = makeClient([
      { op: "replace", path: "/nonexistent/path", value: "bad" },
    ]);

    await expect(
      checkAndSyncHumanEdits(
        "requirement",
        RequirementSchema,
        tmpDir,
        templatesDir,
        client
      )
    ).rejects.toThrow();

    // Original JSON must be intact
    const json = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "requirement.json"), "utf-8")
    );
    expect(json.features).toEqual(["邮箱登录", "手机号登录"]);
  });

  it("LLM returns full JSON (non-patch) → still works as before", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md = md.replace("# 用户登录", "# 用户注册");
    fs.writeFileSync(mdPath, md);

    // LLM returns full JSON (old format compatibility)
    const client: LlmClient = {
      createChatCompletion: vi.fn(async () => ({
        toolCalls: [
          {
            functionName: "commit_requirement",
            arguments: JSON.stringify({ ...baseData, title: "用户注册" }),
          },
        ],
      })),
    };

    const didSync = await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    expect(didSync).toBe(true);

    const newJson = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "requirement.json"), "utf-8")
    );
    expect(newJson.title).toBe("用户注册");
  });
});
