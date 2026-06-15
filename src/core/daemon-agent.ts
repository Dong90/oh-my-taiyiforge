import { spawnSync } from "node:child_process";
import fs from "node:fs";
import type { CiPlatformId } from "./ci-platform.js";

const CLI_BINS: Record<CiPlatformId, string[]> = {
  opencode: ["opencode"],
  claude: ["claude"],
  codex: ["codex"],
  cursor: ["cursor", "cursor-agent"],
};

const PLATFORM_ORDER: CiPlatformId[] = ["cursor", "codex", "claude", "opencode"];

function which(bin: string): string | null {
  const r = spawnSync("which", [bin], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

export function detectPlatformCli(platform: CiPlatformId): string | null {
  for (const b of CLI_BINS[platform]) {
    const p = which(b);
    if (p) return p;
  }
  return null;
}

export function resolveDaemonPlatform(env = process.env): CiPlatformId | null {
  const raw = env.TAIYI_DAEMON_PLATFORM?.trim().toLowerCase();
  if (raw && raw !== "auto") {
    if (["opencode", "claude", "codex", "cursor"].includes(raw)) {
      return raw as CiPlatformId;
    }
  }
  for (const p of PLATFORM_ORDER) {
    if (detectPlatformCli(p)) return p;
  }
  return null;
}

export type DaemonAgentInvokeResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
  skipped: boolean;
  skipReason?: string;
};

function readPrompt(promptFile: string): string {
  return fs.readFileSync(promptFile, "utf8");
}

export function buildDaemonAgentCommand(
  promptFile: string,
  slug: string,
  phase: string,
  platform: CiPlatformId,
  customCmd?: string,
): string {
  const template =
    customCmd?.trim() ||
    {
      opencode: `opencode run "$(cat {{PROMPT}})"`,
      claude: `claude -p "$(cat {{PROMPT}})"`,
      codex: `codex exec --full-auto "$(cat {{PROMPT}})"`,
      cursor: `cursor agent -p "$(cat {{PROMPT}})"`,
    }[platform];

  return template
    .replaceAll("{{PROMPT}}", promptFile)
    .replaceAll("{{PROMPT_FILE}}", promptFile)
    .replaceAll("{{SLUG}}", slug)
    .replaceAll("{{PHASE}}", phase);
}

export function invokeDaemonAgent(options: {
  promptFile: string;
  slug: string;
  phase: string;
  platform?: CiPlatformId | null;
  customCmd?: string;
  dryRun?: boolean;
  env?: NodeJS.ProcessEnv;
}): DaemonAgentInvokeResult {
  const env = options.env ?? process.env;
  if (env.TAIYI_DAEMON_SKIP_AGENT === "1" || env.TAIYI_DAEMON_ENGINE_ONLY === "1") {
    return {
      ok: false,
      exitCode: 0,
      stdout: "",
      stderr: "",
      command: "",
      skipped: true,
      skipReason: "engine-only",
    };
  }

  const platform = options.platform ?? resolveDaemonPlatform(env);
  if (!platform) {
    return {
      ok: false,
      exitCode: 1,
      stdout: "",
      stderr: "",
      command: "",
      skipped: true,
      skipReason: "no-platform",
    };
  }

  if (!fs.existsSync(options.promptFile)) {
    return {
      ok: false,
      exitCode: 1,
      stdout: "",
      stderr: `prompt file missing: ${options.promptFile}`,
      command: "",
      skipped: false,
    };
  }

  const command = buildDaemonAgentCommand(
    options.promptFile,
    options.slug,
    options.phase,
    platform,
    options.customCmd ?? env.TAIYI_DAEMON_AGENT_CMD,
  );

  if (options.dryRun) {
    return {
      ok: true,
      exitCode: 0,
      stdout: `[dry-run] would invoke: ${command}\nPrompt preview (${options.promptFile}, ${readPrompt(options.promptFile).length} chars)`,
      stderr: "",
      command,
      skipped: false,
    };
  }

  const r = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    ok: r.status === 0,
    exitCode: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    command,
    skipped: false,
  };
}
