import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCounter } from "../src/counter.js";

describe("createCounter", () => {
  it("starts at initial value", () => {
    assert.equal(createCounter(3).value, 3);
  });

  it("increments", () => {
    const c = createCounter();
    assert.equal(c.increment(), 1);
    assert.equal(c.increment(2), 3);
  });

  it("resets", () => {
    const c = createCounter(5);
    c.increment();
    assert.equal(c.reset(), 5);
  });
});
