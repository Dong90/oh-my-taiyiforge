import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  isPlaceholderTestScript,
  resolveRalphVerifyCmd,
} from "../src/core/ralph-verify-cmd.js";

describe("ralph-verify-cmd", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rvc-"));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("detects npm init placeholder test scripts", () => {
    expect(isPlaceholderTestScript('node -e "process.exit(1)"')).toBe(true);
    expect(isPlaceholderTestScript("exit 1")).toBe(true);
    expect(isPlaceholderTestScript('node -e "process.exit(0)"')).toBe(false);
    expect(isPlaceholderTestScript("vitest run")).toBe(false);
  });

  it("falls back to doctor when test script is placeholder", () => {
    fs.mkdirSync(path.join(workspace, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(workspace, "scripts", "taiyi-forge.sh"), "#!/bin/bash\n");
    fs.writeFileSync(
      path.join(workspace, "package.json"),
      JSON.stringify({ scripts: { test: 'node -e "process.exit(1)"' } }),
    );
    expect(resolveRalphVerifyCmd(workspace)).toBe("bash scripts/taiyi-forge.sh doctor");
  });

  it("uses npm test for real test scripts", () => {
    fs.writeFileSync(
      path.join(workspace, "package.json"),
      JSON.stringify({ scripts: { test: "vitest run" } }),
    );
    expect(resolveRalphVerifyCmd(workspace)).toBe("npm test");
  });
});
