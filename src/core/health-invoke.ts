import fs from "node:fs";
import path from "node:path";

/** 用户面斜杠命令 */
export function healthSlash(slug?: string): string {
  return slug ? `/taiyi:health ${slug}` : "/taiyi:health";
}

/** Agent 代跑引擎 */
export function healthForge(slug?: string): string {
  const base = "scripts/taiyi-forge.sh health";
  return slug ? `${base} ${slug}` : base;
}

function detectProjectScripts(workspaceDir: string): string[] {
  const pkgPath = path.join(workspaceDir, "package.json");
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts ?? {};
    const preferred = ["health", "check", "verify", "test", "build", "lint", "typecheck"];
    return preferred.filter((k) => scripts[k]).map((k) => `npm run ${k}`);
  } catch {
    return [];
  }
}

/** Agent 加载 taiyi-health Skill 并写入 health-report.md */
export function formatAgentHealthProtocol(
  workspaceDir: string,
  slug: string,
  reportPath: string,
): string {
  const scripts = detectProjectScripts(workspaceDir);
  const scriptHint =
    scripts.length > 0
      ? `项目探测到可跑命令: ${scripts.join(" · ")}`
      : "未探测到 package.json scripts，按 Skill 表逐项探测（存在才跑）";

  return [
    "Health 协议（review 前质量基线，须加载 taiyi-health Skill）:",
    "  1. 【必须】加载 **taiyi-health** — 类型/lint/测试/构建，用命令输出说话",
    `  2. 写入 \`${reportPath}\` — 含 Verdict: PASS | PASS_WITH_WARN | FAIL`,
    `  3. ${scriptHint}`,
    "  4. 完成后: `scripts/taiyi-forge.sh mark-aux <slug> taiyi-health`（high complexity 必选）",
    "  5. 再进入 taiyi-review",
    "",
    `引擎探测: ${healthForge(slug)}（本命令仅输出协议；实际检查由 Agent + Skill 执行）`,
  ].join("\n");
}
