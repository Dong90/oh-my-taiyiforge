import test from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/greet.js";
test("greet", () => assert.equal(greet("world"), "hello, world"));
