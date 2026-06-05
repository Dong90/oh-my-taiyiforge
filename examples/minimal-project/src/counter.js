/** Minimal demo module for TaiyiForge dev/test phases */
export function createCounter(initial = 0) {
  let value = initial;
  return {
    increment(step = 1) {
      value += step;
      return value;
    },
    reset() {
      value = initial;
      return value;
    },
    get value() {
      return value;
    },
  };
}
