#!/usr/bin/env node
import { runInstallCli } from "../install/run.js";

const code = await runInstallCli(process.argv.slice(2));
process.exit(code);
