#!/usr/bin/env node
/** @deprecated Prefer: npx taiyi walkthrough (works in any project dir) */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const taiyi = path.join(pkgRoot, "dist/cli/taiyi.js");

const r = spawnSync("node", [taiyi, "walkthrough"], { cwd: pkgRoot, encoding: "utf8" });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
