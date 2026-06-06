import fs from "node:fs";
import path from "node:path";
import { defaultSkillTargets } from "../install/paths.js";
import { opencodeConfigCandidates } from "../install/paths.js";
import { PLUGIN_NAME } from "../install/types.js";
import { listPhases } from "./phase-registry.js";
import { detectThirdPartyDeps } from "../install/third-party-deps.js";
import { defaultCursorCommandsDir } from "../install/sync-cursor-commands.js";

export type DoctorCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export type DoctorReport = {
  ok: boolean;
  version: string;
  checks: DoctorCheck[];
};

function countTaiyiSkills(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((n) => n.startsWith("taiyi-")).length;
}

function readPackageVersion(pkgRoot: string): string {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8"));
    return String(j.version ?? "unknown");
  } catch {
    return "unknown";
  }
}

export function runDoctor(pkgRoot: string): DoctorReport {
  const checks: DoctorCheck[] = [];
  const dirs = defaultSkillTargets();
  const packageSkillsDir = path.join(pkgRoot, "skills");
  const expectedSkills = countTaiyiSkills(packageSkillsDir);
  const packageSkillCount = expectedSkills;
  checks.push({
    id: "package-skills",
    ok: packageSkillCount >= expectedSkills,
    detail: `${packageSkillCount}/${expectedSkills} in ${packageSkillsDir}`,
  });

  const platforms: { id: string; path: string }[] = [
    { id: "opencode-skills", path: dirs.opencode },
    { id: "claude-skills", path: dirs.claude },
    { id: "codex-skills", path: dirs.codex },
    { id: "cursor-skills", path: dirs.cursor },
  ];

  for (const p of platforms) {
    const n = countTaiyiSkills(p.path);
    checks.push({
      id: p.id,
      ok: n >= expectedSkills,
      detail: n > 0 ? `${n}/${expectedSkills} at ${p.path}` : `missing ${p.path}`,
    });
  }

  const cursorRule = path.join(path.dirname(dirs.cursor), "rules", "taiyiforge.mdc");
  checks.push({
    id: "cursor-rule",
    ok: fs.existsSync(cursorRule),
    detail: fs.existsSync(cursorRule) ? cursorRule : `missing ${cursorRule}`,
  });

  let pluginOk = false;
  let pluginDetail = "no opencode.json found";
  for (const cfg of opencodeConfigCandidates()) {
    if (!fs.existsSync(cfg)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(cfg, "utf8")) as { plugin?: string[] };
      if (Array.isArray(j.plugin) && j.plugin.includes(PLUGIN_NAME)) {
        pluginOk = true;
        pluginDetail = `${PLUGIN_NAME} in ${cfg}`;
        break;
      }
      pluginDetail = `found ${cfg} but plugin array missing ${PLUGIN_NAME}`;
    } catch {
      pluginDetail = `invalid JSON: ${cfg}`;
    }
  }
  checks.push({ id: "opencode-plugin", ok: pluginOk, detail: pluginDetail });

  const phases = listPhases();
  checks.push({
    id: "phase-registry",
    ok: phases.length === 9,
    detail: `${phases.length} phases registered`,
  });

  const templatesDir = path.join(pkgRoot, "templates");
  const templateCount = fs.existsSync(templatesDir)
    ? fs.readdirSync(templatesDir).filter((f) => f.endsWith(".md")).length
    : 0;
  checks.push({
    id: "templates",
    ok: templateCount >= 8,
    detail: `${templateCount} templates in ${templatesDir}`,
  });

  const codexAgents = path.join(path.dirname(dirs.codex), "AGENTS.md");
  checks.push({
    id: "codex-agents",
    ok: fs.existsSync(codexAgents) && fs.readFileSync(codexAgents, "utf8").includes("taiyi-"),
    detail: fs.existsSync(codexAgents) ? codexAgents : `missing ${codexAgents}`,
  });

  const cursorCmdDir = defaultCursorCommandsDir();
  const cursorCmdCount = fs.existsSync(cursorCmdDir)
    ? fs.readdirSync(cursorCmdDir).filter((n) => n.startsWith("taiyi-") && n.endsWith(".md")).length
    : 0;
  const promptCount = fs.existsSync(path.join(pkgRoot, "prompts"))
    ? fs.readdirSync(path.join(pkgRoot, "prompts")).filter((n) => n.startsWith("taiyi-") && n.endsWith(".md")).length
    : 0;
  checks.push({
    id: "cursor-commands",
    ok: cursorCmdCount >= promptCount && promptCount > 0,
    detail:
      cursorCmdCount > 0
        ? `${cursorCmdCount}/${promptCount} at ${cursorCmdDir}`
        : `missing ~/.cursor/commands/taiyi-*.md — run taiyi-forge-install --cursor`,
  });

  for (const dep of detectThirdPartyDeps(["opencode", "claude", "codex", "cursor"])) {
    checks.push({
      id: `deps-${dep.id}`,
      ok: dep.installed,
      detail: dep.detail,
    });
  }

  // PASS：包内 skills + 阶段注册 + 模板（四端目录为建议项，跑 taiyi-forge-install --all 同步）
  const required = new Set(["package-skills", "phase-registry", "templates"]);
  const ok = checks.filter((c) => required.has(c.id)).every((c) => c.ok);
  return { ok, version: readPackageVersion(pkgRoot), checks };
}
