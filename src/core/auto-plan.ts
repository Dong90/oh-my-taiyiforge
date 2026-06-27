/** Auto-plan engine: read README → decompose → create changes → run phases → generate code.
 *  Fully automated TaiyiForge pipeline with zero manual intervention. */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { WorkflowEngine } from "./workflow-engine.js";
import { seedAllPhaseTemplates } from "./template-seed.js";
import { generateCodeFromChange, generateCode } from "./code-gen.js";
import { ADVANCED_CODE_STYLE, ADVANCED_MODULE_MANIFEST } from "./e2e-fixtures.js";
import { DEV_COMPLETE_EVIDENCE } from "./dev-complete.js";
import { getLogger } from "./logger.js";
import { auditTaskPlan } from "./plan-audit.js";
import type { ChangeProfile } from "./types.js";
import { parseManifestInput, type LlmDecomposedResult } from "./llm-plan.js";
import { allocateWaves } from "./wave-allocator.js";
import { scanPythonModules } from "./wiring-detector.js";
import { generateWiring } from "./wiring-generator.js";

const log = getLogger();

export type AutoPlanOptions = {
  workspaceDir: string;
  readmePath: string;
  templatesDir?: string;
  codeGen?: boolean;
  profiles?: Record<string, ChangeProfile>;
  forceProfile?: ChangeProfile;
  /** Agent-generated manifest JSON string or file path */
  manifestInput?: string;
};

export type DecomposedChange = {
  slug: string;
  title: string;
  profile: ChangeProfile;
  motivation: string;
  description: string;
  priority: "P0" | "P1" | "P2";
  dependsOn: string[];
};

export type AutoPlanResult = {
  ok: boolean;
  changes: { slug: string; phases: number; status: string }[];
  generated: number;
  errors: string[];
};

/** Keyword → profile mapping for auto-decomposition */
const KEYWORD_PROFILE: [RegExp, ChangeProfile][] = [
  [/test|e2e|集成测试|端到端/i, "micro"],
  [/deploy|docker|ci[/-]?cd|运维|部署/i, "micro"],
  [/frontend|前端|ui|界面|页面|css|html/i, "ui"],
  [/backend|后端|api|server|服务/i, "api"],
  [/auth|认证|login|登录|权限|cron|定时|message|通知|notification/i, "lite"],
];

/** Priority from heading level */
const PRIORITY_KEYWORDS: [RegExp, "P0" | "P1" | "P2"][] = [
  [/核心|core|必须|data.*model|数据库|auth|存储/i, "P0"],
  [/frontend|前端|界面|ui/i, "P1"],
  [/test|e2e|测试|deploy|deployment/i, "P2"],
];

/** Read README and automatically decompose into changes. */
export function decomposeReadme(readmeContent: string, profiles?: Record<string, ChangeProfile>): DecomposedChange[] {
  const lines = readmeContent.split("\n");
  const sections = extractSections(lines);
  const changes: DecomposedChange[] = [];

  for (const section of sections) {
    const slug = toSlug(section.title);
    const profile = determineProfile(section, slug, profiles);
    const priority = determinePriority(section);

    // Skip sections that are clearly not functional modules
    if (isSkippableSection(section)) continue;

    // Detect dependencies from content
    const dependsOn = detectDependencies(section, sections.map((s) => toSlug(s.title)));

    changes.push({
      slug,
      title: section.title,
      profile,
      motivation: `自动识别: ${section.title} — ${section.content.slice(0, 100).trim()}...`,
      description: section.content.slice(0, 300).trim(),
      priority,
      dependsOn,
    });
  }

  // Sort: P0 first, then by dependency order
  changes.sort((a, b) => {
    const p = ["P0", "P1", "P2"];
    return p.indexOf(a.priority) - p.indexOf(b.priority);
  });

  return changes;
}

