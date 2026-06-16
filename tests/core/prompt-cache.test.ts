import { describe, expect, it, vi } from "vitest";
import {
  createCachedClient,
  markCacheable,
  type LlmClient,
} from "../../src/core/prompt-cache.js";

function makeClient(): LlmClient & { calls: Array<{ messages: unknown[] }> } {
  const calls: Array<{ messages: unknown[] }> = [];
  return {
    calls,
    createChatCompletion: vi.fn(async (messages) => {
      calls.push({ messages: [...messages] });
      return { toolCalls: [{ functionName: "test", arguments: "{}" }] };
    }),
  };
}

describe("Prompt Caching middleware", () => {
  describe("markCacheable", () => {
    it("wraps content with cache_control tag", () => {
      const result = markCacheable("schema context here");
      expect(result).toContain("schema context here");
      expect(result).toContain("cache_control");
    });

    it("non-cacheable content does not have tag", () => {
      const result = "plain user request";
      expect(result).not.toContain("cache_control");
    });
  });

  describe("createCachedClient", () => {
    it("passes through calls to underlying client", async () => {
      const base = makeClient();
      const cached = createCachedClient(base);

      await cached.client.createChatCompletion(
        [
          { role: "system", content: "cached context" },
          { role: "user", content: "request" },
        ],
        [],
        {}
      );

      expect(base.createChatCompletion).toHaveBeenCalledTimes(1);
      expect(base.calls[0].messages).toHaveLength(2);
    });

    it("tags system messages with cache_control on cache hit", async () => {
      const base = makeClient();
      const cached = createCachedClient(base);

      // First call: cache miss, no cache_control
      await cached.client.createChatCompletion(
        [{ role: "system", content: "large schema context" }],
        [],
        {}
      );

      // Second call with same system: cache hit, cache_control added
      await cached.client.createChatCompletion(
        [{ role: "system", content: "large schema context" }],
        [],
        {}
      );

      const secondMessages = base.calls[1].messages as Array<{
        role: string;
        content: Array<{ type: string; text?: string; cache_control?: object }>;
      }>;

      const sysContent = secondMessages[0].content;
      expect(sysContent[0]).toHaveProperty("cache_control");
      expect(sysContent[0].cache_control).toEqual({ type: "ephemeral" });
    });

    it("user message content is NOT wrapped with cache blocks", async () => {
      const base = makeClient();
      const cached = createCachedClient(base);

      await cached.client.createChatCompletion(
        [{ role: "system", content: "schema" }],
        [],
        {}
      );
      await cached.client.createChatCompletion(
        [
          { role: "system", content: "schema" },
          { role: "user", content: "specific request" },
        ],
        [],
        {}
      );

      const secondMessages = base.calls[1].messages as Array<{
        role: string;
        content: string | Array<{ type: string; text?: string; cache_control?: object }>;
      }>;

      const userMsg = secondMessages.find((m) => m.role === "user");
      expect(userMsg).toBeDefined();
      // User message should be plain string, not array with cache_control
      expect(typeof userMsg!.content).toBe("string");
    });

    it("tracks cache statistics across calls", async () => {
      const base = makeClient();
      const cached = createCachedClient(base);

      // First call: cache miss
      await cached.client.createChatCompletion(
        [{ role: "system", content: "schema context here" }],
        [],
        {}
      );

      // Second call with same system: cache hit
      await cached.client.createChatCompletion(
        [{ role: "system", content: "schema context here" }],
        [],
        {}
      );

      // Third call with different system: cache miss
      await cached.client.createChatCompletion(
        [{ role: "system", content: "totally different context" }],
        [],
        {}
      );

      expect(base.createChatCompletion).toHaveBeenCalledTimes(3);
      expect(cached.stats.calls).toBe(3);
      // At least one cache hit (call 2 with same system prompt)
      expect(cached.stats.estimatedCachedTokens).toBeGreaterThan(0);
    });

    it("system messages cached, user+assistant messages always fresh", async () => {
      const base = makeClient();
      const cached = createCachedClient(base);

      // First call to establish cache
      await cached.client.createChatCompletion(
        [
          { role: "system", content: "fixed context" },
          { role: "system", content: "also fixed" },
        ],
        [],
        {}
      );

      // Second call: system gets cache_control, user does not
      await cached.client.createChatCompletion(
        [
          { role: "system", content: "fixed context" },
          { role: "system", content: "also fixed" },
          { role: "user", content: "variable request" },
          { role: "assistant", content: "previous response" },
        ],
        [],
        {}
      );

      const messages = base.calls[1].messages as Array<{
        role: string;
        content: string | Array<{ type: string; text?: string; cache_control?: object }>;
      }>;

      const hasCache = (i: number) =>
        Array.isArray(messages[i].content) &&
        messages[i].content.some(
          (b) => (b as { cache_control?: object }).cache_control !== undefined
        );

      // System messages should have cache_control on cache hit
      expect(hasCache(0)).toBe(true);
      expect(hasCache(1)).toBe(true);
      // User and assistant should be plain strings (not cached)
      expect(typeof messages[2].content).toBe("string");
      expect(typeof messages[3].content).toBe("string");
    });
  });
});
