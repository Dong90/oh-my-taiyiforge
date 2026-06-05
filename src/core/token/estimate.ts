/** Rough token estimate (≈4 chars/token for Latin/CJK mix). No external tokenizer. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimateCostUsd(tokens: number, costPerMillion: number): number {
  return Math.round((tokens / 1_000_000) * costPerMillion * 1_000_000) / 1_000_000;
}
