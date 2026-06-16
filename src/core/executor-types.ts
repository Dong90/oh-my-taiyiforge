export interface ToolCall {
  functionName: string;
  arguments: string;
}

export interface ChatCompletionResult {
  toolCalls: ToolCall[];
}

export interface LlmClient {
  createChatCompletion(
    messages: Array<{ role: string; content: string }>,
    tools: unknown[],
    toolChoice: unknown
  ): Promise<ChatCompletionResult>;
}
