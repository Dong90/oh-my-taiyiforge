import test from "node:test";
import assert from "node:assert/strict";
import { hello } from "../src/hello.js";

test("hello returns greeting with name", () => {
  assert.equal(hello("Alice"), "Hello, Alice");
});

test("hello handles empty string", () => {
  assert.equal(hello(""), "Hello, World");
});
