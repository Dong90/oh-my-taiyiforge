import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAndSyncHumanEdits } from "../../src/core/reverse-sync.js";
import { persistAndRender, getHash } from "../../src/core/state-manager.js";
import { RequirementSchema } from "../../src/schemas/requirement.js";
import type { LlmClient } from "../../src/core/executor-types.js";

const templatesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates"
);

function makeMockClient(
  jsonResponse: Record<string, unknown>
): LlmClient {
  return {
    createChatCompletion: vi.fn(async () => ({
      toolCalls: [
        {
          functionName: "commit_requirement",
          arguments: JSON.stringify(jsonResponse),
        },
      ],
    })),
  };
}

describe("checkAndSyncHumanEdits", () => {
  let tmpDir: string;

  const baseData = {
    title: "用户登录",
    features: ["邮箱登录"],
    acceptance_criteria: [
      { id: "AC-01", description: "能登录", is_checked: false },
    ],
  };

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rev-sync-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("hash unchanged → skips sync, returns false", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);
    const client = makeMockClient(baseData);
    const didSync = await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    expect(didSync).toBe(false);
    expect(client.createChatCompletion).not.toHaveBeenCalled();
  });

  it("human adds a feature → JSON updated", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    // Simulate human edit: add a new feature
    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md += "\n* 手机号登录";
    fs.writeFileSync(mdPath, md);

    const expectedData = {
      ...baseData,
      features: ["邮箱登录", "手机号登录"],
    };
    const client = makeMockClient(expectedData);

    const didSync = await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    expect(didSync).toBe(true);
    expect(client.createChatCompletion).toHaveBeenCalledTimes(1);

    // JSON should be updated
    const newJson = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "requirement.json"), "utf-8")
    );
    expect(newJson.features).toEqual(["邮箱登录", "手机号登录"]);
  });

  it("human changes title → JSON updated", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md = md.replace("# REQUIREMENT: 用户登录", "# REQUIREMENT: 用户注册");
    fs.writeFileSync(mdPath, md);

    const expectedData = { ...baseData, title: "用户注册" };
    const client = makeMockClient(expectedData);

    await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    const newJson = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "requirement.json"), "utf-8")
    );
    expect(newJson.title).toBe("用户注册");
  });

  it("human checks an AC → JSON updated", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md = md.replace("- [ ]", "- [x]");
    fs.writeFileSync(mdPath, md);

    const expectedData = {
      ...baseData,
      acceptance_criteria: [
        { id: "AC-01", description: "能登录", is_checked: true },
      ],
    };
    const client = makeMockClient(expectedData);

    await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    const newJson = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "requirement.json"), "utf-8")
    );
    expect(newJson.acceptance_criteria[0].is_checked).toBe(true);
  });

  it("after sync, hash aligns with new content", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md += "\n* 微信登录";
    fs.writeFileSync(mdPath, md);

    const expectedData = {
      ...baseData,
      features: ["邮箱登录", "微信登录"],
    };
    const client = makeMockClient(expectedData);

    await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );

    // Hash should now match
    const didSyncAgain = await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    expect(didSyncAgain).toBe(false);
  });
});
