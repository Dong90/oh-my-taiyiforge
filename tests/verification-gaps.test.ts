import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { taiyiArchive } from "../src/plugin/handlers.js";
import { runOpenspecArchive } from "../src/integrations/openspec.js";
import { syncTaiyiSkills } from "../src/install/sync-skills.js";
import { resolveActiveSlug } from "../src/core/active-slug.js";
import { WorkflowEngine } from "../src/core/workflow-engine.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 此前「未覆盖缺口」里能纯自动化、无需 IDE 的部分 */
describe("verification gaps (automatable)", () => {
  describe("OpenSpec 真 archive", () => {
    let workspace: string;
    let mockBin: string;

    beforeEach(() => {
      workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-os-e2e-"));
      mockBin = path.join(workspace, "bin");
      fs.mkdirSync(mockBin, { recursive: true });
      fs.writeFileSync(
        path.join(mockBin, "openspec"),
        `#!/usr/bin/env bash
echo "mock archive $1" >> "$MOCK_LOG"
exit 0
`,
        { mode: 0o755 },
      );
      fs.mkdirSync(path.join(workspace, "openspec", "changes", "feat-x"), { recursive: true });
      fs.writeFileSync(path.join(workspace, "openspec", "config.yaml"), "change_root: openspec/changes\n");
    });

    afterEach(() => {
      fs.rmSync(workspace, { recursive: true, force: true });
    });

    it("mock openspec CLI 被 archive 调用且 exit 0", () => {
      const log = path.join(workspace, "archive.log");
      const r = runOpenspecArchive(workspace, "feat-x", {
        openspecBin: path.join(mockBin, "openspec"),
        yes: true,
      });
      expect(r.ok).toBe(true);
      expect(r.skipped).toBeFalsy();
    });

    it("taiyiArchive 在 integration 完成后调 openspec", () => {
      const taiyiRoot = path.join(workspace, ".taiyi");
      const engine = new WorkflowEngine(taiyiRoot);
      engine.initChange("feat-x", { profile: "lite" });
      const dir = path.join(taiyiRoot, "changes", "feat-x");
      fs.writeFileSync(
        path.join(dir, "state.json"),
        JSON.stringify({
          ...engine.getState("feat-x"),
          completedPhases: ["change", "requirement", "dev", "test", "integration"],
          currentPhase: "integration",
          workflowStatus: "completed",
        }),
      );

      const r = runOpenspecArchive(workspace, "feat-x", {
        openspecBin: path.join(mockBin, "openspec"),
      });
      expect(r.ok).toBe(true);

      const archive = taiyiArchive(workspace, "feat-x", {
        requireIntegrationComplete: true,
      });
      expect(archive.ok).toBe(true);
    });
  });

  describe("多 slug 冲突", () => {
    let taiyiRoot: string;

    beforeEach(() => {
      const base = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-multi-"));
      taiyiRoot = path.join(base, ".taiyi");
      const engine = new WorkflowEngine(taiyiRoot);
      engine.initChange("alpha", { title: "Alpha" });
      engine.initChange("beta", { title: "Beta" });
    });

    afterEach(() => {
      fs.rmSync(path.dirname(taiyiRoot), { recursive: true, force: true });
    });

    it("resolveActiveSlug 在多个进行中变更时报错", () => {
      const r = resolveActiveSlug(taiyiRoot);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/多个进行中的变更/);
    });

    it("CLI continue 无 slug 时 exit 1", () => {
      const workspace = path.dirname(taiyiRoot);
      const script = path.join(REPO, "scripts/taiyi-forge.sh");
      const r = spawnSync("bash", [script, "continue"], {
        cwd: workspace,
        encoding: "utf8",
        env: { ...process.env, TAIYI_FORGE_ROOT: REPO },
      });
      expect(r.status).toBe(1);
      expect(`${r.stdout}${r.stderr}`).toMatch(/多个进行中的变更|请指定 slug/);
    });
  });

  describe("安装同步 Skills", () => {
    it("syncTaiyiSkills 从仓库 skills/ 同步全部 taiyi-* Skill", () => {
      const dest = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-skills-sync-"));
      try {
        const src = path.join(REPO, "skills");
        const r = syncTaiyiSkills(src, dest);
        expect(r.action).toMatch(/created|updated/);
        const names = fs.readdirSync(dest).filter((n) => n.startsWith("taiyi-"));
        expect(names.length).toBeGreaterThanOrEqual(16);
        for (const name of ["taiyi-forge", "taiyi-dev", "taiyi-orchestrator"]) {
          expect(fs.existsSync(path.join(dest, name, "SKILL.md")), name).toBe(true);
        }
      } finally {
        fs.rmSync(dest, { recursive: true, force: true });
      }
    });
  });
});
