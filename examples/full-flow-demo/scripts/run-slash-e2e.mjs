#!/usr/bin/env node
/**
 * 全量自动验证：vitest（临时目录 + 就地 examples）+ 可选就地落盘
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const tests = spawnSync(
  "npm",
  [
    "test",
    "--",
    "tests/examples-full-flow.test.ts",
    "tests/examples-full-flow-inplace.test.ts",
    "tests/run-slash-flow-cli.test.ts",
  ],
  { cwd: repo, stdio: "inherit", env: process.env },
);
if (tests.status !== 0) process.exit(tests.status ?? 1);

const inplace = spawnSync("node", ["examples/full-flow-demo/scripts/run-inplace-verify.mjs"], {
  cwd: repo,
  stdio: "inherit",
  env: process.env,
});
process.exit(inplace.status ?? 1);
