#!/usr/bin/env node
/**
 * 完整开源流程演示：九阶段 + 全部 harness 钩子打卡（含 optional）
 * Usage: node scripts/run-full-oss-flow.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exampleRoot = path.resolve(__dirname, "..");
const workspace = path.join(exampleRoot, "workspace");
const pkgRoot = path.resolve(exampleRoot, "../..");
const slug = "full-oss-demo";
const approver = "full-oss-flow-demo";
const forgeSh = path.join(pkgRoot, "scripts/taiyi-forge.sh");

const HUMAN_GATE_PHASES = new Set(["change", "design", "review"]);

fs.mkdirSync(workspace, { recursive: true });

const taiyi = (args) => {
  const r = spawnSync(forgeSh, args, {
    cwd: workspace,
    encoding: "utf8",
    env: { ...process.env, TAIYI_FORGE_ROOT: pkgRoot },
  });
  return { code: r.status ?? 1, out: (r.stdout || "") + (r.stderr || "") };
};

function step(n, label, fn, chatVerb) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`步骤 ${n}: ${label}`);
  if (chatVerb) console.log(`💬 聊天等价: ${chatVerb}`);
  console.log("═".repeat(60));
  const result = fn();
  if (result?.out) console.log(result.out.trimEnd());
  if (result?.code !== undefined && result.code !== 0) {
    console.error(`\n✗ 失败 exit=${result.code}`);
    process.exit(1);
  }
  console.log("✓ OK");
  return result;
}

/** 完整流程建议打卡的全部钩子（与 workflow-manifest.yaml phases.*.harness 对齐） */
const FULL_OSS_HOOKS = {
  change: ["superpowers/brainstorming"],
  requirement: ["superpowers/writing-plans"],
  design: ["gstack/plan-eng-review"],
  "ui-design": [
    "gstack/plan-design-review",
    "web-quality/accessibility",
    "web-quality/web-design-guidelines",
  ],
  task: ["superpowers/writing-plans", "superpowers/test-driven-development"],
  dev: ["superpowers/test-driven-development"],
  test: [
    "superpowers/verification-before-completion",
    "gstack/qa",
    "playwright:npx playwright",
    "web-quality/accessibility",
  ],
  review: [
    "superpowers/requesting-code-review",
    "gstack/review",
    "semgrep:semgrep scan",
    "trivy:trivy fs",
  ],
  integration: [
    "superpowers/finishing-a-development-branch",
    "superpowers/verification-before-completion",
    "gstack/document-release",
    "changesets:npx changeset",
  ],
};

const taiyiChangesDir = path.join(workspace, ".taiyi", "changes");
const changeDir = path.join(taiyiChangesDir, slug);
if (fs.existsSync(changeDir)) {
  fs.rmSync(changeDir, { recursive: true, force: true });
}

// 最小可运行项目
if (!fs.existsSync(path.join(workspace, "package.json"))) {
  fs.writeFileSync(
    path.join(workspace, "package.json"),
    JSON.stringify({ name: "full-oss-workspace", type: "module", scripts: { test: "node --test" } }, null, 2),
  );
  fs.mkdirSync(path.join(workspace, "test"), { recursive: true });
  fs.writeFileSync(
    path.join(workspace, "test/smoke.test.js"),
    `import { test } from "node:test"; import assert from "node:assert";\ntest("smoke", () => assert.ok(true));\n`,
  );
}

let n = 0;
step(++n, "doctor", () => taiyi(["doctor"]), "/taiyi:doctor");
step(++n, "init --auto", () => taiyi(["init", slug, "--auto", "--title", "Full OSS Flow Demo"]), "/taiyi:new");
fs.mkdirSync(changeDir, { recursive: true });

step(++n, "intel-scan → CONTEXT.md", () => {
  fs.writeFileSync(
    path.join(changeDir, "CONTEXT.md"),
    "# CONTEXT\n\nFull OSS flow demo workspace.\n",
    "utf8",
  );
  return taiyi(["mark-aux", slug, "taiyi-intel-scan"]);
});

for (const hook of FULL_OSS_HOOKS.change) {
  step(++n, `harness-check ${hook}`, () => taiyi(["harness-check", slug, hook]));
}

step(++n, "CHANGE.md + complete change", () => {
  fs.writeFileSync(
    path.join(changeDir, "CHANGE.md"),
    `# CHANGE: Full OSS Demo

## Motivation
Demonstrate complete open-source skill chain.

## Scope
- In: all harness hooks + nine phases
- Out: production deploy

## Risks
Low.

## Success Criteria
- [ ] All phases complete
- [ ] npm test passes
`,
    "utf8",
  );
  return taiyi(["complete", slug, "change", "--approver", approver]);
});

