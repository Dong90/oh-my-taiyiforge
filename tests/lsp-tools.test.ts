import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { taiyiLspDiagnostics } from "../src/mcp/lsp-tools.js";

describe("lsp-tools", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-lsp-"));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("uses npm script exit code not output heuristics", () => {
    fs.writeFileSync(
      path.join(workspace, "package.json"),
      JSON.stringify({
        scripts: {
          typecheck: 'node -e "console.log(\\"error handler registered\\"); process.exit(1)"',
        },
      }),
    );
    const r = taiyiLspDiagnostics(workspace);
    expect(r.ok).toBe(false);
    expect(r.source).toBe("npm run typecheck");
  });

  it("passes when npm script exits 0 even if output mentions error", () => {
    fs.writeFileSync(
      path.join(workspace, "package.json"),
      JSON.stringify({
        scripts: {
          lint: 'node -e "console.log(\\"0 errors\\"); process.exit(0)"',
        },
      }),
    );
    const r = taiyiLspDiagnostics(workspace);
    expect(r.ok).toBe(true);
  });
});
