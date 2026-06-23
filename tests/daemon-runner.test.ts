import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFullFlowDemoFixture, runForge } from "../src/core/run-slash-flow-cli.js";
import {
  buildDaemonAgentCommand,
  invokeDaemonAgent,
  resolveDaemonPlatform,
} from "../src/core/daemon-agent.js";
import { readDaemonState } from "../src/core/daemon-runner.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "daemon-demo";

describe("daemon run（无人 Agent 闭环）", { timeout: 120_000 }, () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-daemon-"));
    copyFullFlowDemoFixture(REPO, workspace);
    taiyiRoot = path.join(workspace, ".taiyi");
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("无 slug 时 CLI 报错", () => {
    const r = runForge(REPO, workspace, ["daemon", "run"]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/用法|daemon run/i);
  });

  it("非 --auto 变更默认阻塞（须 --force）", () => {
    runForge(REPO, workspace, ["init", SLUG, "--profile", "lite", "--title", "daemon"]);
    const r = runForge(REPO, workspace, ["daemon", "run", SLUG, "--engine-only"]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/autoHarness|--force/i);
  });

  it("--engine-only 在工件未就绪时阻塞并写入 runtime 状态", () => {
    runForge(REPO, workspace, ["init", SLUG, "--profile", "lite", "--auto", "--title", "daemon"]);
    const r = runForge(REPO, workspace, ["daemon", "run", SLUG, "--engine-only"]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/Daemon|阻塞|engine-only/i);
    const st = readDaemonState(taiyiRoot, SLUG);
    expect(st).not.toBeNull();
    expect(st?.slug).toBe(SLUG);
    expect(st?.active).toBe(false);
  });

  it("dry-run 生成 prompt 且不调用真实 Agent", () => {
    runForge(REPO, workspace, ["init", SLUG, "--profile", "lite", "--auto", "--title", "daemon"]);
    const prevPlatform = process.env.TAIYI_DAEMON_PLATFORM;
    const prevMax = process.env.TAIYI_DAEMON_MAX_ROUNDS;
    process.env.TAIYI_DAEMON_PLATFORM = "codex";
    process.env.TAIYI_DAEMON_MAX_ROUNDS = "8";
    try {
      const r = runForge(REPO, workspace, ["daemon", "run", SLUG, "--dry-run"]);
      expect(r.out).toMatch(/dry-run|CI prompt|Daemon/i);
      const promptDir = path.join(taiyiRoot, "ci-prompts");
      expect(fs.existsSync(promptDir)).toBe(true);
      const files = fs.readdirSync(promptDir).filter((f) => f.startsWith(SLUG));
      expect(files.length).toBeGreaterThan(0);
      expect(r.code).toBe(1);
      expect(r.out).toMatch(/blocked|阻塞|提前退出/i);
      expect(r.out).toMatch(/轮次 1\/8/);
    } finally {
      if (prevPlatform === undefined) delete process.env.TAIYI_DAEMON_PLATFORM;
      else process.env.TAIYI_DAEMON_PLATFORM = prevPlatform;
      if (prevMax === undefined) delete process.env.TAIYI_DAEMON_MAX_ROUNDS;
      else process.env.TAIYI_DAEMON_MAX_ROUNDS = prevMax;
    }
  });

  it("daemon status 可读 runtime 状态", () => {
    runForge(REPO, workspace, ["init", SLUG, "--profile", "lite", "--auto", "--title", "daemon"]);
    runForge(REPO, workspace, ["daemon", "run", SLUG, "--engine-only"]);
    const st = runForge(REPO, workspace, ["daemon", "status", SLUG]);
    expect(st.code).toBe(0);
    expect(st.out).toMatch(/round|change|stopped/i);
  });
});

describe("daemon-agent helpers", () => {
  it("buildDaemonAgentCommand 替换占位符", () => {
    const cmd = buildDaemonAgentCommand("/tmp/p.txt", "my-slug", "dev", "codex");
    expect(cmd.bin).toBe("codex");
    expect(cmd.args).toContain("--full-auto");
    expect(cmd.display).toMatch(/codex/);
  });

  it("invokeDaemonAgent engine-only 跳过", () => {
    const r = invokeDaemonAgent({
      promptFile: "/nonexistent",
      slug: "x",
      phase: "change",
      env: { TAIYI_DAEMON_ENGINE_ONLY: "1" },
    });
    expect(r.skipped).toBe(true);
    expect(r.skipReason).toBe("engine-only");
  });

  it("resolveDaemonPlatform 尊重 TAIYI_DAEMON_PLATFORM", () => {
    expect(resolveDaemonPlatform({ TAIYI_DAEMON_PLATFORM: "claude" })).toBe("claude");
  });
});
