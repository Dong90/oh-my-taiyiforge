#!/usr/bin/env bash
# Split wip-store snapshot into 10 stacked PRs. Run from repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WIP_REF="${WIP_REF:-split/wip-store}"

checkout_slice() {
  local ref="$1"
  shift
  for f in "$@"; do
    if git cat-file -e "$ref:$f" 2>/dev/null; then
      git checkout "$ref" -- "$f"
    elif [[ -f "$f" ]]; then
      rm -f "$f"
      git rm -f "$f" 2>/dev/null || true
    fi
  done
}

commit_slice() {
  local branch="$1" parent="$2" title="$3" body="$4"
  shift 4
  git checkout -B "$branch" "$parent"
  # reset tracked to parent then apply slice files
  git reset --hard "$parent"
  checkout_slice "$WIP_REF" "$@"
  npm run build
  git add "$@"
  # stage deletions for prompts removed in PR8
  git diff --name-only --diff-filter=D "$parent" -- "$@" 2>/dev/null | xargs -r git add 2>/dev/null || true
  if git diff --cached --quiet; then
    echo "SKIP empty slice $branch"
    return 0
  fi
  git commit -m "$title"
  git push -u origin "$branch" --force-with-lease
  if gh pr view "$branch" &>/dev/null; then
    echo "PR exists for $branch"
  else
    gh pr create --base "$parent" --head "$branch" --title "$title" --body "$body"
  fi
}

# PR1
commit_slice split/01-providers-registry develop \
  "feat(providers): add ProviderRegistry and project providers.yaml template" \
  "Provider capability routing layer (CLI/skill/builtin). Part 1/10 of develop split." \
  src/config/providers.ts docs/taiyi/providers.yaml tests/providers-plugins.test.ts

# PR2
commit_slice split/02-providers-wiring split/01-providers-registry \
  "feat(providers): wire registry into harness, doctor, and install sync" \
  "Connect ProviderRegistry to harness-hooks, harness-runner, doctor-workspace, third-party-deps. Part 2/10." \
  src/install/third-party-deps.ts src/core/doctor-workspace.ts src/integrations/harness-hooks.ts \
  src/core/harness-runner.ts tests/third-party-deps.test.ts tests/harness-hooks.test.ts

# PR3
commit_slice split/03-workflow-manifest split/02-providers-wiring \
  "refactor(manifest): slim workflow-manifest and align harness parser" \
  "Remove unused manifest fields; add optimized variant. Part 3/10." \
  docs/taiyi/workflow-manifest.yaml docs/taiyi/workflow-manifest-optimized.yaml \
  src/integrations/workflow-manifest.ts tests/workflow-manifest.test.ts tests/workflow-manifest-integrity.test.ts

# PR4
commit_slice split/04-artifact-pipeline split/03-workflow-manifest \
  "feat(artifacts): json/hbs seed, sync, render, and undo-phase" \
  "Artifact pipeline + template-seed updates. Part 4/10." \
  src/core/artifact-seed.ts src/core/artifact-sync.ts src/core/artifact-render.ts src/core/undo-phase.ts \
  tests/artifact-seed.test.ts tests/artifact-sync.test.ts tests/artifact-render.test.ts tests/undo-phase.test.ts \
  src/core/template-seed.ts src/core/package-root.ts src/core/artifact-validator.ts tests/template-seed.test.ts

# PR5
commit_slice split/05-workflow-engine split/04-artifact-pipeline \
  "feat(engine): workflow gates, archive, and change-graph SSOT wiring" \
  "WorkflowEngine completePhase gates and related modules. Part 5/10." \
  src/core/workflow-engine.ts src/core/dev-phase-guard.ts src/core/file-writer.ts \
  src/core/sync-root-changelog.ts src/core/taiyi-archive.ts src/core/change-graph/edges.ts \
  src/core/gates/commit-trailer.ts src/core/workflow-audit.ts \
  tests/workflow-engine.test.ts tests/integration-gates.test.ts

# PR6
commit_slice split/06-cli-handlers split/05-workflow-engine \
  "feat(cli): v30 command surface, handlers, and loop runners" \
  "CLI registry refactor and plugin handlers. Part 6/10." \
  src/cli/taiyi.ts src/core/command-registry.ts src/plugin/handlers.ts \
  src/core/loop-runner.ts src/core/loop-state.ts src/core/phase-guide.ts src/core/phase-write.ts \
  src/core/format-guide.ts src/core/run-slash-flow-cli.ts src/core/wave-allocator.ts \
  src/core/harness-checkpoints.ts src/core/profile-registry.ts \
  tests/cli-exit-codes.test.ts tests/autopilot-step-cli.test.ts tests/format-guide.test.ts tests/l4-headless-contract.test.ts

# PR7
commit_slice split/07-commands-catalog split/06-cli-handlers \
  "chore(commands): v30 commands.yaml and generated canonical docs" \
  "Commands catalog and generate-docs pipeline. Part 7/10." \
  docs/taiyi/commands.yaml docs/taiyi/canonical-commands.md \
  docs/taiyi/inc/browser-e2e.generated.md docs/taiyi/inc/canonical-tables.generated.md \
  docs/taiyi/inc/delivery-chain.generated.md docs/taiyi/inc/diagram-pipeline.generated.md \
  scripts/generate-docs.mjs scripts/lib/parse-commands-yaml.mjs \
  examples/commands-smoke/commands.manifest.json examples/full-flow-demo/slash-flow.json \
  tests/commands-catalog-sync.test.ts tests/examples-full-flow.test.ts tests/autonomous-slash-coverage.test.ts

# PR8 — prompts/skills/install (include deletions)
commit_slice split/08-prompts-skills split/07-commands-catalog \
  "feat(prompts): v30 slash prompts, skills sync, and install pipeline" \
  "Prompt/skill refresh and install sync. Part 8/10." \
  prompts/ skills/ src/install/control-plane-markdown.ts src/install/prompt-stage-protocol.ts \
  src/install/run.ts src/install/sync-chat-commands.ts src/install/sync-consumer-scripts.ts \
  scripts/taiyi-forge.sh tests/slash-commands.test.ts tests/slash-extensions.test.ts \
  tests/prompt-stage-protocol.test.ts tests/install-cli.test.ts tests/install-prompt-parity.test.ts

# PR9
commit_slice split/09-mcp-integration-docs split/08-prompts-skills \
  "docs(taiyi): MCP tools and integration flow documentation" \
  "MCP server updates + taiyi integration docs. Part 9/10." \
  src/mcp/server.ts src/mcp/state-tools.ts docs/taiyi/artifact-contract.md \
  docs/taiyi/integration-superpowers-ecc-gstack.md docs/taiyi/full-oss-flow.md \
  docs/taiyi/control-plane.md docs/taiyi/integrations.md docs/taiyi/workflow.md \
  docs/taiyi/nine-phase-flow.md docs/taiyi/artifact-layout.md docs/taiyi/delivery-gate.md \
  docs/c4/README.md docs/c4/containers.md

# PR10
commit_slice split/10-top-level-docs split/09-mcp-integration-docs \
  "docs: README, ARCHITECTURE, USAGE, and housekeeping scripts" \
  "Top-level docs and tooling scripts. Part 10/10." \
  README.md AGENTS.md docs/ARCHITECTURE.md docs/QUICKSTART.md docs/USAGE.md \
  .gitignore package.json scripts/build-architecture-pdf.sh scripts/sync-hbs-templates.mjs

echo "Done. PR list:"
for b in split/0{1..9}-* split/10-*; do
  gh pr view "$b" --json url,title -q '"\(.title): \(.url)"' 2>/dev/null || true
done
