import test from "node:test";
import assert from "node:assert/strict";
import { add } from "../src/add.js";

test("add normal", () => assert.equal(add(2, 3), 5));
test("add zero", () => assert.equal(add(0, 0), 0));
test("add negative", () => assert.equal(add(-1, 1), 0));
