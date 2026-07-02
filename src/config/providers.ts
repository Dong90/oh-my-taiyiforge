/**
 * ProviderRegistry — 引擎能力抽象层
 *
 * 引擎代码只问"谁管这个能力"，不问具体的 provider 名字。
 * Provider 由用户通过 .taiyi/providers.yaml 选择，
 * 未配置时使用内置默认值（保持当前 6 框架行为）。
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolvePackageRoot } from "../core/package-root.js";
import { commandExists } from "../install/third-party-deps.js";
import { syncTaiyiToOpenspec } from "../integrations/openspec-sync.js";

/* ------------------------------------------------------------------ */
/*  能力 ID                                                           */
/* ------------------------------------------------------------------ */

/** 引擎已知的所有能力。新增能力在此处注册。 */
export type CapabilityId =
  | "spec_archive"       // 归档变更记录到外部系统
  | "spec_sync"          // 同步工件到 spec 目录
  | "browser_qa"         // 浏览器交互测试
  | "eng_review"         // 工程评审
  | "design_review"      // 设计评审
  | "code_review"        // 代码变更审查
  | "doc_release"        // 发布文档同步
  | "version_release"    // 版本发布 / changelog
  | "sast_scan"          // 静态安全扫描
  | "vuln_scan"          // 依赖/文件系统漏洞扫描
  | "accessibility"      // 无障碍审查
  | "design_guidelines"  // Web 界面设计规范审查
  | "e2e_test"           // E2E 测试
  | "process_skills"     // 流程技能集（brainstorming/TDD 等）
  | "plugin_platform"    // IDE 插件注册
  | "archive_hook"       // 归档后 hook（自定义脚本）
  ;

/** assignment 来源 */
export type AssignmentSource = "builtin" | "plugin" | "project";

/* ------------------------------------------------------------------ */
/*  Provider 类型                                                     */
/* ------------------------------------------------------------------ */

export type ProviderType =
  | "cli"           // spawn 命令：openspec archive <slug>
  | "skill"         // 加载单个 SKILL.md：gstack/qa
  | "skill_bundle"  // 加载一组 skill：superpowers/*
  | "builtin"       // 引擎内置适配器：taiyi 自己的文件归档
  | "manual"        // 纯文字指引，用户手工操作
  | "none"          // 明确禁用该能力
  ;

/** Provider 运行时配置 */
export type ProviderConfig = {
  /** 提供者名称，如 openspec / gstack / superpowers */
  provider: string;
  /** 提供类型 */
  type: ProviderType;
  /** type=cli: spawn 的命令行模板。$SLUG 等变量会被替换 */
  cli?: string;
  /** type=skill: 单个 skill id */
  skill?: string;
  /** type=skill_bundle: skill 名前缀，如 superpowers */
  bundle?: string;
  /** type=builtin: 引擎内置适配器函数名 */
  adapter?: CapabilityId;
  /** type=manual: 指引文字 */
  instructions?: string;
  /** 自动检测命令（用于安装时判断是否可用） */
  detect?: string;
  /** 该 provider 提供的能力列表（反向查询用） */
  provides: CapabilityId[];
};

/* ------------------------------------------------------------------ */
/*  插件 provider 声明契约（package.json 中的 taiyi 字段）              */
/* ------------------------------------------------------------------ */

/** npm 插件中每个 provider 的定义 */
export type PluginProviderEntry = {
  name: string;
  type: ProviderType;
  cli?: string;
  skill?: string;
  bundle?: string;
  detect?: string;
  provides: CapabilityId[];
};

/** npm 插件 package.json 中的 taiyi 字段结构 */
export type TaiyiPluginManifest = {
  providers: PluginProviderEntry[];
};

/** provider.yaml 文件结构 */
export type ProvidersConfigFile = {
  version: number;
  /** 用户自定义 assignment：capability → provider 名字 */
  assignments?: Partial<Record<CapabilityId, string>>;
  /** 所有已知 provider 定义 */
  providers?: Record<string, ProviderConfig>;
  /** 引擎内置默认 assignments（用户不配时使用） */
  defaults?: Partial<Record<CapabilityId, string>>;
};

/* ------------------------------------------------------------------ */
/*  能力结果                                                          */
/* ------------------------------------------------------------------ */

