#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));

try {
  const { runInstall, shouldRunPostinstall, parseInstallTargets } = await import(
    "./dist/install/run.js"
  );
  if (shouldRunPostinstall()) {
    await runInstall({
      pkgRoot,
      targets: parseInstallTargets(),
      registerPlugin: process.env.TAIYI_FORGE_SKIP_OPENCODE_CONFIG !== "1",
    });
  }
} catch (e) {
  console.warn(
    "[oh-my-taiyiforge] postinstall: build dist first (npm run build), or run: npx taiyi-forge-install --all"
  );
  if (process.env.TAIYI_FORGE_DEBUG) console.warn(e);
}
