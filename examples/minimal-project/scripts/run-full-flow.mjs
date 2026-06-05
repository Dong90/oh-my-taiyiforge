#!/usr/bin/env node
/**
 * minimal-project 全流程演示：逐步执行并打印结果（供 Cursor / 人工对照）
 * Usage: node scripts/run-full-flow.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(__dirname, "..");
const pkgRoot = path.resolve(workspace, "../..");
const slug = "minimal-demo";
const forgeSh = path.join(pkgRoot, "scripts/taiyi-forge.sh");

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

const changeDir = path.join(workspace, ".taiyi", "changes", slug);

if (fs.existsSync(changeDir)) {
  fs.rmSync(changeDir, { recursive: true, force: true });
}

step(0, "doctor 自检", () => taiyi(["doctor"]), "/taiyi:doctor");

step(1, "init --auto 创建变更", () =>
  taiyi(["init", slug, "--auto", "--title", "Minimal Counter Demo"]),
  "/taiyi:new Minimal Counter Demo（或 init --auto）",
);

step(2, "harness 查看 change 阶段清单", () => taiyi(["harness", slug]), "/taiyi:check");

step(3, "辅助 taiyi-intel-scan → CONTEXT.md", () => {
  fs.writeFileSync(
    path.join(changeDir, "CONTEXT.md"),
    `# CONTEXT: minimal-demo

## Tech Stack
- Node.js ESM, node:test
- TaiyiForge workflow demo

## Conventions
- src/ + test/ layout
`,
    "utf8",
  );
  return taiyi(["mark-aux", slug, "taiyi-intel-scan"]);
});

step(4, "铁三角 superpowers/brainstorming 打卡", () =>
  taiyi(["harness-check", slug, "superpowers/brainstorming"]),
);

step(5, "填写 CHANGE.md 并 complete change", () => {
  fs.writeFileSync(
    path.join(changeDir, "CHANGE.md"),
    `# CHANGE: Minimal Counter

## Motivation
Demonstrate TaiyiForge nine-phase workflow in examples/minimal-project.

## Scope
- In: createCounter module + tests + full .taiyi artifacts
- Out: UI, deployment

## Risks
Low — example only.

## Success Criteria
- [ ] All nine phases complete
- [ ] npm test passes
`,
    "utf8",
  );
  return taiyi(["complete", slug, "change"]);
});

const phases = [
  {
    id: "requirement",
    file: "REQUIREMENT.md",
    body: `# REQUIREMENT: Minimal Counter

## User Stories

| ID | As a… | I want… | So that… |
|----|--------|---------|----------|
| US-1 | developer | a counter API | I can demo TDD |

## Acceptance Criteria (Given / When / Then)

### US-1
- **Given** createCounter(0)
- **When** increment() twice
- **Then** value is 2

## Traceability
| AC | CHANGE |
|----|--------|
| US-1 | Success Criteria |

## Out of Scope
Web UI.
`,
    hooks: [],
  },
  {
    id: "design",
    file: "DESIGN.md",
    aux: {
      dir: "adr",
      file: "adr/001-counter-module.md",
      content: "# ADR-001: Counter module\n\nStatus: accepted\n",
    },
    body: `# DESIGN: Minimal Counter

## Context
Single-module ESM counter for workflow demo.

## Options

| Option | Summary | Pros | Cons | Cost |
|--------|---------|------|------|------|
| A | closure | Simple | — | Low |
| B | class | OOP | heavier | Low |

## Decision
**Chosen:** Option A closure factory.

**Reason:** Minimal surface for demo.

## Architecture
\`\`\`text
createCounter → { increment, reset, value }
\`\`\`

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| None | tests |

## Open Questions
- [ ] None
`,
    hooks: ["gstack/plan-eng-review"],
  },
  {
    id: "ui-design",
    file: "UI-DESIGN.md",
    aux: {
      file: "ui-restyle-tasks.md",
      content: "# UI Restyle\n\nN/A — CLI only demo.\n",
    },
    body: `# UI-DESIGN: Minimal Counter

## Scope
No UI — Node module only.

## Layout & Hierarchy
N/A

## States
| State | Behavior |
|-------|----------|
| n/a | CLI |

## Accessibility
- [x] N/A documented

## Links
- DESIGN.md ADR-001
- REQUIREMENT US-1
`,
    hooks: [],
  },
  {
    id: "task",
    file: "TASK.md",
    body: `# TASK: Minimal Counter

## Slices

| # | Slice | Depends | Done when |
|---|-------|---------|-----------|
| 1 | counter module | — | tests green |

## Checklist per slice
- [x] RED test
- [x] GREEN impl
- [x] REFACTOR
- [x] trace AC

## Non-goals
Frontend.
`,
    hooks: [],
  },
  {
    id: "dev",
    dev: true,
    hooks: ["superpowers/test-driven-development"],
  },
  {
    id: "test",
    file: "TEST.md",
    aux: {
      file: "architecture-sync.md",
      content: "# Architecture Sync\n\nTest phase: no arch changes.\n",
    },
    body: `# TEST: Minimal Counter

## Test Plan

| Level | Scope | Command |
|-------|-------|---------|
| unit | counter | npm test |

## Coverage vs AC
| AC | Evidence |
|----|----------|
| US-1 | test/counter.test.js |

## Results
- [x] npm test pass

## Gaps
None.
`,
    hooks: ["superpowers/verification-before-completion", "gstack/qa"],
  },
  {
    id: "review",
    file: "REVIEW.md",
    aux: {
      file: "health-report.md",
      content: "# Health\n\nnpm test: pass\nLint: n/a\n",
    },
    body: `# REVIEW: Minimal Counter

## Summary
Minimal counter + full workflow demo.

## Findings
| Severity | Area | Issue | Suggestion |
|----------|------|-------|------------|
| low | — | — | — |

## Security & Trust
- [x] No secrets
- [x] Input bounded (step number)

## Verdict
- [x] **Approve**
`,
    hooks: ["gstack/review"],
  },
  {
    id: "integration",
    file: "CHANGELOG.md",
    body: `# CHANGELOG: Minimal Counter

## Added
- createCounter module and tests
- examples/minimal-project full TaiyiForge walkthrough

## Changed
- minimal-project README with step log

## Fixed
- N/A

## Docs / Skills
- [x] README updated

## Rollback
Delete slug directory.
`,
    hooks: ["gstack/document-release"],
  },
];

let stepNum = 6;
for (const p of phases) {
  step(stepNum++, `harness ${p.id}`, () => taiyi(["harness", slug]));

  if (p.aux?.dir) {
    fs.mkdirSync(path.join(changeDir, p.aux.dir), { recursive: true });
    if (p.aux.file && p.aux.content) {
      fs.writeFileSync(path.join(changeDir, p.aux.file), p.aux.content, "utf8");
    }
  }
  if (p.aux?.file && p.aux.content && !p.aux.dir) {
    fs.writeFileSync(path.join(changeDir, p.aux.file), p.aux.content, "utf8");
  }

  for (const h of p.hooks ?? []) {
    step(stepNum++, `harness-check ${h}`, () => taiyi(["harness-check", slug, h]));
  }

  if (p.dev) {
    step(stepNum++, "dev 工件 .dev-complete", () => {
      const test = spawnSync("npm", ["test"], {
        cwd: workspace,
        encoding: "utf8",
        shell: true,
      });
      fs.writeFileSync(
        path.join(changeDir, ".dev-complete"),
        `command: npm test\nexitCode: ${test.status === 0 ? 0 : 1}\n`,
        "utf8",
      );
      if (test.status !== 0) {
        console.log(test.stdout + test.stderr);
        return { code: 1, out: "npm test failed" };
      }
      return { code: 0, out: "npm test passed" };
    });
  } else if (p.file && p.body) {
    fs.writeFileSync(path.join(changeDir, p.file), p.body, "utf8");
  }

  step(stepNum++, `complete ${p.id}`, () => taiyi(["complete", slug, p.id]), `/taiyi:continue 或 /taiyi:apply（${p.id}）`);
}

step(stepNum++, "list 变更列表", () => taiyi(["list"]), "/taiyi:list");
step(stepNum++, "ci verify", () => taiyi(["ci", "verify", "--slug", slug]));
step(stepNum++, "最终 status", () => taiyi(["status", slug]), "/taiyi:status");

console.log("\n" + "═".repeat(60));
console.log("全流程完成 — minimal-demo 九阶段已走完");
console.log("═".repeat(60));
