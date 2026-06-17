#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));

// Build dist first so GitHub-source installs (no prepare hook) get bin files.
if (!process.env.TAIYI_FORGE_SKIP_BUILD) {
  const build = spawnSync("npm", ["run", "build"], {
    cwd: pkgRoot,
    stdio: "inherit",
  });
  if (build.status !== 0) {
    console.warn("[oh-my-taiyiforge] postinstall: npm run build failed");
  }
}

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
