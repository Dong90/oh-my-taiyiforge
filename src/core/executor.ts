import type { ZodSchema } from "zod";
import type { LlmClient } from "./executor-types.js";

export async function generateStageData<T>(
  stage: string,
  schema: ZodSchema<T>,
  context: string,
  llmClient: LlmClient,
  maxRetries = 3
): Promise<T> {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: context },
  ];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await llmClient.createChatCompletion(
        messages,
        [
          {
            type: "function",
            function: {
              name: `commit_${stage}`,
              parameters: {},
            },
          },
        ],
        {
          type: "function",
          function: { name: `commit_${stage}` },
        }
      );

      const rawJson = response.toolCalls[0].arguments;
      return schema.parse(JSON.parse(rawJson));
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `[引擎警告] ${stage} 第 ${attempt} 次校验失败: ${errMsg}`
      );

      if (attempt === maxRetries) {
        throw new Error(
          `[致命错误] ${stage} 阶段数据生成失败，重试次数耗尽（${maxRetries} 次）。最后错误: ${errMsg}`
        );
      }

      messages.push({
        role: "user",
        content: `数据校验失败，报错：${errMsg}\n请严格遵循 Schema 并重新输出。`,
      });
    }
  }

  // Unreachable — kept for type safety
  throw new Error(`[致命错误] ${stage} 阶段数据生成失败`);
}