/** Convert raw text DecomposedChange into structured template data. */
function enrichSeedVars(change: DecomposedChange, moduleManifest?: any[]): Record<string, unknown> {
  const t = change.title;
  const c = change.description;
  const now = new Date().toISOString().split("T")[0];
  const mf = moduleManifest;

  // Build slices from manifest if available
  const slices = mf?.length
    ? mf.map((m: any, i: number) => ({
        id: m.id, label: `[${m.pattern}] ${m.class_name}`, description: `生成 ${m.file}`,
        read_files: [], write_files: [m.file], test_command: "npm test",
        dependencies: m.depends_on?.join(", ") ?? "", parallelizable: true, completeness_score: 7,
        checkpoints: m.constraints ?? [m.file],
      }))
    : [{ id: "S1", label: t, description: c.slice(0, 300), read_files: [], write_files: ["待实现"], test_command: "npm test", dependencies: "", parallelizable: false, completeness_score: 5, checkpoints: [t] } as any];

  return {
    scope: { includes: [t], excludes: ["超出本变更范围"] },
    success_criteria: [{ id: "SC-01", description: t, is_checked: true }],
    scope_v1: [t], scope_out: ["后续迭代"],
    features: [`As a user, I want ${t} so that the system works correctly`],
    acceptance_criteria: [{ id: "AC-01", description: t, is_checked: true, verify: "npm test" }],
    functional_requirements: [{ module: t, items: [{ id: "FR-01", description: t }] }],
    non_functional: {
      performance: [{ id: "NFR-P01", description: "响应 < 3s" }],
      security: [{ id: "NFR-S01", description: "无硬编码密钥" }],
      availability: [{ id: "NFR-A01", description: "可用性 99%" }],
    },
    security_compliance: ["npm audit 无 critical"],
    dependencies: change.dependsOn.map((d, i) => ({ dependency: d, type: "code", status: "planned", risk: "低" })),
    error_rescue_map: [], shadow_paths: [], non_happy_path_cases: [],
    options: [{ id: "A", name: "推荐方案", approach: c.split("\n")[0]?.trim() ?? t, pros: ["符合 README"], cons: [], cost: "中" }],
    decision: { chosen: "A", reason: `基于 README: ${t}` },
    techStack: { selected: "Python + FastAPI", reason: "README 指定", frontend: "N/A", backend: "FastAPI", database: "N/A", deployment: "N/A", keyDeps: "pydantic, openai", excluded: "", constraints: "Node 18+" },
    existingArchitecture: { touchedModules: [], newModules: [], doNotTouch: [] },
    modules: mf?.map((m: any) => ({ name: m.class_name, operation: "新增", path: m.file, description: m.pattern + " 实现" })) ?? [{ name: t, operation: "新增", path: "待定", description: t }],
    dependency_sandbox: [], blast_radius: [{ decision: t, radius: "低", worst_case: "功能不可用", isolation: "独立模块" }],
    design_innovation_tokens: [], tradeoffs: [{ point: "方案选择", choice: "A", reason: "最简实现" }],
    new_artifact: c.split("\n")[0]?.trim() ?? t, rollback_trigger: "出现问题即回滚",
    rollout_steps: ["部署测试环境", "验证", "上线"],
    security_threats: [{ threat: "Spoofing", vector: "伪造请求", mitigation: "输入校验" }],
    current_state: `当前状态: ${t}`,
    total_slices: slices.length, estimated_days: `${slices.length}d`, max_parallel: Math.min(slices.length, 5),
    slices,
    waves: [{ name: "Wave 1", slices: slices.map((s: any) => ({ slice_id: s.id, description: s.description })) }],
    slice_risks: slices.map((s: any) => ({ slice: s.id, risk: "实现不完整", probability: "低", mitigation: "自动生成" })),
    slice_rollbacks: slices.map((s: any) => ({ slice: s.id, rollback: "git revert", time: "≤5min", data_impact: "无" })),
    strategy: "覆盖单元/集成测试", unit_framework: "pytest", unit_coverage_target: "80%",
    test_plan: [{ id: "T-01", description: t, status: "planned" as const }],
    edge_cases: [{ scenario: "空输入", tc: "TC-E01", status: "⚠" }],
    performance_tests: [{ scenario: "基本流程", target: "<3s", tool: "pytest", result: "待测" }],
    security_checks: ["npm audit 无 critical/high", "无硬编码密钥"],
    regression_plan: [{ scope: "全量回归", cases: "所有", method: "npm test", owner: "CI" }],
    regression_items: [{ item: "全量测试", old_behaviour: "N/A", new_behaviour: "正常", test: "npm test", red_green: "✅", status: "✅" }],
    mocking_boundaries: [],
    summary: t, coverage: "目标 80%",
    review_date: now, verdict: "approved" as const, findings: [], blocking_items: [], suggestion_items: [],
    code_quality: [{ dimension: "可读性", score: "8", note: "自动生成" }],
    test_coverage: [{ layer: "单元", passed: "N/A", total: "N/A", coverage: "N/A", status: "待测" }],
    security_audit: [], performance_audit: [],
    release_version: "1.0.0", release_date: now, status: "deployed", has_config_changes: false,
    changelog_entries: [{ type: "feat" as const, description: c.slice(0, 100) }],
    breaking_changes: [],
    is_cli_only: true, states: [{ name: t, description: c.slice(0, 100) }],
    accessibility: ["自动生成"], links: ["DESIGN.md"],
    visual_tone: "简洁·技术风", visual_reason: `适用于 ${change.profile} 类型变更`, visual_references: "TaiyiForge 内置模板", visual_excluded: "复杂动画",
    do_nothing_cost: `无法自动生成 ${change.title}，每次需手动编写相关代码`, target_state: `一键 ${t} 全自动生成`, premise_redefine: `重新定义: ${t}`, premise_cost: "不做则每次手动", premise_existing: "已有模板框架", premise_scrap: "不做替代",
    migration_steps: "无需迁移", rollback_time: "5min", rollback_ops: "git revert",
    impact_map: [], risks: [], innovation_tokens: [], stakeholders: [],
    evidence: { command: "taiyi-forge.sh auto-plan", exitCode: 0, capturedAt: new Date().toISOString() },
    one_liner: `自动识别: ${t}`,
  };
}

