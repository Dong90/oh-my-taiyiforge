import type { LlmClient as BaseLlmClient } from "./executor-types.js";

export type { LlmClient as BaseLlmClient } from "./executor-types.js";

export interface LlmClient extends BaseLlmClient {
  /** Manually cacheable message (marks content block with cache_control) */
  cacheable?: boolean;
}

export interface CacheStats {
  calls: number;
  estimatedCachedTokens: number;
  estimatedFreshTokens: number;
}

/** Wrap message content with Anthropic-style cache_control block */
export function markCacheable(text: string): string {
  return `<cache_control>${text}</cache_control>`;
}

/** Wraps a base LlmClient with Anthropic-compatible cache_control markers */
export function createCachedClient(base: BaseLlmClient): {
  client: BaseLlmClient;
  stats: CacheStats;
} {
  let prevSystemHash = "";
  const stats: CacheStats = {
    calls: 0,
    estimatedCachedTokens: 0,
    estimatedFreshTokens: 0,
  };

  const wrapped: BaseLlmClient = {
    createChatCompletion: async (
      messages: Array<{ role: string; content: string }>,
      tools: unknown[],
      toolChoice: unknown
    ) => {
      stats.calls++;

      // Detect cache-hit: same system prompt as last call
      const sysMsgs = messages.filter((m) => m.role === "system");
      const sysHash = sysMsgs.map((m) => m.content).join("\n");
      const isCacheHit = sysHash === prevSystemHash;
      prevSystemHash = sysHash;

      // Build Anthropic-compatible content blocks
      const converted = messages.map((m) => {
        const isSystem = m.role === "system";
        const isCached = isSystem && isCacheHit;

        if (isSystem) {
          return {
            role: m.role,
            content: [
              {
                type: "text",
                text: m.content,
                ...(isCached ? { cache_control: { type: "ephemeral" } } : {}),
              },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      // Estimate tokens for stats
      if (isCacheHit) {
        const cachedChars = sysMsgs.reduce((sum, m) => sum + m.content.length, 0);
        stats.estimatedCachedTokens += Math.ceil(cachedChars / 4);
      }
      const freshMsgs = messages.filter((m) => m.role !== "system");
      const freshChars = freshMsgs.reduce((sum, m) => sum + m.content.length, 0);
      stats.estimatedFreshTokens += Math.ceil(freshChars / 4);

      return base.createChatCompletion(converted as never, tools, toolChoice);
    },
  };

  return { client: wrapped, stats };
}
