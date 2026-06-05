import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCounter } from "../src/counter.js";

describe("createCounter", () => {
  it("increments from zero", () => {
    const c = createCounter(0);
    c.increment();
    c.increment();
    assert.equal(c.value, 2);
  });

  it("resets to initial", () => {
    const c = createCounter(5);
    c.increment();
    c.reset();
    assert.equal(c.value, 5);
  });
});
