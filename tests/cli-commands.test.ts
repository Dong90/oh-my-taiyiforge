import { describe, expect, it, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(REPO, "examples/commands-smoke");
const MANIFEST = JSON.parse(
  fs.readFileSync(path.join(FIXTURE, "commands.manifest.json"), "utf8"),
) as Manifest;

const WORKFLOW_SKILLS = [
  "plan",
  "ralplan",
  "ultraqa",
  "visual-verdict",
  "deep-interview",
  "ai-slop-cleaner",
  "ecomode",
  "ccg",
  "sciomc",
  "deepinit",
  "external-context",
] as const;

const PHASE_WRITE_VERBS = [
  "change",
  "requirement",
  "design",
  "ui-design",
  "task",
  "dev",
  "test",
  "review",
  "integration",
] as const;

type ManifestCommand = {
  id: string;
  argv: string[];
  expectExit: number | number[];
};

type Manifest = {
  workspace: { slug: string; profile: string; title: string };
  commands: ManifestCommand[];
  shellCommands?: ManifestCommand[];
};

function resolveCli(): string[] {
  const built = path.join(REPO, "dist/cli/taiyi.js");
  if (fs.existsSync(built)) return ["node", built];
  return ["node", "--import", "tsx", path.join(REPO, "src/cli/taiyi.ts")];
}

function copyFixture(dest: string): void {
  fs.cpSync(FIXTURE, dest, { recursive: true, filter: (src) => !src.endsWith(".taiyi") });
}

function expandArgv(argv: string[], slug: string): string[] {
  return argv.map((a) => a.replaceAll("{slug}", slug));
}

function runTaiyiCli(cwd: string, argv: string[]): { code: number; out: string } {
  const [bin, ...cliArgs] = resolveCli();
  const r = spawnSync(bin, [...cliArgs, ...argv], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: REPO },
  });
  return {
    code: r.status ?? 1,
    out: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
}

function runTaiyiForgeSh(cwd: string, argv: string[]): { code: number; out: string } {
  const script = path.join(REPO, "scripts/taiyi-forge.sh");
  const r = spawnSync("bash", [script, ...argv], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: REPO },
  });
  return {
    code: r.status ?? 1,
    out: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
}

function expectExit(actual: number, expected: number | number[], label: string): void {
  const allowed = Array.isArray(expected) ? expected : [expected];
  expect(allowed, `${label} exit=${actual}`).toContain(actual);
}

function allManifestCommands(slug: string): ManifestCommand[] {
  const dynamic: ManifestCommand[] = [
    ...WORKFLOW_SKILLS.map((skill) => ({
      id: `workflow-${skill}`,
      argv: [skill, slug],
      expectExit: [0, 1] as number[],
    })),
    ...PHASE_WRITE_VERBS.map((phase) => ({
      id: `phase-${phase}`,
      argv: [phase, slug],
      expectExit: phase === "change" ? 0 : ([0, 1] as number[]),
    })),
  ];
  return [...MANIFEST.commands, ...dynamic];
}

describe("cli-commands (examples/commands-smoke)", () => {
  let workspace: string;
  const slug = MANIFEST.workspace.slug;

  beforeAll(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-cli-smoke-"));
    copyFixture(workspace);
    const init = runTaiyiCli(workspace, [
      "init",
      slug,
      "--profile",
      MANIFEST.workspace.profile,
      "--title",
      MANIFEST.workspace.title,
    ]);
    expect(init.code, init.out).toBe(0);
    expect(fs.existsSync(path.join(workspace, ".taiyi/changes", slug, "state.json"))).toBe(true);
  });

  afterAll(() => {
    if (workspace && fs.existsSync(workspace)) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("manifest lists core CLI commands", () => {
    expect(MANIFEST.commands.length).toBeGreaterThanOrEqual(40);
    expect(allManifestCommands(slug).length).toBeGreaterThanOrEqual(60);
  });

  it.each(allManifestCommands(slug).map((c) => [c.id, c] as const))(
    "taiyi CLI › %s",
    (id, cmd) => {
      const r = runTaiyiCli(workspace, expandArgv(cmd.argv, slug));
      expectExit(r.code, cmd.expectExit, id);
      expect(r.out.length, `${id} produced no output`).toBeGreaterThan(0);
    },
  );

  it.each((MANIFEST.shellCommands ?? []).map((c) => [c.id, c] as const))(
    "taiyi-forge.sh › %s",
    (id, cmd) => {
      const r = runTaiyiForgeSh(workspace, expandArgv(cmd.argv, slug));
      expectExit(r.code, cmd.expectExit, id);
      expect(r.out.length, `${id} produced no output`).toBeGreaterThan(0);
    },
  );

  it("new creates a second change slug", () => {
    const r = runTaiyiCli(workspace, ["new", "Second smoke change"]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/second-smoke-change|Second/);
  });

  it("walkthrough bootstraps an isolated workspace", () => {
    const isolated = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-wt-cli-"));
    try {
      copyFixture(isolated);
      const r = runTaiyiCli(isolated, ["walkthrough", "--slug", "wt-cli", "--profile", "lite"]);
      expect(r.code).toBe(0);
      expect(fs.existsSync(path.join(isolated, ".taiyi/changes/wt-cli"))).toBe(true);
    } finally {
      fs.rmSync(isolated, { recursive: true, force: true });
    }
  });

  it("cancel aborts the smoke change", () => {
    const r = runTaiyiCli(workspace, ["cancel", slug]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/取消|aborted|cancel/i);
  });
});