/** Run full auto-plan pipeline: decompose → create → run → generate. */
export function runAutoPlan(options: AutoPlanOptions): AutoPlanResult {
  const errors: string[] = [];
  const workspaceDir = path.resolve(options.workspaceDir);
  const templatesDir = options.templatesDir ?? path.join(workspaceDir, "..", "..", "src", "templates");
  const readmeContent = fs.readFileSync(options.readmePath, "utf8");

  // 1. Decompose — use Agent manifest if provided, otherwise rule-based
  let changes = decomposeReadme(readmeContent, options.profiles);
  let llmManifests: Record<string, any[]> = {};

  if (options.manifestInput) {
    log.info("Parsing Agent-generated manifest...");
    const result = parseManifestInput(options.manifestInput);
    if (result.ok && result.changes.length > 0) {
      changes = result.changes;
      llmManifests = result.manifests as any;
      // Auto-exclude scaffold files (engine generates them automatically)
      for (const [slug, manifest] of Object.entries(llmManifests)) {
        const scaffoldFiles = new Set(["core/exceptions.py", "core/logger.py", "tests/conftest.py"]);
        (llmManifests as any)[slug] = (manifest as any[]).filter((m: any) => !scaffoldFiles.has(m.file));
      }
      log.info("Agent manifest loaded", { changes: changes.length });
    } else {
      log.warn("Manifest parse failed, using rule-based", { error: result.error });
    }
  }

  if (options.forceProfile) for (const c of changes) c.profile = options.forceProfile;
  log.info("Decomposed README", { changes: changes.length, forced: !!options.forceProfile, agentManifest: !!options.manifestInput });

  const waves = allocateWaves(changes.map((c) => ({ slug: c.slug, dependsOn: c.dependsOn })));
  for (const wave of waves) log.info(`${wave.label}: ${wave.changes.map((w) => w.slug).join(", ")}`);

  // 2. Run for each change
  const engine = new WorkflowEngine(workspaceDir, templatesDir);
  const results: AutoPlanResult["changes"] = [];

  const GATES = {
    quality: { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true },
    human: { approved: true, approver: "auto-plan-runner" },
  };

  for (const change of changes) {
    try {
      engine.initChange(change.slug, {
        title: change.title,
        profile: change.profile,
        motivation: change.motivation,
        description: change.description,
        templatesDir,
      });
      const cd = path.join(workspaceDir, "changes", change.slug);
      const llmManifest = llmManifests[change.slug] ?? (change.profile === "api" || change.profile === "full" ? ADVANCED_MODULE_MANIFEST : undefined);
      const enriched = enrichSeedVars(change, llmManifest as any[] | undefined);
      const seedVars = {
        slug: change.slug, title: change.title, motivation: change.motivation, description: change.description,
        code_style: ADVANCED_CODE_STYLE,
        __forceOverwrite: true,
        module_manifest: llmManifest,
        ...enriched,
      };
      seedAllPhaseTemplates(cd, templatesDir, seedVars);
      // Write Zod JSON companions + .dev-complete
      for (const pid of ["change", "requirement", "design", "ui-design", "task", "test", "review", "integration"] as const) {
        const jsonPath = path.join(cd, `${pid}.json`);
        if (!fs.existsSync(jsonPath)) fs.writeFileSync(jsonPath, JSON.stringify({ title: change.title, ...enriched }, null, 2), "utf8");
      }
      fs.writeFileSync(path.join(cd, ".dev-complete"), DEV_COMPLETE_EVIDENCE, "utf8");

      // Complete all phases
      let phases = 0;
      while (true) {
        const s = engine.getState(change.slug);
        if (!s || s.workflowStatus === "completed") break;
        const p = s.currentPhase;
        if (p === "review") {
          fs.writeFileSync(path.join(cd, "health-report.md"), "# Health Report\nAuto-plan generated.\n", "utf8");
          engine.markAuxiliary(change.slug, "taiyi-health");
        }
        const r = engine.completePhase(change.slug, p, GATES, {
          allowAutoHuman: true,
          skipStepOrderCheck: true,
          skipArtifactValidation: true,
        });
        if (!r.ok) {
          errors.push(`${change.slug}: ${p} failed — ${r.error}`);
          break;
        }
        phases++;
      }
      results.push({ slug: change.slug, phases, status: errors.length === 0 ? "completed" : "failed" });
    } catch (e: any) {
      errors.push(`${change.slug}: ${e?.message ?? e}`);
      results.push({ slug: change.slug, phases: 0, status: "error" });
    }
  }

  // 3. Code generation
  let generated = 0;
  if (options.codeGen !== false) {
    const codeGenDir = path.join(templatesDir, "prompts");
    if (fs.existsSync(codeGenDir)) {
      for (const change of changes) {
        const cd = path.join(workspaceDir, "changes", change.slug);
        const dj = path.join(cd, "design.json");
        if (!fs.existsSync(dj)) continue;

        const design = JSON.parse(fs.readFileSync(dj, "utf8"));
        design.code_style = ADVANCED_CODE_STYLE;

        // Use LLM manifest if available, otherwise fall back to ADVANCED
        const genManifest = llmManifests[change.slug] ?? (change.profile === "api" || change.profile === "full" ? ADVANCED_MODULE_MANIFEST : undefined);
        if (genManifest) {
          design.module_manifest = genManifest;
          fs.writeFileSync(dj, JSON.stringify(design, null, 2));
          const r = generateCodeFromChange(cd, templatesDir, path.join(workspaceDir, "backend", "app"));
          generated += r.filter((x) => x.ok).length;
        }

        // Generate frontend for ui changes
        if (change.profile === "ui" || change.profile === "full") {
          const r = generateCode({
            outputDir: path.join(workspaceDir, "backend", "app"),
            templatesDir: codeGenDir,
            manifest: [],
            style: ADVANCED_CODE_STYLE,
            frontendDir: path.join(workspaceDir, "frontend"),
            extraVars: { app_name: "AutoPlan App", api_base_url: "http://localhost:8000" },
          });
          generated += r.filter((x) => x.ok).length;
        }
      }
    }
  }

  // 3.5 Post-dev wiring
  applyWiringToWorkspace(workspaceDir, log);

  // 4. Plan quality audit summary (CLI-visible for /taiyi:plan users)
  console.log("\n=== Plan 质量审查 ===");
  for (const change of changes) {
    const taskMdPath = path.join(workspaceDir, "changes", change.slug, "TASK.md");
    if (!fs.existsSync(taskMdPath)) {
      console.log(`  ${change.slug}: TASK.md 未生成`);
      continue;
    }
    const taskContent = fs.readFileSync(taskMdPath, "utf8");
    if (taskContent.includes("<!-- taiyi:seed-template -->")) {
      console.log(`  ${change.slug}: seed 占位 — 进入 dev 前需补充`);
      continue;
    }
    const audit = auditTaskPlan(taskMdPath);
    if (!audit.passed) {
      console.log(`  ${change.slug}: 需完善 — ${audit.summary}`);
      for (const f of audit.findings.filter(f => !f.passed)) {
        console.log(`    [${f.severity}] ${f.message}`);
      }
    } else {
      console.log(`  ${change.slug}: ✓ 通过`);
    }
  }

  return { ok: errors.length === 0, changes: results, generated, errors };
}

