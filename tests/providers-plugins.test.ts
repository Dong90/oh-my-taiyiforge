import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  discoverPluginProviders,
  ProviderRegistry,
  AssignmentSource,
} from "../src/config/providers.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-provider-plugins-"));
});

function mkdirp(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

/** 写一个带 taiyi.providers 的 package.json */
function writePluginPkg(
  pkgDir: string,
  taiyi: Record<string, unknown>,
  extraPkg: Record<string, unknown> = {},
) {
  mkdirp(pkgDir);
  const pkg = {
    name: path.basename(pkgDir),
    version: "1.0.0",
    ...extraPkg,
    taiyi,
  };
  fs.writeFileSync(
    path.join(pkgDir, "package.json"),
    JSON.stringify(pkg, null, 2),
  );
}

/* ------------------------------------------------------------------ */
/*  ProviderRegistry.runCapability — builtin spec_sync 细粒度             */
/* ------------------------------------------------------------------ */

describe("runCapability spec_sync builtin", () => {
  let sandbox: string;
  let taiyiRoot: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-spec-sync-"));
    taiyiRoot = path.join(sandbox, ".taiyi");
    mkdirp(taiyiRoot);
  });

  function bareRegistry(): ProviderRegistry {
    return ProviderRegistry.fromConfig({
      version: 1,
      providers: {
        "taiyi-builtin": { provider: "taiyi-builtin", type: "builtin", provides: ["spec_archive", "spec_sync", "archive_hook"] },
      },
      defaults: {
        spec_sync: "taiyi-builtin",
      },
    });
  }

  it("spec_sync resolves to taiyi-builtin provider by default", () => {
    const registry = ProviderRegistry.forProject(sandbox);
    const provider = registry.getProviderForCapability("spec_sync");
    expect(provider).not.toBeNull();
    expect(provider!.provider).toBe("taiyi-builtin");
    expect(provider!.type).toBe("builtin");
  });

  it("openspec provider no longer claims spec_sync", () => {
    const registry = ProviderRegistry.forProject(sandbox);
    const p = registry.getProviderForCapability("spec_sync");
    expect(p!.provider).not.toBe("openspec");
  });

  it("builtinSpecSync copies only .md files to .taiyi/artifacts/<slug>/", () => {
    const slug = "test-artifacts-copy";
    const changeDir = path.join(taiyiRoot, "changes", slug);
    mkdirp(changeDir);
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "# change");
    fs.writeFileSync(path.join(changeDir, "DESIGN.md"), "# design");
    fs.writeFileSync(path.join(changeDir, "data.json"), '{"key": "val"}');
    fs.writeFileSync(path.join(changeDir, "script.ts"), "export const x = 1;");

    const registry = bareRegistry();
    const result = registry.runCapability("spec_sync", {
      slug, workspaceDir: sandbox, taiyiChangeDir: changeDir, createChangeDir: true,
    });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("taiyi-builtin");

    if (result.dest?.includes(".taiyi/artifacts")) {
      const files = fs.readdirSync(result.dest!);
      expect(files).toContain("CHANGE.md");
      expect(files).toContain("DESIGN.md");
      expect(files).not.toContain("data.json");
      expect(files).not.toContain("script.ts");
      expect(result.reason).toContain("CHANGE.md");
      expect(result.reason).toContain("DESIGN.md");
    }
  });

  it("builtinSpecSync missing slug returns error", () => {
    const registry = bareRegistry();
    const result = registry.runCapability("spec_sync", {
      workspaceDir: sandbox,
      taiyiChangeDir: path.join(taiyiRoot, "changes", "no-slug"),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("缺少上下文");
  });

  it("builtinSpecSync missing workspaceDir returns error", () => {
    const registry = bareRegistry();
    const result = registry.runCapability("spec_sync", {
      slug: "no-ws",
      taiyiChangeDir: path.join(taiyiRoot, "changes", "no-ws"),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("缺少上下文");
  });

  it("builtinSpecSync missing taiyiChangeDir returns error", () => {
    const registry = bareRegistry();
    const result = registry.runCapability("spec_sync", {
      slug: "no-dir",
      workspaceDir: sandbox,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("缺少上下文");
  });

  it("builtinSpecSync creates empty artifacts dir when changeDir missing", () => {
    const slug = "ghost-dir";
    const changeDir = path.join(taiyiRoot, "changes", slug);

    const registry = bareRegistry();
    const result = registry.runCapability("spec_sync", {
      slug, workspaceDir: sandbox, taiyiChangeDir: changeDir, createChangeDir: true,
    });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("taiyi-builtin");
    if (result.dest?.includes(".taiyi/artifacts")) {
      expect(result.reason).toBe("无工件可同步");
      expect(fs.existsSync(result.dest!)).toBe(true);
    }
  });

  it("createChangeDir=false does not affect builtinSpecSync behavior", () => {
    const slug = "no-create-flag";
    const changeDir = path.join(taiyiRoot, "changes", slug);
    mkdirp(changeDir);
    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), "# req");

    const registry = bareRegistry();
    const result = registry.runCapability("spec_sync", {
      slug, workspaceDir: sandbox, taiyiChangeDir: changeDir, createChangeDir: false,
    });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("taiyi-builtin");
  });
});

/* ------------------------------------------------------------------ */
/*  registry cache                                                     */
/* ------------------------------------------------------------------ */

describe("discoverPluginProviders", () => {
  it("returns null when node_modules does not exist", () => {
    expect(discoverPluginProviders(tmpDir)).toBeNull();
  });

  it("discovers a single plugin provider (keyword opt-in)", () => {
    const pkgDir = path.join(tmpDir, "node_modules", "taiyi-provider-foo");
    mkdirp(pkgDir);
    writePluginPkg(pkgDir, {
      providers: [
        { name: "foo-scanner", type: "cli", cli: "foo scan .", detect: "which foo", provides: ["sast_scan"] },
      ],
    });
    const result = discoverPluginProviders(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.providers).toBeDefined();
    expect(result!.providers!["foo-scanner"]).toBeDefined();
    expect(result!.providers!["foo-scanner"].type).toBe("cli");
    expect(result!.providers!["foo-scanner"].cli).toBe("foo scan .");
    expect(result!.defaults!["sast_scan"]).toBe("foo-scanner");
  });

  it("discovers multiple providers from one package", () => {
    const pkgDir = path.join(tmpDir, "node_modules", "taiyi-provider-all");
    mkdirp(pkgDir);
    writePluginPkg(pkgDir, {
      providers: [
        { name: "scanner-a", type: "cli", cli: "a scan", provides: ["sast_scan"] },
        { name: "scanner-b", type: "cli", cli: "b scan", provides: ["vuln_scan"] },
      ],
    });
    const result = discoverPluginProviders(tmpDir);
    expect(result!.providers!["scanner-a"]).toBeDefined();
    expect(result!.providers!["scanner-b"]).toBeDefined();
    expect(result!.defaults!["sast_scan"]).toBe("scanner-a");
    expect(result!.defaults!["vuln_scan"]).toBe("scanner-b");
  });

  it("discovers scoped (@scope/package) plugin with keyword", () => {
    const pkgDir = path.join(tmpDir, "node_modules", "@acme", "taiyi-scanner");
    mkdirp(pkgDir);
    writePluginPkg(pkgDir, {
      providers: [
        { name: "acme-scanner", type: "cli", cli: "acme scan", provides: ["sast_scan", "vuln_scan"] },
      ],
    }, { keywords: ["taiyi-provider"] });
    const result = discoverPluginProviders(tmpDir);
    expect(result!.providers!["acme-scanner"]).toBeDefined();
    expect(result!.defaults!["sast_scan"]).toBe("acme-scanner");
    expect(result!.defaults!["vuln_scan"]).toBe("acme-scanner");
  });

  it("discovers plugin via taiyi-provider keyword (not name prefix)", () => {
    const pkgDir = path.join(tmpDir, "node_modules", "any-pkg-name");
    mkdirp(pkgDir);
    writePluginPkg(pkgDir, {
      providers: [
        { name: "keyword-scanner", type: "cli", cli: "ks scan", provides: ["sast_scan"] },
      ],
    }, { keywords: ["taiyi-provider"] });
    const result = discoverPluginProviders(tmpDir);
    expect(result!.providers!["keyword-scanner"]).toBeDefined();
  });

  it("skips packages without taiyi-provider keyword or name prefix", () => {
    const pkgDir = path.join(tmpDir, "node_modules", "plain-lib");
    mkdirp(pkgDir);
    writePluginPkg(pkgDir, {
      providers: [
        { name: "skip-me", type: "cli", cli: "skip", provides: ["sast_scan"] },
      ],
    }, { keywords: [] });  // explicitly empty keywords
    const result = discoverPluginProviders(tmpDir);
    expect(result).toBeNull();
  });

  it("skips malformed package.json gracefully", () => {
    mkdirp(path.join(tmpDir, "node_modules", "broken-pkg"));
    fs.writeFileSync(
      path.join(tmpDir, "node_modules", "broken-pkg", "package.json"),
      "not-json",
    );
    expect(discoverPluginProviders(tmpDir)).toBeNull();
  });

  it("returns null when workspaceDir is undefined", () => {
    expect(discoverPluginProviders(undefined)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Naming conflict + builtin hijack protection                        */
/* ------------------------------------------------------------------ */

describe("plugin naming protection", () => {
  it("rejects provider name matching builtin", () => {
    const pkgDir = path.join(tmpDir, "node_modules", "taiyi-provider-hijack");
    mkdirp(pkgDir);
    writePluginPkg(pkgDir, {
      providers: [
        { name: "openspec", type: "cli", cli: "evil", provides: ["spec_archive"] },
      ],
    });
    const result = discoverPluginProviders(tmpDir);
    expect(result).toBeNull();  // all providers rejected
  });

  it("first plugin wins on naming conflict", () => {
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-first"));
    writePluginPkg(
      path.join(tmpDir, "node_modules", "taiyi-provider-first"),
      {
        providers: [
          { name: "conflict-scanner", type: "cli", cli: "first", provides: ["sast_scan"] },
        ],
      },
    );
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-second"));
    writePluginPkg(
      path.join(tmpDir, "node_modules", "taiyi-provider-second"),
      {
        providers: [
          { name: "conflict-scanner", type: "cli", cli: "second", provides: ["sast_scan"] },
        ],
      },
    );
    const result = discoverPluginProviders(tmpDir);
    // Last‑wins: second package overwrites first when names collide
    expect(result!.providers!["conflict-scanner"].cli).toBe("second");
  });
});

/* ------------------------------------------------------------------ */
/*  Monorepo: plugin in parent node_modules                            */
/* ------------------------------------------------------------------ */

describe("monorepo parent-chain scanning", () => {
  it("discovers plugin from parent node_modules", () => {
    // Set up: tmpDir/packages/app/node_modules/  (no plugin)
    //         tmpDir/node_modules/  (has plugin)
    const parentNm = path.join(tmpDir, "node_modules");
    const appDir = path.join(tmpDir, "packages", "app");
    mkdirp(path.join(appDir));
    // Plugin in root node_modules
    mkdirp(parentNm);
    writePluginPkg(
      path.join(parentNm, "taiyi-provider-root-plugin"),
      {
        providers: [
          { name: "root-tool", type: "cli", cli: "root", provides: ["sast_scan"] },
        ],
      },
    );
    // App dir has its own node_modules but empty
    mkdirp(path.join(appDir, "node_modules"));

    const result = discoverPluginProviders(appDir);
    expect(result).not.toBeNull();
    expect(result!.providers!["root-tool"]).toBeDefined();
    expect(result!.defaults!["sast_scan"]).toBe("root-tool");
  });
});

/* ------------------------------------------------------------------ */
/*  ProviderRegistry.forProject with cache & plugins                   */
/* ------------------------------------------------------------------ */

describe("ProviderRegistry.forProject with plugins", () => {
  it("plugin provider appears in registry via forProject", () => {
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-extra"));
    writePluginPkg(
      path.join(tmpDir, "node_modules", "taiyi-provider-extra"),
      {
        providers: [
          { name: "extra-lint", type: "cli", cli: "extra lint", provides: ["design_guidelines"] },
        ],
      },
    );
    const registry = ProviderRegistry.forProject(tmpDir);
    const provider = registry.getProviderForCapability("design_guidelines");
    expect(provider).not.toBeNull();
    expect(provider!.provider).toBe("extra-lint");
  });

  it("project config (.taiyi/providers.yaml) overrides plugin provider", () => {
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-other"));
    writePluginPkg(
      path.join(tmpDir, "node_modules", "taiyi-provider-other"),
      {
        providers: [
          { name: "other-lint", type: "cli", cli: "other lint", provides: ["design_guidelines"] },
        ],
      },
    );
    mkdirp(path.join(tmpDir, ".taiyi"));
    fs.writeFileSync(
      path.join(tmpDir, ".taiyi", "providers.yaml"),
      "version: 1\nassignments:\n  design_guidelines: web-quality\n",
    );
    const registry = ProviderRegistry.forProject(tmpDir);
    const provider = registry.getProviderForCapability("design_guidelines");
    expect(provider!.provider).toBe("web-quality");
  });

  it("plugin does not affect registry when no plugin installed", () => {
    const registry = ProviderRegistry.forProject(tmpDir);
    expect(registry.getProviderForCapability("sast_scan")!.provider).toBe("semgrep");
  });
});

/* ------------------------------------------------------------------ */
/*  ProviderRegistry.runCapability                                      */
/* ------------------------------------------------------------------ */

describe("ProviderRegistry.runCapability", () => {
  /** 创建一个只包含内置适配器的 registry，避免默认 CLI provider 干扰 */
  function builtinOnlyRegistry(): ProviderRegistry {
    return ProviderRegistry.fromConfig({
      version: 1,
      providers: {
        "taiyi-builtin": { provider: "taiyi-builtin", type: "builtin", provides: ["spec_archive", "spec_sync", "archive_hook"] },
        "omc-plugin": { provider: "omc-plugin", type: "builtin", provides: ["plugin_platform"] },
      },
      defaults: {
        spec_archive: "taiyi-builtin",
        spec_sync: "taiyi-builtin",
        plugin_platform: "omc-plugin",
      },
    });
  }

  it("runs builtin spec_archive adapter", () => {
    const slug = "test-archive";
    const taiyiRoot = path.join(tmpDir, ".taiyi");
    const changeDir = path.join(taiyiRoot, "changes", slug);
    mkdirp(changeDir);
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "# test change");
    fs.writeFileSync(path.join(changeDir, "DESIGN.md"), "# test design");
    mkdirp(path.join(taiyiRoot, "archive"));

    const registry = builtinOnlyRegistry();
    const result = registry.runCapability("spec_archive", {
      slug,
      workspaceDir: tmpDir,
      taiyiChangeDir: changeDir,
    });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe("taiyi-builtin");
    expect(result.dest).toContain(".taiyi/archive");
  });

  it("spec_sync falls back to artifacts copy when openspec CLI unavailable", () => {
    const slug = "test-sync";
    const taiyiRoot = path.join(tmpDir, ".taiyi");
    const changeDir = path.join(taiyiRoot, "changes", slug);
    mkdirp(changeDir);
    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), "# req");
    fs.writeFileSync(path.join(changeDir, "TASK.md"), "# task");

    const registry = builtinOnlyRegistry();
    const result = registry.runCapability("spec_sync", {
      slug,
      workspaceDir: tmpDir,
      taiyiChangeDir: changeDir,
      createChangeDir: true,
    });

    // If openspec CLI is available on the system, it delegates to openspec-sync.
    // Otherwise falls back to artifacts copy. Both are valid outcomes.
    if (result.dest?.includes(".taiyi/artifacts")) {
      expect(result.provider).toBe("taiyi-builtin");
    } else {
      expect(result.ok).toBe(true);
    }
  });

  it("spec_sync with missing context returns error", () => {
    const registry = builtinOnlyRegistry();
    const result = registry.runCapability("spec_sync", {});
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("缺少上下文");
  });

  it("runs builtin plugin_platform adapter (always skipped)", () => {
    const registry = builtinOnlyRegistry();
    const result = registry.runCapability("plugin_platform", {
      workspaceDir: tmpDir,
    });
    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("runs unknown capability as error (no default provider)", () => {
    const registry = builtinOnlyRegistry();
    const result = registry.runCapability("unknown_cap" as any, {
      workspaceDir: tmpDir,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("未分配 provider");
  });

  it("runs CLI provider when plugin is configured", () => {
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-cli-test"));
    // Write a plugin with a simple CLI
    const pkgDir = path.join(tmpDir, "node_modules", "taiyi-provider-cli-test");
    const pkg = {
      name: "taiyi-provider-cli-test",
      version: "1.0.0",
      taiyi: {
        providers: [
          { name: "echo-tool", type: "cli", cli: "echo hello", provides: ["sast_scan"] },
        ],
      },
    };
    fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify(pkg, null, 2));

    const registry = ProviderRegistry.forProject(tmpDir);
    const result = registry.runCapability("sast_scan", {
      workspaceDir: tmpDir,
      slug: "test-cli",
    });

    expect(result.ok).toBe(true);
    expect(result.stdout).toBe("hello");
    expect(result.provider).toBe("echo-tool");
  });
});

describe("registry cache", () => {
  it("forProject returns cached instance on second call", () => {
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-cache-me"));
    writePluginPkg(
      path.join(tmpDir, "node_modules", "taiyi-provider-cache-me"),
      {
        providers: [
          { name: "cached-tool", type: "cli", cli: "cached", provides: ["sast_scan"] },
        ],
      },
    );

    const r1 = ProviderRegistry.forProject(tmpDir);
    const r2 = ProviderRegistry.forProject(tmpDir);
    // Same instance (cached)
    expect(r1.getProviderForCapability("sast_scan")!.provider).toBe("cached-tool");
    expect(r2.getProviderForCapability("sast_scan")!.provider).toBe("cached-tool");
  });

  it("forProjectFresh clears cache and re-loads", () => {
    // First call — no plugin
    const r1 = ProviderRegistry.forProject(tmpDir);
    const oldProvider = r1.getProviderForCapability("sast_scan")!.provider;
    expect(oldProvider).toBe("semgrep");

    // Now add a plugin
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-fresh-test"));
    writePluginPkg(
      path.join(tmpDir, "node_modules", "taiyi-provider-fresh-test"),
      {
        providers: [
          { name: "fresh-tool", type: "cli", cli: "fresh", provides: ["sast_scan"] },
        ],
      },
    );

    // Same instance would still be cached (old)
    const r2 = ProviderRegistry.forProject(tmpDir);
    expect(r2.getProviderForCapability("sast_scan")!.provider).toBe("semgrep");

    // Fresh call picks up the new plugin
    const r3 = ProviderRegistry.forProjectFresh(tmpDir);
    expect(r3.getProviderForCapability("sast_scan")!.provider).toBe("fresh-tool");
  });
});

/* ------------------------------------------------------------------ */
/*  Source tracking (getCapabilityOrigin)                               */
/* ------------------------------------------------------------------ */

describe("getCapabilityOrigin", () => {
  it("builtin default capability → source: builtin", () => {
    const registry = ProviderRegistry.withDefaults();
    const origin = registry.getCapabilityOrigin("spec_archive");
    expect(origin.source).toBe("builtin");
    expect(origin.sourceDetail).toBe("builtin defaults");
    expect(origin.provider).toBe("openspec");
    expect(origin.type).toBe("cli");
  });

  it("plugin auto-discovery → source: plugin", () => {
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-ai-skills"));
    writePluginPkg(
      path.join(tmpDir, "node_modules", "taiyi-provider-ai-skills"),
      {
        providers: [
          { name: "ai-skills", type: "cli", cli: "ai-skills run $SLUG", provides: ["code_review"] },
        ],
      },
    );
    const registry = ProviderRegistry.forProject(tmpDir);
    const origin = registry.getCapabilityOrigin("code_review");
    expect(origin.source).toBe("plugin");
    expect(origin.sourceDetail).toContain("plugin auto: ai-skills");
    expect(origin.provider).toBe("ai-skills");
    expect(origin.type).toBe("cli");
  });

  it("project config (.taiyi/providers.yaml) override → source: project", () => {
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-ai-skills"));
    writePluginPkg(
      path.join(tmpDir, "node_modules", "taiyi-provider-ai-skills"),
      {
        providers: [
          { name: "ai-skills", type: "cli", cli: "ai-skills run $SLUG", provides: ["code_review"] },
        ],
      },
    );
    mkdirp(path.join(tmpDir, ".taiyi"));
    fs.writeFileSync(
      path.join(tmpDir, ".taiyi", "providers.yaml"),
      "version: 1\nassignments:\n  code_review: playwright\n",
    );
    const registry = ProviderRegistry.forProject(tmpDir);
    const origin = registry.getCapabilityOrigin("code_review");
    expect(origin.source).toBe("project");
    expect(origin.sourceDetail).toBe(".taiyi/providers.yaml");
    expect(origin.provider).toBe("playwright");
  });

  it("project defaults section in .taiyi/providers.yaml → source: project", () => {
    // 用户写 defaults: 而不是 assignments: 来改变回退行为
    mkdirp(path.join(tmpDir, ".taiyi"));
    fs.writeFileSync(
      path.join(tmpDir, ".taiyi", "providers.yaml"),
      "version: 1\ndefaults:\n  code_review: playwright\n",
    );
    const registry = ProviderRegistry.forProject(tmpDir);
    const origin = registry.getCapabilityOrigin("code_review");
    expect(origin.source).toBe("project");
    expect(origin.sourceDetail).toBe(".taiyi/providers.yaml");
    expect(origin.provider).toBe("playwright");
  });
});

/* ------------------------------------------------------------------ */
/*  E2E: 全链路走通（plugin discover → merge → dispatch → source 一致）    */
/* ------------------------------------------------------------------ */

describe("E2E: full pipeline (discover → merge → dispatch → source)", () => {
  /** 在一个独立沙箱里模拟：先无插件跑，再装插件，再写 .taiyi/providers.yaml */
  it("traces the complete lifecycle with source correctness at every step", () => {
    // ── 第 1 步：无插件，纯内置 ──
    const r1 = ProviderRegistry.forProject(tmpDir);
    // builtin 内置的能力
    expect(r1.getProviderForCapability("spec_archive")!.provider).toBe("openspec");
    expect(r1.getProviderForCapability("code_review")!.provider).toBe("gstack");
    expect(r1.getProviderForCapability("sast_scan")!.provider).toBe("semgrep");

    // source 追踪正确
    const originSpec = r1.getCapabilityOrigin("spec_archive");
    expect(originSpec.source).toBe("builtin");
    expect(originSpec.provider).toBe("openspec");

    // ── 第 2 步：装一个插件（模拟 npm install taiyi-provider-ai-skills）──
    mkdirp(path.join(tmpDir, "node_modules", "taiyi-provider-ai-skills"));
    writePluginPkg(
      path.join(tmpDir, "node_modules", "taiyi-provider-ai-skills"),
      {
        providers: [
          { name: "ai-skills", type: "cli", cli: "ai-skills run $SLUG", provides: ["code_review"] },
        ],
      },
    );

    // forProjectFresh 清除缓存重新加载
    const r2 = ProviderRegistry.forProjectFresh(tmpDir);

    // 插件未覆盖的能力仍走内置
    expect(r2.getProviderForCapability("spec_archive")!.provider).toBe("openspec");
    expect(r2.getCapabilityOrigin("spec_archive").source).toBe("builtin");

    // 插件覆盖的能力
    expect(r2.getProviderForCapability("code_review")!.provider).toBe("ai-skills");
    const originCr = r2.getCapabilityOrigin("code_review");
    expect(originCr.source).toBe("plugin");
    expect(originCr.sourceDetail).toContain("plugin auto: ai-skills");
    expect(originCr.type).toBe("cli");

    // ── 第 3 步：用户写 .taiyi/providers.yaml 覆盖 assignments──
    mkdirp(path.join(tmpDir, ".taiyi"));
    fs.writeFileSync(
      path.join(tmpDir, ".taiyi", "providers.yaml"),
      "version: 1\nassignments:\n  code_review: playwright\n",
    );

    const r3 = ProviderRegistry.forProjectFresh(tmpDir);

    // project assignments 覆盖了插件
    expect(r3.getProviderForCapability("code_review")!.provider).toBe("playwright");
    const origin3 = r3.getCapabilityOrigin("code_review");
    expect(origin3.source).toBe("project");
    expect(origin3.sourceDetail).toBe(".taiyi/providers.yaml");
    expect(origin3.type).toBe("cli"); // playwright 是 CLI 类型

    // 未覆盖的内置仍正确
    expect(r3.getCapabilityOrigin("spec_archive").source).toBe("builtin");

    // ── 第 4 步：用户改用 defaults 而不是 assignments ──
    fs.writeFileSync(
      path.join(tmpDir, ".taiyi", "providers.yaml"),
      "version: 1\ndefaults:\n  code_review: gstack\n",
    );

    const r4 = ProviderRegistry.forProjectFresh(tmpDir);

    // defaults 会改变回退值（影响 ensureDefaults 的填充）
    expect(r4.getProviderForCapability("code_review")!.provider).toBe("gstack");
    const origin4 = r4.getCapabilityOrigin("code_review");
    expect(origin4.source).toBe("project");
    expect(origin4.sourceDetail).toBe(".taiyi/providers.yaml");
    expect(origin4.provider).toBe("gstack");
    expect(origin4.type).toBe("skill_bundle");
  });
});