export type CapabilityResult = {
  ok: boolean;
  skipped?: boolean;
  alreadyArchived?: boolean;
  reason?: string;
  /** type=cli 的 exit code */
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  /** 用于 spec_sync 等返回路径 */
  dest?: string;
  provider: string;
};

/** runCapability 的上下文参数 */
export type CapContext = {
  workspaceDir?: string;
  slug?: string;
  taiyiChangeDir?: string;
  /** 传给 CLI 的额外参数 */
  extraArgs?: string[];
  force?: boolean;
  /** spec_sync: 自动创建目标变更目录（默认 true） */
  createChangeDir?: boolean;
};

/* ------------------------------------------------------------------ */
/*  ProviderRegistry                                                  */
/* ------------------------------------------------------------------ */

const BUILTIN_PROJECT_CONFIG_PATHS = [
  ".taiyi/providers.yaml",
  ".taiyi/providers.yml",
];

/**
 * ProviderRegistry — 引擎唯一能力入口。
 *
 * 使用方式：
 *   const registry = ProviderRegistry.forProject(workspaceDir);
 *   const result = registry.runCapability("spec_archive", { slug, workspaceDir });
 */
export class ProviderRegistry {
  private assignments: Partial<Record<CapabilityId, string>>;
  private providers: Record<string, ProviderConfig>;
  private defaults: Partial<Record<CapabilityId, string>>;
  private source: Partial<Record<CapabilityId, AssignmentSource>>;
  private sourceDetail: Partial<Record<CapabilityId, string>>;

  private constructor(config: MergedConfig) {
    this.assignments = config.assignments;
    this.providers = config.providers;
    this.defaults = config.defaults;
    this.source = config.source;
    this.sourceDetail = config.sourceDetail;
    this.ensureDefaults();
  }

  /** 确保每个能力至少有一个 provider assignment（先用用户配的，再回退到 defaults） */
  private ensureDefaults(): void {
    for (const cap of ALL_CAPABILITIES) {
      if (!this.assignments[cap]) {
        const fallback = this.defaults[cap];
        if (fallback && this.providers[fallback]) {
          this.assignments[cap] = fallback;
        }
      }
    }
  }

  /** 获取某个能力分配的 provider，或空 */
  assignedProvider(cap: CapabilityId): string | undefined {
    return this.assignments[cap];
  }

  /* ---------------------------------------------------------------- */
  /*  工厂方法                                                         */
  /* ---------------------------------------------------------------- */

  /** 加载项目级配置（插件 + .taiyi/providers.yaml）合并内置默认。结果被缓存以避免重复扫描 node_modules。 */
  static forProject(workspaceDir?: string): ProviderRegistry {
    const key = path.resolve(workspaceDir ?? process.cwd());
    const cached = registryCache.get(key);
    if (cached) return cached;
    const merged = mergeConfigWithPlugins(
      loadBuiltinDefaults(),
      discoverPluginProviders(workspaceDir),
      loadProjectConfig(workspaceDir),
    );
    const registry = new ProviderRegistry(merged);
    registryCache.set(key, registry);
    return registry;
  }

  /** 只使用内置默认（无插件无项目配置） */
  static withDefaults(): ProviderRegistry {
    const merged = mergeConfigWithPlugins(loadBuiltinDefaults(), null, null);
    return new ProviderRegistry(merged);
  }

