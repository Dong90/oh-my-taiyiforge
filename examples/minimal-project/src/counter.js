/** 最小演示：可递增计数器 */
export function createCounter(initial = 0) {
  let value = initial;
  return {
    get value() {
      return value;
    },
    increment(step = 1) {
      value += step;
      return value;
    },
    reset() {
      value = initial;
      return value;
    },
  };
}
