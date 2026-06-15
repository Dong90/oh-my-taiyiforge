import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { detectOpenspec } from "../src/install/third-party-deps.js";
import { runOpenspecArchive } from "../src/integrations/openspec.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** PATH 上有 openspec 时跑；CI 无 CLI 则 skip，不阻塞 */
describe("OpenSpec real CLI (optional)", () => {
  const hasOpenspec = detectOpenspec().installed;

  it.skipIf(!hasOpenspec)("openspec --help 可执行", () => {
    const r = spawnSync("openspec", ["--help"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/archive|openspec/i);
  });

  it.skipIf(!hasOpenspec)("openspec archive 对最小 change 目录可调用", { timeout: 20_000 }, () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-openspec-real-"));
    try {
      const slug = "feat-real-archive";
      fs.mkdirSync(path.join(workspace, "openspec", "changes", slug), { recursive: true });
      fs.writeFileSync(
        path.join(workspace, "openspec", "config.yaml"),
        "change_root: openspec/changes\n",
      );
      fs.writeFileSync(
        path.join(workspace, "openspec", "changes", slug, "proposal.md"),
        "# Proposal\n\nMinimal archive smoke.\n",
      );

      const r = runOpenspecArchive(workspace, slug, { yes: true });
      // 部分 openspec 版本需更多文件；允许 skip 或 ok
      if (!r.ok && r.skipped) {
        expect(r.reason).toBeTruthy();
        return;
      }
      expect(r.ok, r.reason ?? r.stderr).toBe(true);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