  /**
   * 用完整配置构造。
   * 注意：此方法跳过插件发现和项目配置文件加载。
   * 除非构造纯测试用例，否则应使用 forProject / forProjectFresh。
   */
  static fromConfig(config: ProvidersConfigFile): ProviderRegistry {
    const defaults: Partial<Record<CapabilityId, string>> = {};
    for (const [cap, provider] of Object.entries(config.defaults ?? {})) {
      defaults[cap as CapabilityId] = provider!;
    }
    const assignments: Partial<Record<CapabilityId, string>> = {};
    for (const [cap, provider] of Object.entries(config.assignments ?? {})) {
      if (provider) assignments[cap as CapabilityId] = provider;
    }
    const source: Partial<Record<CapabilityId, AssignmentSource>> = {};
    const sourceDetail: Partial<Record<CapabilityId, string>> = {};
    for (const cap of Object.keys(defaults)) {
      source[cap as CapabilityId] = "builtin";
      sourceDetail[cap as CapabilityId] = "fromConfig (test)";
    }
    for (const cap of Object.keys(assignments)) {
      source[cap as CapabilityId] = "project";
      sourceDetail[cap as CapabilityId] = "fromConfig (test)";
    }
    return new ProviderRegistry({
      assignments,
      providers: config.providers ?? {},
      defaults,
      source,
      sourceDetail,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  查询方法                                                         */
  /* ---------------------------------------------------------------- */

  /** 获取某个能力的 provider 配置 */
  getProviderForCapability(cap: CapabilityId): ProviderConfig | null {
    const name = this.assignments[cap];
    if (!name) return null;
    return this.providers[name] ?? null;
  }

  /** 列出所有能力当前的分配 */
  listAssignments(): Partial<Record<CapabilityId, string>> {
    return { ...this.assignments };
  }

  /** 列出所有已知 provider */
  listProviders(): Record<string, ProviderConfig> {
    return { ...this.providers };
  }

  /**
   * 获取某个能力 assignment 的完整来源信息。
   * 返回 provider、来源层级（builtin/plugin/project）和来源详情。
   */
  getCapabilityOrigin(cap: CapabilityId): {
    provider: string | null;
    type: ProviderType | null;
    source: AssignmentSource | null;
    sourceDetail: string | null;
  } {
    const provider = this.getProviderForCapability(cap);
    return {
      provider: provider?.provider ?? null,
      type: provider?.type ?? null,
      source: this.source[cap] ?? null,
      sourceDetail: this.sourceDetail[cap] ?? null,
    };
  }

  /** 检测某个能力是否可用（provider 存在 + 命令可执行） */
  hasCapability(cap: CapabilityId): boolean {
    const provider = this.getProviderForCapability(cap);
    if (!provider) return false;
    if (provider.type === "none") return false;
    if (provider.type === "builtin") return true;
    if (provider.detect) {
      const proc = spawnSync("sh", ["-c", provider.detect], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return proc.status === 0;
    }
    // skill/manual 类总是被认为可用（用户安装了 skill 即可）
    return true;
  }

  /* ---------------------------------------------------------------- */
  /*  执行方法                                                         */
  /* ---------------------------------------------------------------- */

  /**
   * 执行某个能力。引擎调用方不需要知道底层是 CLI / skill / builtin。
   *
   * @example
   *   const result = registry.runCapability("spec_archive", {
   *     slug, workspaceDir, skipSpecs: true
   *   });
   */
  runCapability(cap: CapabilityId, ctx: CapContext = {}): CapabilityResult {
    const provider = this.getProviderForCapability(cap);
    if (!provider) {
      return { ok: false, provider: "unknown", reason: `能力 "${cap}" 未分配 provider` };
    }

    switch (provider.type) {
      case "none":
        return { ok: true, skipped: true, provider: provider.provider, reason: "已禁用" };
      case "builtin":
        return this.runBuiltin(cap, provider, ctx);
      case "cli":
        return this.runCli(cap, provider, ctx);
      case "manual":
        return {
          ok: true,
          skipped: true,
          provider: provider.provider,
          reason: provider.instructions ?? "请手工操作",
        };
      case "skill":
      case "skill_bundle":
        return {
          ok: true,
          skipped: true,
          provider: provider.provider,
          reason: `加载 skill：${provider.skill ?? provider.bundle ?? provider.provider}`,
        };
      default:
        return { ok: false, provider: provider.provider, reason: `未知 provider 类型` };
    }
  }

  private runBuiltin(cap: CapabilityId, provider: ProviderConfig, ctx: CapContext): CapabilityResult {
    switch (cap) {
      case "spec_archive":
        return builtinSpecArchive(ctx);
      case "spec_sync":
        return runBuiltinSpecSync(ctx);
      case "plugin_platform":
        return { ok: true, skipped: true, provider: provider.provider, reason: "内置插件注册（opencode.json）" };
      default:
        return { ok: true, skipped: true, provider: provider.provider, reason: `内置能力：${cap}` };
    }
  }

  private runCli(cap: CapabilityId, provider: ProviderConfig, ctx: CapContext): CapabilityResult {
    if (!provider.cli) {
      return { ok: false, provider: provider.provider, reason: "CLI provider 缺少 command 定义" };
    }

    let cmd = provider.cli
      .replace(/\$SLUG/g, ctx.slug ?? "")
      .replace(/\$WORKSPACE/g, ctx.workspaceDir ?? "")
      .replace(/\$TAIYI_CHANGE_DIR/g, ctx.taiyiChangeDir ?? "");

    // 附加额外参数
    if (ctx.extraArgs?.length) {
      cmd += " " + ctx.extraArgs.join(" ");
    }

    const proc = spawnSync("sh", ["-c", cmd], {
      cwd: ctx.workspaceDir ? path.resolve(ctx.workspaceDir) : undefined,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });

    if (proc.error) {
      return { ok: false, provider: provider.provider, reason: proc.error.message };
    }

    const combined = `${proc.stderr ?? ""}\n${proc.stdout ?? ""}`;
    let alreadyArchived: boolean | undefined;
    if (proc.status !== 0 && /already exists|already archived/i.test(combined)) {
      alreadyArchived = true;
    }

    return {
      ok: proc.status === 0 || alreadyArchived === true,
      alreadyArchived,
      exitCode: proc.status ?? undefined,
      stdout: proc.stdout?.trim(),
      stderr: proc.stderr?.trim(),
      provider: provider.provider,
      reason: proc.status !== 0
        ? (proc.stderr || proc.stdout || `exit ${proc.status}`)
        : undefined,
    };
  }

  /** 忽略缓存，强制重新加载配置（测试 / CI 使用） */
  static forProjectFresh(workspaceDir?: string): ProviderRegistry {
    const key = path.resolve(workspaceDir ?? process.cwd());
    registryCache.delete(key);
    return ProviderRegistry.forProject(workspaceDir);
  }
}

/* ------------------------------------------------------------------ */
/*  内置适配器                                                         */
/* ------------------------------------------------------------------ */

/** 无 OpenSpec 时的内置归档：移动 .taiyi/changes/<slug>/ → .taiyi/archive/<slug>/ */
function builtinSpecArchive(ctx: CapContext): CapabilityResult {
  if (!ctx.slug || !ctx.workspaceDir) {
    return { ok: false, provider: "taiyi-builtin", reason: "缺少 slug 或 workspaceDir" };
  }
  const taiyiRoot = path.join(path.resolve(ctx.workspaceDir), ".taiyi");
  const src = path.join(taiyiRoot, "changes", ctx.slug);
  const archiveRoot = path.join(taiyiRoot, "archive");

  if (!fs.existsSync(src)) {
    return { ok: false, provider: "taiyi-builtin", reason: `变更目录不存在: ${src}` };
  }

  const existing = findExistingArchiveDir(taiyiRoot, ctx.slug);
  if (existing) {
    return { ok: true, alreadyArchived: true, provider: "taiyi-builtin", dest: existing, reason: "已在 .taiyi/archive/（幂等）" };
  }

  fs.mkdirSync(archiveRoot, { recursive: true });
  const dest = path.join(archiveRoot, ctx.slug);
  fs.renameSync(src, dest);

  const relPath = path.relative(taiyiRoot, dest);
  const manifest = {
    slug: ctx.slug,
    archivedAt: new Date().toISOString(),
    path: relPath.startsWith("..") ? dest : relPath,
  };
  fs.writeFileSync(path.join(dest, ".taiyi-archive.json"), JSON.stringify(manifest, null, 2) + "\n");

  return { ok: true, provider: "taiyi-builtin", dest };
}

/** 无 OpenSpec 时的内置同步：复制到 .taiyi/artifacts/<slug>/ */
function builtinSpecSync(ctx: CapContext): CapabilityResult {
  if (!ctx.slug || !ctx.workspaceDir || !ctx.taiyiChangeDir) {
    return { ok: false, provider: "taiyi-builtin", reason: "缺少上下文" };
  }
  const destRoot = path.join(path.resolve(ctx.workspaceDir), ".taiyi", "artifacts", ctx.slug);
  fs.mkdirSync(destRoot, { recursive: true });

  const copied: string[] = [];
  if (fs.existsSync(ctx.taiyiChangeDir)) {
    for (const file of fs.readdirSync(ctx.taiyiChangeDir)) {
      if (!file.endsWith(".md")) continue;
      const srcFile = path.join(ctx.taiyiChangeDir, file);
      if (!fs.statSync(srcFile).isFile()) continue;
      fs.copyFileSync(srcFile, path.join(destRoot, file));
      copied.push(file);
    }
  }

  return {
    ok: true,
    provider: "taiyi-builtin",
    dest: destRoot,
    reason: copied.length ? `内置归档: ${copied.join(", ")}` : "无工件可同步",
  };
}

/** 内置 spec_sync：优先检测 openspec CLI，若可用则委托 openspec-sync；否则回退到 artifacts 目录复制 */
function runBuiltinSpecSync(ctx: CapContext): CapabilityResult {
  if (!ctx.slug || !ctx.workspaceDir || !ctx.taiyiChangeDir) {
    return { ok: false, provider: "taiyi-builtin", reason: "缺少上下文" };
  }

  if (commandExists("openspec")) {
    const result = syncTaiyiToOpenspec(
      ctx.workspaceDir,
      ctx.slug,
      ctx.taiyiChangeDir,
      { force: ctx.force, createChangeDir: ctx.createChangeDir ?? true },
    );
    if (result.ok) {
      return {
        ok: true,
        provider: "taiyi-builtin",
        dest: result.changePath ?? undefined,
        reason: result.copied.length
          ? `同步到 OpenSpec: ${result.copied.join(", ")}`
          : "OpenSpec 无变更",
      };
    }
    if (result.skipped) {
      return { ok: true, skipped: true, provider: "taiyi-builtin", reason: result.reason ?? "OpenSpec sync skipped" };
    }
    return { ok: false, provider: "taiyi-builtin", reason: result.reason ?? "OpenSpec sync failed" };
  }

  return builtinSpecSync(ctx);
}

function findExistingArchiveDir(taiyiRoot: string, slug: string): string | null {
  const archiveRoot = path.join(taiyiRoot, "archive");
  if (!fs.existsSync(archiveRoot)) return null;
  const direct = path.join(archiveRoot, slug);
  if (fs.existsSync(direct) && fs.existsSync(path.join(direct, "state.json"))) return direct;
  for (const ent of fs.readdirSync(archiveRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const candidate = path.join(archiveRoot, ent.name);
    if (!fs.existsSync(path.join(candidate, "state.json"))) continue;
    if (ent.name === slug || ent.name.endsWith(`-${slug}`)) return candidate;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  配置加载                                                          */
/* ------------------------------------------------------------------ */

const ALL_CAPABILITIES: CapabilityId[] = [
  "spec_archive",
  "spec_sync",
  "browser_qa",
  "eng_review",
  "design_review",
  "code_review",
  "doc_release",
  "version_release",
  "sast_scan",
  "vuln_scan",
  "accessibility",
  "design_guidelines",
  "e2e_test",
  "process_skills",
  "plugin_platform",
  "archive_hook",
];

/** 内置默认 provider 定义（保持当前 6 框架行为） */
function defaultProviders(): Record<string, ProviderConfig> {
  return {
    "openspec": {
      provider: "openspec",
      type: "cli",
      cli: "openspec archive $SLUG -y",
      detect: "which openspec",
      provides: ["spec_archive"],
    },
    "gstack": {
      provider: "gstack",
      type: "skill_bundle",
      bundle: "gstack",
      provides: ["browser_qa", "eng_review", "design_review", "code_review", "doc_release"],
    },
    "superpowers": {
      provider: "superpowers",
      type: "skill_bundle",
      bundle: "superpowers",
      provides: ["process_skills"],
    },
    "web-quality": {
      provider: "web-quality",
      type: "skill_bundle",
      bundle: "web-quality",
      provides: ["accessibility", "design_guidelines"],
    },
    "playwright": {
      provider: "playwright",
      type: "cli",
      cli: "npx playwright test",
      detect: "npx playwright --version 2>/dev/null || npx playwright --version 2>/dev/null",
      provides: ["browser_qa", "e2e_test"],
    },
    "semgrep": {
      provider: "semgrep",
      type: "cli",
      cli: "semgrep scan --config auto",
      detect: "which semgrep",
      provides: ["sast_scan"],
    },
    "trivy": {
      provider: "trivy",
      type: "cli",
      cli: "trivy fs .",
      detect: "which trivy",
      provides: ["vuln_scan"],
    },
    "changesets": {
      provider: "changesets",
      type: "cli",
      cli: "npx changeset version",
      detect: "npx changeset --version 2>/dev/null || test -f node_modules/.bin/changeset",
      provides: ["version_release"],
    },
    "taiyi-builtin": {
      provider: "taiyi-builtin",
      type: "builtin",
      provides: ["spec_archive", "spec_sync", "archive_hook"],
    },
    "omc-plugin": {
      provider: "omc-plugin",
      type: "builtin",
      provides: ["plugin_platform"],
    },
  };
}

/** 内置 provider 名称 —— 插件不得覆盖 */
const BUILTIN_PROVIDER_NAMES = new Set([
  "openspec", "gstack", "superpowers", "web-quality",
  "playwright", "semgrep", "trivy", "changesets",
  "taiyi-builtin", "omc-plugin",
]);

/** Module-level registry 缓存（避免每阶段重复扫描 node_modules） */
const registryCache = new Map<string, ProviderRegistry>();

type MergedConfig = {
  assignments: Partial<Record<CapabilityId, string>>;
  providers: Record<string, ProviderConfig>;
  defaults: Partial<Record<CapabilityId, string>>;
  /** 每个能力 assignment 的来源层级 */
  source: Partial<Record<CapabilityId, AssignmentSource>>;
  /** 来源详情：插件包名 / 配置文件路径等 */
  sourceDetail: Partial<Record<CapabilityId, string>>;
};

/**
 * Scans node_modules/ (including monorepo parent-chain) for packages
 * declaring a 'taiyi.providers' field in their package.json, filtered
 * by the 'taiyi-provider' keyword or 'taiyi-provider-' name prefix.
 *
 * Each discovered provider is registered and its 'provides' list
 * becomes implicit default capability assignments.
 *
 * Naming rules:
 * - Builtin names (openspec, gstack, etc.) cannot be overridden.
 * - Duplicate provider names in plugins: last wins (later overrides earlier).
 *   Users control priority via plugin install order or project providers.yaml.
 */
export function discoverPluginProviders(workspaceDir?: string): ProvidersConfigFile | null {
  if (!workspaceDir) return null;

  const nodeModulesDirs = collectPluginNodeModulesDirs(workspaceDir);
  if (nodeModulesDirs.length === 0) return null;

  const result: ProvidersConfigFile = { version: 1 };
  let updated = false;

  for (const nmDir of nodeModulesDirs) {
    const entries = fs.readdirSync(nmDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      for (const pkgDir of collectPkgDirs(nmDir, entry)) {
        if (scanOnePluginPkg(pkgDir, result)) updated = true;
      }
    }
  }

  return updated ? result : null;
}

/** Expand a node_modules entry into candidate package.json directories (handles @scoped) */
function collectPkgDirs(parent: string, entry: fs.Dirent): string[] {
  if (!entry.name.startsWith("@")) return [path.join(parent, entry.name)];
  const scopeDir = path.join(parent, entry.name);
  try {
    return fs.readdirSync(scopeDir, { withFileTypes: true })
      .filter((s) => s.isDirectory())
      .map((s) => path.join(scopeDir, s.name));
  } catch { return []; }
}

/** Collect node_modules dirs: project-local + up to 3 parent levels for monorepo root. */
function collectPluginNodeModulesDirs(workspaceDir: string): string[] {
  const dirs: string[] = [];
  const resolved = path.resolve(workspaceDir);

  const own = path.join(resolved, "node_modules");
  if (fs.existsSync(own)) dirs.push(own);

  let current = path.dirname(resolved);
  let levels = 0;
  while (current !== path.dirname(current) && levels < 3) {
    const parentNm = path.join(current, "node_modules");
    if (fs.existsSync(parentNm) && !dirs.some((d) => d === parentNm)) {
      dirs.push(parentNm);
    }
    current = path.dirname(current);
    levels++;
  }

  return dirs;
}

/** Scan a single package for taiyi.providers and register found providers.
 *  Last‑wins naming: later packages with the same provider name override
 *  earlier ones. Users can control priority via plugin install order or
 *  by overriding in .taiyi/providers.yaml (which takes final precedence). */
function scanOnePluginPkg(
  pkgDir: string,
  result: ProvidersConfigFile,
): boolean {
  const pkgJsonPath = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return false;

  let pkgJson: Record<string, unknown>;
  try {
    pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as Record<string, unknown>;
  } catch {
    return false;  // malformed, skip silently
  }

  const manifest = pkgJson.taiyi as TaiyiPluginManifest | undefined;
  if (!manifest?.providers?.length) return false;

  const pkgName = (pkgJson.name as string) ?? path.basename(pkgDir);

  // Keyword / name‑prefix fast‑filter: plugin must opt in
  const keywords = (pkgJson.keywords as string[]) ?? [];
  if (!keywords.includes("taiyi-provider") && !pkgName.startsWith("taiyi-provider-")) {
    console.debug(
      `[taiyi-provider] 跳过 ${pkgName}：缺少 "taiyi-provider" keyword ` +
      `（package.json#keywords 或包名前缀 taiyi-provider-）`,
    );
    return false;
  }

  let anyRegistered = false;

  for (const pluginProvider of manifest.providers) {
    // Block builtin name hijacking
    if (BUILTIN_PROVIDER_NAMES.has(pluginProvider.name)) {
      console.debug(
        `[taiyi-provider] 跳过 ${pkgName} 的 provider "${pluginProvider.name}"：` +
        `该名称由内置 provider 保留`,
      );
      continue;
    }

    // Last‑wins: later plugin registrations overwrite earlier ones.
    // The mergeConfigWithPlugins step (builtin→plugins→project) ensures
    // project config always has final say.
    result.providers ??= {};
    result.providers[pluginProvider.name] = {
      provider: pluginProvider.name,
      type: pluginProvider.type,
      cli: pluginProvider.cli,
      skill: pluginProvider.skill,
      bundle: pluginProvider.bundle,
      detect: pluginProvider.detect,
      provides: pluginProvider.provides,
    };

    for (const cap of pluginProvider.provides) {
      result.defaults ??= {};
      result.defaults[cap] = pluginProvider.name;
    }

    anyRegistered = true;
  }

  return anyRegistered;
}

/** 三层合并：builtin → plugins → project（后层覆盖前层） */
function mergeConfigWithPlugins(
  builtin: ProvidersConfigFile,
  plugins: ProvidersConfigFile | null,
  project: ProvidersConfigFile | null,
): MergedConfig {
  const providers = { ...defaultProviders() };

  if (plugins?.providers) Object.assign(providers, plugins.providers);
  if (project?.providers) Object.assign(providers, project.providers);

  const defaults: Partial<Record<CapabilityId, string>> = {
    ...(builtin.defaults ?? {}) as Record<CapabilityId, string>,
  };
  if (plugins?.defaults) Object.assign(defaults, plugins.defaults);
  if (project?.defaults) Object.assign(defaults, project.defaults);

  const source: Partial<Record<CapabilityId, AssignmentSource>> = {};
  const sourceDetail: Partial<Record<CapabilityId, string>> = {};

  // 层 1：内置默认
  if (builtin.defaults) {
    for (const cap of Object.keys(builtin.defaults)) {
      source[cap as CapabilityId] = "builtin";
      sourceDetail[cap as CapabilityId] = "builtin defaults";
    }
  }

  // 层 2：插件自动发现（覆盖内置）
  if (plugins?.defaults) {
    for (const cap of Object.keys(plugins.defaults)) {
      source[cap as CapabilityId] = "plugin";
      sourceDetail[cap as CapabilityId] = `plugin auto: ${plugins.defaults[cap as CapabilityId]}`;
    }
  }

  // 层 3：项目配置 defaults（覆盖插件和内置的回退默认值）
  if (project?.defaults) {
    for (const cap of Object.keys(project.defaults)) {
      source[cap as CapabilityId] = "project";
      sourceDetail[cap as CapabilityId] = ".taiyi/providers.yaml";
    }
  }

  // 层 4：项目配置 assignments（覆盖一切）
  if (project?.assignments) {
    for (const cap of Object.keys(project.assignments)) {
      source[cap as CapabilityId] = "project";
      sourceDetail[cap as CapabilityId] = ".taiyi/providers.yaml";
    }
  }

  // runCapability 用的最终 assignment 表：先拿项目赋值，再回退到 defaults
  const assignments: Partial<Record<CapabilityId, string>> = {};
  if (project?.assignments) Object.assign(assignments, project.assignments);

  return { assignments, providers, defaults, source, sourceDetail };
}

const BUILTIN_DEFAULTS_YAML = `
version: 1
defaults:
  spec_archive: openspec
  spec_sync: taiyi-builtin
  browser_qa: gstack
  eng_review: gstack
  design_review: gstack
  code_review: gstack
  doc_release: gstack
  version_release: changesets
  sast_scan: semgrep
  vuln_scan: trivy
  accessibility: web-quality
  design_guidelines: web-quality
  e2e_test: playwright
  process_skills: superpowers
  plugin_platform: omc-plugin
  archive_hook: taiyi-builtin
`;

/** 从 worktree 中的内置文件加载默认配置 */
function loadBuiltinDefaults(): ProvidersConfigFile {
  // tags 中的 YAML 是内置默认
  const lines = BUILTIN_DEFAULTS_YAML.trim().split("\n");
  return parseSimpleYaml(lines);
}

/** 从项目目录加载 .taiyi/providers.yaml */
function loadProjectConfig(workspaceDir?: string): ProvidersConfigFile | null {
  if (!workspaceDir) return null;

  for (const rel of BUILTIN_PROJECT_CONFIG_PATHS) {
    const file = path.join(path.resolve(workspaceDir), rel);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      const lines = raw.split("\n");
      return parseSimpleYaml(lines);
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  简易 YAML 解析器（无第三方依赖）                                   */
/* ------------------------------------------------------------------ */

function parseSimpleYaml(lines: string[]): ProvidersConfigFile {
  const result: ProvidersConfigFile = { version: 1 };
  let section: "assignments" | "providers" | "defaults" | null = null;
  let currentProvider: string | null = null;

  for (const line of lines) {
    if (line.startsWith("version:")) {
      result.version = Number(line.split(":")[1]?.trim() ?? 1);
      continue;
    }
    if (line === "assignments:") { section = "assignments"; continue; }
    if (line === "defaults:") { section = "defaults"; continue; }
    if (line === "providers:") { section = "providers"; currentProvider = null; continue; }

    if (section === "assignments" || section === "defaults") {
      const m = line.match(/^\s{2}(\S+):\s*(.*)$/);
      if (m) {
        const target = section === "assignments"
          ? (result.assignments ??= {} as Record<CapabilityId, string>)
          : (result.defaults ??= {} as Record<CapabilityId, string>);
        target[m[1] as CapabilityId] = m[2] || "";
      }
    }

    if (section === "providers") {
      const provMatch = line.match(/^\s{2}(\S+):$/);
      if (provMatch) {
        currentProvider = provMatch[1];
        result.providers ??= {};
        result.providers[currentProvider] = { type: "manual", provider: currentProvider, provides: [] };
        continue;
      }
      if (currentProvider) {
        const kv = line.match(/^\s{4}(\S+):\s*(.*)$/);
        if (kv) {
          const p = result.providers![currentProvider]!;
          const key = kv[1] as keyof ProviderConfig;
          const val = kv[2];
          if (key === "type") (p as Record<string, unknown>).type = val as ProviderType;
          else if (key === "cli") p.cli = val;
          else if (key === "skill") p.skill = val;
          else if (key === "bundle") p.bundle = val;
          else if (key === "detect") p.detect = val;
          else if (key === "adapter") p.adapter = val as CapabilityId;
          else if (key === "instructions") p.instructions = val;
          else if (key === "provides") {
            p.provides = val.split(",").map(s => s.trim().replace(/[[\]\s]/g, "")) as CapabilityId[];
          }
        }
      }
    }
  }

  return result;
}
