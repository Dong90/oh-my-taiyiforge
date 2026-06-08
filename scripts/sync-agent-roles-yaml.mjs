#!/usr/bin/env node
/** Regenerate docs/taiyi/agent-roles.yaml from src/core/agent-roles.ts */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderAgentRolesYaml } from "../src/core/agent-roles-yaml.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "docs/taiyi/agent-roles.yaml");
fs.writeFileSync(out, renderAgentRolesYaml());
console.log(`Updated ${out}`);