const artifacts = {
  requirement: {
    file: "REQUIREMENT.md",
    body: `# REQUIREMENT

## User Stories
| ID | As a… | I want… | So that… |
|----|--------|---------|----------|
| US-1 | dev | full OSS flow | I can verify harness |

## Acceptance Criteria
- **Given** init --auto
- **When** all hooks checked
- **Then** integration completes

## Traceability
| AC | CHANGE |
|----|--------|
| US-1 | Success Criteria |

## Out of Scope
Prod.
`,
  },
  design: {
    file: "DESIGN.md",
    body: `# DESIGN: Full OSS Demo

## Context
Script-driven harness demo for all open-source hooks.

## Options

| Option | Summary | Pros | Cons | Cost |
|--------|---------|------|------|------|
| A | single script | Simple, fast | less modular | Low |
| B | per-phase modules | Clear separation | more files | Medium |

## Decision
**Chosen:** Option A single script.

**Reason:** Minimal surface for CI smoke; hooks still exercised.

## Architecture
\`\`\`text
init → harness-check × N → complete × 9
\`\`\`

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Hook key drift | aligned with workflow-manifest.yaml |

## Open Questions
- [ ] None
`,
    adr: "adr/001-demo.md",
    adrBody: "# ADR-001: Single script demo\n\nStatus: accepted\n",
    markArchitect: true,
  },
  "ui-design": {
    file: "UI-DESIGN.md",
    body: `# UI-DESIGN: Full OSS Demo

## Scope
CLI demo — no web UI.

## Layout & Hierarchy
N/A — Node script only.

## States
| State | Behavior |
|-------|----------|
| n/a | CLI |

## Accessibility
- [x] N/A documented for CLI-only demo

## Links
- DESIGN.md ADR-001
- REQUIREMENT US-1
`,
    aux: "ui-restyle-tasks.md",
    auxBody: "# UI Restyle\n\nN/A — CLI only demo.\n",
  },
  task: {
    file: "TASK.md",
    body: `# TASK: Full OSS Demo

## Slices

| # | Slice | Depends | Done when |
|---|-------|---------|-----------|
| 1 | smoke test | — | npm test green |

## Checklist per slice
- [x] RED test
- [x] GREEN impl
- [x] REFACTOR
- [x] trace AC

## Non-goals
Production deploy.
`,
  },
  test: {
    file: "TEST.md",
    body: `# TEST

## Test Plan
| Level | Command |
|-------|---------|
| unit | npm test |

## Results
- [x] pass
`,
    aux: "architecture-sync.md",
    auxBody: "# Arch sync\n\nNone.\n",
  },
  review: {
    file: "REVIEW.md",
    body: `# REVIEW

## Findings
| Severity | Issue |
|----------|-------|
| — | none |

## Verdict
- [x] **Approve**
`,
    aux: "health-report.md",
    auxBody: "# Health\n\nnpm test: pass\n",
  },
  integration: {
    file: "CHANGELOG.md",
    body: `# CHANGELOG

## Added
- Full OSS flow demo

## Docs
- [x] full-oss-flow.md
`,
  },
};

for (const [phase, hooks] of Object.entries(FULL_OSS_HOOKS)) {
  if (phase === "change") continue;

  step(++n, `harness ${phase}`, () => taiyi(["harness", slug]), `/taiyi:check · /taiyi:full-flow`);

  for (const hook of hooks) {
    step(++n, `${phase}: harness-check ${hook}`, () => taiyi(["harness-check", slug, hook]));
  }

  const art = artifacts[phase];
  if (art?.adr) {
    fs.mkdirSync(path.join(changeDir, "adr"), { recursive: true });
    fs.writeFileSync(path.join(changeDir, art.adr), art.adrBody, "utf8");
  }
  if (art?.markArchitect) {
    step(++n, `${phase}: mark-aux taiyi-architect`, () => taiyi(["mark-aux", slug, "taiyi-architect"]));
  }
  if (art?.aux) {
    fs.writeFileSync(path.join(changeDir, art.aux), art.auxBody, "utf8");
  }
  if (art?.file && art?.body) {
    fs.writeFileSync(path.join(changeDir, art.file), art.body, "utf8");
  }

  if (phase === "dev") {
    step(++n, "dev: npm test → .dev-complete", () => {
      const test = spawnSync("npm", ["test"], { cwd: workspace, encoding: "utf8", shell: true });
      fs.writeFileSync(
        path.join(changeDir, ".dev-complete"),
        `command: npm test\nexitCode: ${test.status === 0 ? 0 : 1}\n`,
        "utf8",
      );
      return { code: test.status === 0 ? 0 : 1, out: test.stdout + test.stderr };
    }, "/taiyi:tdd dev · /taiyi:apply");
  }

  if (phase === "integration") {
    const changePath = path.join(changeDir, "CHANGE.md");
    if (fs.existsSync(changePath)) {
      fs.writeFileSync(
        changePath,
        fs.readFileSync(changePath, "utf8").replace(/- \[ \]/g, "- [x]"),
        "utf8",
      );
    }
  }

  const completeArgs = ["complete", slug, phase];
  if (HUMAN_GATE_PHASES.has(phase)) completeArgs.push("--approver", approver);
  step(++n, `complete ${phase}`, () => taiyi(completeArgs), "/taiyi:continue");
}

step(++n, "status（应已完成）", () => taiyi(["status", slug]), "/taiyi:status");
step(++n, "ci verify", () => taiyi(["ci", "verify", "--slug", slug]), "/taiyi:verify");

console.log(`\n${"═".repeat(60)}`);
console.log("完整开源流程演示完成 — 全部 harness 钩子已打卡");
console.log("文档: docs/taiyi/full-oss-flow.md");
console.log("═".repeat(60));
