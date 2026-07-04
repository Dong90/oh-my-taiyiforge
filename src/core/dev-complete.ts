/** Standard .dev-complete evidence — dev 过关须含可验证测试命令与 exitCode: 0 */
import { execFileSync as _execFileSync } from "node:child_process";

export const DEV_COMPLETE_EVIDENCE = `command: npm test
exitCode: 0
dev complete
`;

export function isDevCompleteEvidence(text: string): boolean {
  const trimmed = text.trim();
  const hasMarker =
    trimmed.length >= 8 &&
    (/complete|done|dev/i.test(trimmed) || trimmed.split("\n").some((l) => l.trim().length >= 4));
  const exitOk = /exit(?:Code)?:\s*0\b/i.test(text);
  const cmdOk = /command:\s*\S+/i.test(text);
  return hasMarker && exitOk && cmdOk;
}

export type DevCompleteVerifyMode = "trust-text" | "replay-cmd";

export type DevCompleteVerifyResult = {
  passed: boolean;
  reason?: string;
  mode: DevCompleteVerifyMode;
};

/** 选择 verify 模式：默认 trust-text（仅检查文本）；strict / explicit "replay" 时跑 command。 */
export function verifyDevComplete(
  text: string,
  options?: {
    mode?: DevCompleteVerifyMode;
    cwd?: string;
    /** 显式 env override：TAIYI_DEV_VERIFY_MODE=replay 可强制 */
    env?: Record<string, string | undefined>;
    /** 自定义命令执行，最长 ms 默认 60s */
    timeoutMs?: number;
    exec?: (cmd: string, cwd: string) => { code: number; stderr?: string };
  },
): DevCompleteVerifyResult {
  const envMode = options?.env?.TAIYI_DEV_VERIFY_MODE?.toLowerCase();
  const mode: DevCompleteVerifyMode =
    options?.mode ??
    (envMode === "replay" || envMode === "strict" ? "replay-cmd" : "trust-text");

  // 不论何种模式，文本必须合法
  if (!isDevCompleteEvidence(text)) {
    return { passed: false, reason: ".dev-complete 文本无效（需含 `command:` + `exitCode: 0`）", mode };
  }

  if (mode === "trust-text") {
    return { passed: true, mode };
  }

  // replay-cmd：从文本抽 command 真跑
  const cmdMatch = text.match(/^\s*command:\s*(\S.*)$/m);
  if (!cmdMatch) {
    return { passed: false, reason: "trust-text passed but command 未声明", mode };
  }
  const cmd = cmdMatch[1]!.trim();
  const cwd = options?.cwd ?? process.cwd();
  const exec = options?.exec ?? defaultExec;
  try {
    const r = exec(cmd, cwd);
    if (r.code !== 0) {
      return {
        passed: false,
        reason: `declared command 实际失败（exit ${r.code}）: ${r.stderr?.slice(0, 200) ?? ""}`,
        mode,
      };
    }
    return { passed: true, mode };
  } catch (e) {
    return {
      passed: false,
      reason: `declared command 执行异常: ${e instanceof Error ? e.message : String(e)}`,
      mode,
    };
  }
}

function defaultExec(cmd: string, cwd: string): { code: number; stderr?: string } {
  try {
    _execFileSync(cmd, { cwd, shell: true, stdio: "pipe", encoding: "utf8", timeout: 60_000 });
    return { code: 0 };
  } catch (e) {
    const err = e as { status?: number; stderr?: string };
    return { code: typeof err.status === "number" ? err.status : 1, stderr: err.stderr };
  }
}