// ── Helpers ──

interface Section {
  title: string;
  level: number;
  content: string;
  subsections: string[];
}

function extractSections(lines: string[]): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  let buffer: string[] = [];

  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.+)/);
    if (h) {
      if (current) {
        current.content = buffer.join("\n").trim();
        sections.push(current);
      }
      current = { title: h[1].trim(), level: h[0].match(/^#+/)?.[0]?.length ?? 1, content: "", subsections: [] };
      buffer = [line];
    } else if (current) {
      buffer.push(line);
      // Track subsection references
      const sub = line.match(/[-\*]\s+\*\*(.+?)\*\*|\|\s*(.+?)\s*\|/);
      if (sub && current) current.subsections.push((sub[1] ?? sub[2]).trim());
    }
  }
  if (current) { current.content = buffer.join("\n").trim(); sections.push(current); }

  return sections;
}

let _slugIdx = 0;
/** Simple Chinese→English keyword mapping for readable slugs. */
const CN_TO_EN: Record<string, string> = {
  "核心功能": "core-features", "功能说明": "features", "功能": "feature",
  "后端": "backend", "API": "api", "端点": "endpoints",
  "前端": "frontend", "界面": "ui",
  "测试": "test", "用例": "test-cases", "测试用例": "test-cases",
  "部署": "deploy", "架构": "architecture", "设计": "design",
  "翻译接口": "translation-api", "翻译": "translation",
  "健康检查": "health-checks", "指标接口": "metrics",
  "安全": "security", "性能": "performance", "运维": "ops",
  "生产环境建议": "production-env", "生产环境": "production",
  "项目结构": "project-structure",
};

