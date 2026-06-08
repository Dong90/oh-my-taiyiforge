import test from "node:test";
import assert from "node:assert/strict";
import { increment } from "../src/counter.js";

test("increment adds one", () => {
  assert.equal(increment(0), 1);
  assert.equal(increment(2), 3);
});
