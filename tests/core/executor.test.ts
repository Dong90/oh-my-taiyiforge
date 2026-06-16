import { describe, expect, it, vi } from "vitest";
import { generateStageData } from "../../src/core/executor.js";
import { RequirementSchema } from "../../src/schemas/requirement.js";
import type { LlmClient, ToolCall } from "../../src/core/executor-types.js";

function makeMockClient(
  responses: Array<{ json: string } | Error>
): LlmClient {
  let callCount = 0;
  return {
    createChatCompletion: vi.fn(async (_messages, _tools, _toolChoice) => {
      const resp = responses[callCount++];
      if (resp instanceof Error) throw resp;
      return {
        toolCalls: [
          {
            functionName: "commit_requirement",
            arguments: resp.json,
          },
        ],
      };
    }),
  };
}

describe("generateStageData", () => {
  const validJson = JSON.stringify({
    title: "用户登录",
    features: ["邮箱登录"],
    acceptance_criteria: [
      { id: "AC-01", description: "能登录", is_checked: false },
    ],
  });

  const invalidJson = JSON.stringify({
    title: "用户登录",
    features: ["邮箱登录"],
    acceptance_criteria: [],
  });

  it("LLM returns valid JSON → returns parsed data directly", async () => {
    const client = makeMockClient([{ json: validJson }]);
    const result = await generateStageData(
      "requirement",
      RequirementSchema,
      "context",
      client
    );
    expect(result.title).toBe("用户登录");
    expect(result.features).toEqual(["邮箱登录"]);
    expect(result.acceptance_criteria).toHaveLength(1);
  });

  it("LLM returns invalid JSON → retries with error message", async () => {
    const client = makeMockClient([
      { json: invalidJson },
      { json: validJson },
    ]);
    const result = await generateStageData(
      "requirement",
      RequirementSchema,
      "context",
      client
    );
    expect(result.title).toBe("用户登录");
    // Should have been called twice (first failed, second succeeded)
    expect(client.createChatCompletion).toHaveBeenCalledTimes(2);
    // Second call should include Zod error in messages
    const secondCallMessages = (
      client.createChatCompletion as ReturnType<typeof vi.fn>
    ).mock.calls[1][0] as Array<{ role: string; content: string }>;
    const userMessage = secondCallMessages.find(
      (m) => m.role === "user"
    )?.content;
    expect(userMessage).toContain("校验失败");
  });

  it("LLM throws network error → retries", async () => {
    const client = makeMockClient([
      new Error("Network timeout"),
      { json: validJson },
    ]);
    const result = await generateStageData(
      "requirement",
      RequirementSchema,
      "context",
      client
    );
    expect(result.title).toBe("用户登录");
    expect(client.createChatCompletion).toHaveBeenCalledTimes(2);
  });

  it("fails 3 consecutive times → throws fatal error", async () => {
    const client = makeMockClient([
      { json: invalidJson },
      { json: invalidJson },
      { json: invalidJson },
    ]);
    await expect(
      generateStageData(
        "requirement",
        RequirementSchema,
        "context",
        client
      )
    ).rejects.toThrow("重试次数耗尽");
  });

  it("messages history accumulates without losing system context", async () => {
    const client = makeMockClient([
      { json: invalidJson },
      { json: validJson },
    ]);
    await generateStageData(
      "requirement",
      RequirementSchema,
      "system context here",
      client
    );
    // First call should have system message
    const firstMessages = (
      client.createChatCompletion as ReturnType<typeof vi.fn>
    ).mock.calls[0][0] as Array<{ role: string; content: string }>;
    expect(firstMessages[0].role).toBe("system");
    expect(firstMessages[0].content).toBe("system context here");
  });
});