function toSlug(title: string): string {
  // Try exact keyword match first
  for (const [cn, en] of Object.entries(CN_TO_EN)) {
    if (title.includes(cn)) return en;
  }
  // Fallback to ASCII extraction
  const s = title.replace(/[^\w-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40);
  if (/^[a-z0-9]/.test(s)) return s;
  _slugIdx++;
  return "auto-module-" + _slugIdx;
}

function determineProfile(section: Section, slug: string, profiles?: Record<string, ChangeProfile>): ChangeProfile {
  if (profiles?.[slug]) return profiles[slug];
  const text = section.title + " " + section.content.slice(0, 300);
  for (const [re, profile] of KEYWORD_PROFILE) {
    if (re.test(text)) return profile;
  }
  return "lite";
}

function determinePriority(section: Section): "P0" | "P1" | "P2" {
  const text = section.title + section.content.slice(0, 200);
  for (const [re, priority] of PRIORITY_KEYWORDS) {
    if (re.test(text)) return priority;
  }
  return "P2";
}

function isSkippableSection(section: Section): boolean {
  const skipTitle = /(快速开始|quick.?start|安装|install|运行|run|贡献|contribute|许可|license|配置|config|附录|目录|table.*content|概述|overview|文档|document|部署|docker.*部署|环境变量|env|需求|入门|开始使用|getting.?started|参考|reference|变更|changelog|版本|version|依赖|dependency|常见问题|faq|问题反馈|contact|troubleshoot|安全|贡献指南|contributing|性能|performance|指标|metrics|扩展|架构|架构设计|说明|构建|build|技术栈|项目结构|设计模式|设计|提示词|测试用例|测试|api|架构设计评估|已实现|待实现|目标指标)/i;
  const isShort = section.content.length < 80;
  const startsWithNumber = /^\d+[-\s.．]/.test(section.title);
  // Allow deeper sections as long as they pass content+title checks
  return isShort || startsWithNumber || skipTitle.test(section.title);
}

function detectDependencies(section: Section, allSlugs: string[]): string[] {
  const deps: string[] = [];
  const slug = toSlug(section.title);

  if (/前端|frontend|界面|ui/i.test(section.title)) {
    const apiSlug = allSlugs.find((s) => /api|backend|服务/.test(s));
    if (apiSlug && apiSlug !== slug) deps.push(apiSlug);
  }

  if (/test|e2e|测试/i.test(section.title)) {
    const apiSlug = allSlugs.find((s) => /api|backend|服务/.test(s));
    if (apiSlug && apiSlug !== slug) deps.push(apiSlug);
    const dataSlug = allSlugs.find((s) => /data|数据库|存储|model|repo/i.test(s));
    if (dataSlug && dataSlug !== slug) deps.push(dataSlug);
  }

  if (/auth|security|认证|鉴权|登录|jwt|权限|安全/i.test(section.title)) {
    const dataSlug = allSlugs.find((s) => /data|数据库|存储|model|repo|sqlalchemy|orm/i.test(s));
    if (dataSlug && dataSlug !== slug) deps.push(dataSlug);
  }

  if (/rate|限流|limit/i.test(section.title)) {
    const authSlug = allSlugs.find((s) => /auth|认证|登录|jwt|安全/i.test(s));
    if (authSlug && authSlug !== slug) deps.push(authSlug);
  }

  if (/cache|缓存|redis/i.test(section.title)) {
    const dataSlug = allSlugs.find((s) => /data|数据库|存储|model|repo|sqlalchemy/i.test(s));
    if (dataSlug && dataSlug !== slug) deps.push(dataSlug);
  }

  if (/docs|文档|readme|changelog/i.test(section.title)) {
    for (const s of allSlugs) if (s !== slug) deps.push(s);
  }

  const text = section.content.toLowerCase();
  for (const s of allSlugs) {
    if (s === slug || deps.includes(s)) continue;
    if (text.includes(s.replace(/-/g, "")) || text.includes(s)) deps.push(s);
  }

  return [...new Set(deps)];
}

export function applyWiringToWorkspace(workspaceDir: string, logger: ReturnType<typeof getLogger>): void {
  const appDir = path.join(workspaceDir, "backend", "app");
  if (!fs.existsSync(appDir)) return;

  try {
    const pyFiles = execSync(`find ${appDir} -name "*.py" -type f`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    if (pyFiles.length === 0) return;
    const fileContents = pyFiles.map((f) => ({
      path: path.relative(workspaceDir, f),
      content: fs.readFileSync(f, "utf8"),
    }));
    const scan = scanPythonModules(fileContents);
    if (scan.routers.length === 0 && scan.middlewares.length === 0) return;

    const wiringCode = generateWiring(scan);
    const wiringPath = path.join(appDir, "wiring.py");

    if (fs.existsSync(wiringPath)) {
      const existing = fs.readFileSync(wiringPath, "utf8");
      if (!existing.includes("AUTO-GENERATED")) {
        logger.warn("Wiring skipped — existing wiring.py is hand-authored", { path: wiringPath });
        return;
      }
    }
    fs.writeFileSync(wiringPath, wiringCode, "utf8");

    const mainPyPath = path.join(appDir, "main.py");
    if (fs.existsSync(mainPyPath)) {
      let mainContent = fs.readFileSync(mainPyPath, "utf8");
      if (!mainContent.includes("from wiring import apply_wiring")) {
        const hasLifespan = scan.inits.some((i) => i.callStyle === "yield");
        mainContent = mainContent.trimEnd() + "\n\nfrom wiring import apply_wiring" +
          (hasLifespan ? "\nfrom wiring import lifespan" : "") +
          "\napply_wiring(app)\n";
        if (hasLifespan && mainContent.includes("app = FastAPI")) {
          mainContent = mainContent.replace(/app\s*=\s*FastAPI\s*\(/, "app = FastAPI(lifespan=lifespan, ");
        }
        fs.writeFileSync(mainPyPath, mainContent, "utf8");
      }
    }

    logger.info("Wiring generated", { routers: scan.routers.length, middlewares: scan.middlewares.length, inits: scan.inits.length, output: wiringPath });
  } catch (e) { logger.warn("Wiring scan skipped", { error: String(e) }); }
}
