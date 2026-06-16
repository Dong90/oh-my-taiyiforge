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

// --- Diff Router tests ---

describe("Diff Router: bypass LLM for trivial edits", () => {
  let tmpDir: string;

  const baseData = {
    title: "用户登录",
    features: ["邮箱登录", "手机号登录"],
    acceptance_criteria: [
      { id: "AC-01", description: "用户能输入邮箱和密码登录", is_checked: false },
      { id: "AC-02", description: "错误密码显示红色提示", is_checked: false },
    ],
  };

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-diff-rtr-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("checkbox toggle: [ ] → [x] → zero LLM calls, JSON updated", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    // Simulate: check AC-01
    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md = md.replace("- [ ] **AC-01**:", "- [x] **AC-01**:");
    fs.writeFileSync(mdPath, md);

    const client = makeMockClient(baseData); // shouldn't be called
    const didSync = await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );

    expect(didSync).toBe(true);
    // No LLM call should have been made
    expect(client.createChatCompletion).not.toHaveBeenCalled();

    // JSON should be updated
    const newJson = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "requirement.json"), "utf-8")
    );
    expect(newJson.acceptance_criteria[0].is_checked).toBe(true);
    expect(newJson.acceptance_criteria[1].is_checked).toBe(false);
  });

  it("checkbox un-toggle: [x] → [ ] → zero LLM calls", async () => {
    const data = {
      ...baseData,
      acceptance_criteria: [
        { id: "AC-01", description: "能登录", is_checked: true },
      ],
    };
    await persistAndRender("requirement", data, tmpDir, templatesDir);

    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md = md.replace("- [x] **AC-01**:", "- [ ] **AC-01**:");
    fs.writeFileSync(mdPath, md);

    const client = makeMockClient(baseData);
    await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    expect(client.createChatCompletion).not.toHaveBeenCalled();

    const newJson = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "requirement.json"), "utf-8")
    );
    expect(newJson.acceptance_criteria[0].is_checked).toBe(false);
  });

  it("multi-checkbox toggle: multiple ACs changed → all updated locally", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md = md.replace("- [ ] **AC-01**:", "- [x] **AC-01**:");
    md = md.replace("- [ ] **AC-02**:", "- [x] **AC-02**:");
    fs.writeFileSync(mdPath, md);

    const client = makeMockClient(baseData);
    await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    expect(client.createChatCompletion).not.toHaveBeenCalled();

    const newJson = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "requirement.json"), "utf-8")
    );
    expect(newJson.acceptance_criteria[0].is_checked).toBe(true);
    expect(newJson.acceptance_criteria[1].is_checked).toBe(true);
  });

  it("non-trivial change (new feature added) → still uses LLM", async () => {
    await persistAndRender("requirement", baseData, tmpDir, templatesDir);

    const mdPath = path.join(tmpDir, "REQUIREMENT.md");
    let md = fs.readFileSync(mdPath, "utf-8");
    md += "\n* 微信登录"; // This is a semantic change → needs LLM
    fs.writeFileSync(mdPath, md);

    const expectedData = {
      ...baseData,
      features: [...baseData.features, "微信登录"],
    };
    const client = makeMockClient(expectedData);

    await checkAndSyncHumanEdits(
      "requirement",
      RequirementSchema,
      tmpDir,
      templatesDir,
      client
    );
    // Should have fallen back to LLM
    expect(client.createChatCompletion).toHaveBeenCalledTimes(1);
  });
});
