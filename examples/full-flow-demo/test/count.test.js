import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { countFiles } from "../src/count.js";

// happy case
test("counts files in src/ and test/", () => {
  const counts = countFiles(["src/", "test/"]);
  assert.equal(counts["src/"] > 0, true);
  assert.equal(counts["test/"] > 0, true);
});

// edge case — directory doesn't exist
test("returns 0 for missing directory", () => {
  const counts = countFiles(["nonexistent_dir_xyz/"]);
  assert.equal(counts["nonexistent_dir_xyz/"], 0);
});

// error case — empty array shouldn't throw
test("handles empty input array", () => {
  const counts = countFiles([]);
  assert.deepEqual(counts, {});
});
