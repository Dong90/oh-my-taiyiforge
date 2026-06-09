import fs from "node:fs";
import path from "node:path";
import { resolveDeliveryVerifyCmd } from "./gates/consumer-config.js";

/** npm init 占位或 Ralph 无意义的 exit 1 脚本 */
export function isPlaceholderTestScript(script: string | undefined): boolean {
  if (!script?.trim()) return true;
  const s = script.trim();
  if (/^node\s+-e\s+["']process\.exit\(1\)["']$/i.test(s)) return true;
  if (/^node\s+-e\s+["']process\.exit\(\s*1\s*\)["']$/i.test(s)) return true;
  if (/echo\s+["']error:\s*no test specified["']/i.test(s) && /exit\s+1/.test(s)) return true;
  if (/^exit\s+1$/i.test(s)) return true;
  if (/^false$/i.test(s)) return true;
  return false;
}

function forgeDoctorCmd(workspaceDir: string): string | undefined {
  const wrapper = path.join(workspaceDir, "scripts", "taiyi-forge.sh");
  if (fs.existsSync(wrapper)) return "bash scripts/taiyi-forge.sh doctor";
  return undefined;
}

/** Ralph / delivery 验证命令解析（消费方友好回退） */
export function resolveRalphVerifyCmd(workspaceDir: string, env = process.env): string | undefined {
  const fromDelivery = resolveDeliveryVerifyCmd(workspaceDir, env);
  if (fromDelivery) return fromDelivery;

  const explicit = env.TAIYI_RALPH_VERIFY_CMD?.trim();
  if (explicit) return explicit;

  const pkgPath = path.join(workspaceDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { scripts?: { test?: string } };
      const testScript = pkg.scripts?.test?.trim();
      if (testScript && !isPlaceholderTestScript(testScript)) {
        return "npm test";
      }
    } catch {
      /* ignore */
    }
  }

  return forgeDoctorCmd(workspaceDir) ?? "bash scripts/taiyi-forge.sh verify";
}
