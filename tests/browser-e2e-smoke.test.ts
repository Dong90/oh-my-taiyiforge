import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SMOKE_DIR = path.join(REPO, "examples/browser-e2e-smoke");

describe("/taiyi:e2e browser smoke fixture", () => {
  it("prompt 契约：browser-smoke / e2e / gstack qa / ui-test", () => {
    const smoke = fs.readFileSync(path.join(REPO, "prompts/taiyi-browser-smoke.md"), "utf8");
    const e2e = fs.readFileSync(path.join(REPO, "prompts/taiyi-e2e.md"), "utf8");
    const qa = fs.readFileSync(path.join(REPO, "prompts/taiyi-gstack-qa.md"), "utf8");
    const ui = fs.readFileSync(path.join(REPO, "prompts/taiyi-ui-test.md"), "utf8");
    expect(smoke).toContain("/taiyi:browser-smoke");
    expect(smoke).toContain("browser-smoke");
    expect(e2e).toContain("npx playwright test");
    expect(qa).toMatch(/browse|qa/i);
    expect(ui).toContain("/taiyi:e2e");
    expect(ui).toContain("/taiyi:gstack qa");
  });

  it("run-verify.mjs：Playwright 真跑（/taiyi:e2e 等价）", () => {
    const script = path.join(SMOKE_DIR, "run-verify.mjs");
    expect(fs.existsSync(script)).toBe(true);

    const r = spawnSync(process.execPath, [script], {
      cwd: REPO,
      env: process.env,
      encoding: "utf8",
      timeout: 300_000,
    });

    const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
    if (r.status !== 0) {
      // eslint-disable-next-line no-console
      console.error(out);
    }
    expect(r.status, out.slice(-2000)).toBe(0);
    expect(out).toMatch(/passed|✓/i);
  }, 300_000);
});
