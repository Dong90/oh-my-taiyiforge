import { describe, expect, it } from "vitest";
import { generateStageData } from "../src/core/executor.js";
import type { LlmClient } from "../src/core/executor-types.js";

/**
 * Build a mock LlmClient that returns toolCalls from a callback.
 */
function mockLlmClient(
  callback: (attempt: number) => { arguments: string } | Error,
): LlmClient {
  let attempt = 0;
  return {
    async createChatCompletion() {
      attempt++;
      const result = callback(attempt);
      if (result instanceof Error) throw result;
      return { toolCalls: [{ functionName: "commit_test", arguments: result.arguments }] };
    },
  };
}

/** A mock Zod schema that optionally fails parse N times before succeeding. */
function mockSchema(
  validData: unknown,
  failCount = 0,
): { toJSONSchema(): Record<string, unknown>; parse(input: unknown): typeof validData } {
  let parseAttempts = 0;
  return {
    toJSONSchema() {
      return {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
    },
    parse(input: unknown) {
      parseAttempts++;
      if (parseAttempts <= failCount) {
        throw new Error(`Validation error: field 'name' expected string, got ${JSON.stringify(input)}`);
      }
      return input as typeof validData;
    },
  };
}

describe("generateStageData", () => {
  it("returns parsed data on successful first attempt", async () => {
    const client = mockLlmClient(() => ({ arguments: JSON.stringify({ name: "hello" }) }));
    const schema = mockSchema({ name: "hello" });
    const result = await generateStageData("test", schema, "system context", client);
    expect(result).toEqual({ name: "hello" });
  });

  it("retries and succeeds after validation failures", async () => {
    const client = mockLlmClient(() => ({ arguments: JSON.stringify({ name: "world" }) }));
    const schema = mockSchema({ name: "world" }, 2);
    const result = await generateStageData("test", schema, "ctx", client);
    expect(result).toEqual({ name: "world" });
  });

  it("fails when maxRetries exceeded", async () => {
    const client = mockLlmClient(() => ({ arguments: JSON.stringify({ name: "oops" }) }));
    const schema = mockSchema({ name: "oops" }, 99);
    await expect(generateStageData("test", schema, "ctx", client, 3)).rejects.toThrow(/重试次数耗尽/);
  });

  it("fails when LLM returns empty toolCalls", async () => {
    const client: LlmClient = {
      async createChatCompletion() {
        return { toolCalls: [] };
      },
    };
    const schema = mockSchema({ name: "x" });
    await expect(generateStageData("test", schema, "ctx", client, 1)).rejects.toThrow(/未返回任何 tool call/);
  });

  it("passes schema.toJSONSchema() result as function parameters", async () => {
    let capturedTools: unknown[] | undefined;
    const client: LlmClient = {
      async createChatCompletion(_messages, tools) {
        capturedTools = tools;
        return { toolCalls: [{ functionName: "commit_test", arguments: '{"name":"x"}' }] };
      },
    };
    const schema = mockSchema({ name: "x" });
    await generateStageData("test", schema, "ctx", client);
    expect(capturedTools).toBeDefined();
    expect(capturedTools).toHaveLength(1);
    const tool = (capturedTools as Array<Record<string, unknown>>)[0];
    expect(tool.type).toBe("function");
    expect((tool.function as Record<string, unknown>).name).toBe("commit_test");
    const params = (tool.function as Record<string, unknown>).parameters as Record<string, unknown>;
    // $schema meta-key must be stripped
    expect(params).not.toHaveProperty("$schema");
    expect(params).toHaveProperty("type", "object");
    expect(params).toHaveProperty("properties");
    expect(params).toHaveProperty("required");
  });

  it("includes error details in retry prompt on validation failure", async () => {
    const createChatCompletion = async (messages: Array<{ role: string; content: string }>) => {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "user" && lastMsg.content.includes("校验失败")) {
        return { toolCalls: [{ functionName: "commit_test", arguments: '{"name":"fixed"}' }] };
      }
      return { toolCalls: [{ functionName: "commit_test", arguments: '{"name":"wrong"}' }] };
    };
    const client: LlmClient = { createChatCompletion };
    const schema = mockSchema({ name: "fixed" }, 1);
    const result = await generateStageData("test", schema, "ctx", client);
    expect(result).toEqual({ name: "fixed" });
  });
});
