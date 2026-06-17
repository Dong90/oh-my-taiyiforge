/** 令牌桶限流器，防止并发 agent API 调用超过 LLM 限流阈值 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private pendingResolvers: Array<() => void> = [];

  constructor(
    /** 桶容量 = 最大突发并发 */
    private capacity: number,
    /** 每秒恢复的令牌数 */
    private refillRate: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /** 尝试获取一个令牌；若桶空则等待直到有令牌可用 */
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    return new Promise((resolve) => {
      this.pendingResolvers.push(resolve);
    });
  }

  /** 释放令牌（agent 完成后调用），唤醒等待队列 */
  release(): void {
    this.tokens = Math.min(this.tokens + 1, this.capacity);
    const next = this.pendingResolvers.shift();
    if (next) {
      this.tokens--;
      // 微任务：下一个 acquire 拿到令牌
      queueMicrotask(() => next());
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const earned = Math.floor(elapsed * this.refillRate);
    if (earned > 0) {
      this.tokens = Math.min(this.tokens + earned, this.capacity);
      this.lastRefill = now;
    }
  }
}

/** 默认令牌桶：容量 3，每秒恢复 2 个，避免 LLM 429 */
export const defaultAgentBucket = new TokenBucket(3, 2);
