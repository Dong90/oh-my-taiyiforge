import { spawnSync } from "node:child_process";
import fs from "node:fs";
import type { CiPlatformId } from "./ci-platform.js";

/** macOS argv size limit (ARG_MAX = 256 KB, we use a safe margin of 128 KB) */
const MAX_ARGV_BYTES = 128 * 1024;

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
  try {
    return fs.readFileSync(promptFile, "utf8");
  } catch {
    return "";
  }
}

export type DaemonAgentCommand = {
  /** Human-readable command string for logging */
  display: string;
  /** Binary path (first arg to spawnSync) */
  bin: string;
  /** Argument array (without bin) for spawnSync(…) */
  args: string[];
};

export function buildDaemonAgentCommand(
  promptFile: string,
  slug: string,
  phase: string,
  platform: CiPlatformId,
  customCmd?: string,
): DaemonAgentCommand {
  const promptContent = readPrompt(promptFile);

  if (customCmd?.trim()) {
    const parts = customCmd.trim().split(/\s+/);
    const expanded = parts.map((p) =>
      p
        .replace("{{PROMPT}}", promptContent)
        .replace("{{PROMPT_FILE}}", promptFile)
        .replace("{{SLUG}}", slug)
        .replace("{{PHASE}}", phase),
    );
    return {
      display: customCmd,
      bin: expanded[0],
      args: expanded.slice(1),
    };
  }

  switch (platform) {
    case "opencode":
      return {
        display: `opencode run <prompt>`,
        bin: "opencode",
        args: ["run", promptContent],
      };
    case "claude":
      return {
        display: `claude -p <prompt>`,
        bin: "claude",
        args: ["-p", promptContent],
      };
    case "codex":
      return {
        display: `codex exec --full-auto <prompt>`,
        bin: "codex",
        args: ["exec", "--full-auto", promptContent],
      };
    case "cursor":
      return {
        display: `cursor agent -p <prompt>`,
        bin: "cursor",
        args: ["agent", "-p", promptContent],
      };
  }
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
      stdout: `[dry-run] would invoke: ${command.display}\nPrompt preview (${options.promptFile}, ${readPrompt(options.promptFile).length} chars)`,
      stderr: "",
      command: command.display,
      skipped: false,
    };
  }

  const totalArgvBytes = command.args.reduce(
    (sum, a) => sum + Buffer.byteLength(a, "utf8") + 1,
    Buffer.byteLength(command.bin, "utf8") + 1,
  );
  if (totalArgvBytes > MAX_ARGV_BYTES) {
    return {
      ok: false,
      exitCode: 1,
      stdout: "",
      stderr: `argv too large (${totalArgvBytes} bytes, limit ${MAX_ARGV_BYTES}): prompt content may need to be written to a file instead`,
      command: command.display,
      skipped: false,
    };
  }

  const r = spawnSync(command.bin, command.args, {
    encoding: "utf8",
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000,
  });

  if (r.error) {
    return {
      ok: false,
      exitCode: 1,
      stdout: r.stdout ?? "",
      stderr: `${r.error.message}: ${command.display}`,
      command: command.display,
      skipped: false,
    };
  }

  return {
    ok: r.status === 0,
    exitCode: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    command: command.display,
    skipped: false,
  };
}
