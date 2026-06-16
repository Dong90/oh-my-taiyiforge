---
phase: PR #5–#10 merged review
reviewed: 2026-06-15T00:00:00Z
depth: deep
files_reviewed: 12
files_reviewed_list:
  - .github/workflows/ci.yml
  - .github/workflows/pr-title.yml
  - .github/dependabot.yml
  - .github/PULL_REQUEST_TEMPLATE.md
  - .github/CODEOWNERS
  - package.json
  - scripts/taiyi-forge.mjs
  - scripts/ci.mjs
  - postinstall.mjs
  - CONTRIBUTING.md
  - CODE_OF_CONDUCT.md
  - SECURITY.md
  - README.md
  - README.zh-CN.md
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Code Review Report: PR #5–#10 Merged

**Reviewed:** 2026-06-15
**Depth:** deep (cross-file call-chain + import tracing + live action-version verification)
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Review of six merged PRs (#5–#10) covering CI hardening, documentation, package release, and contributor setup. Confirmed all GitHub Actions versions are valid via live release-page lookup (`actions/checkout@v6` v6.0.3, `actions/setup-node@v6` v6.4.0, `actions/upload-artifact@v7` v7.0.1). No critical blockers found. Five warnings and five info-level findings, mostly around dead/stale code, doc-version drift, and a CODE_OF_CONDUCT reporting channel concern.

## Warnings

### WR-01: `taiyi:smoke` npm script is a permanent no-op

**File:** `package.json:64`
**Issue:** The script `"taiyi:smoke": "node -e \"process.exit(0)\""` always exits 0 with zero work done. It is never invoked in CI (pack-smoke job uses manual verification instead), and it exists as a dead entry in `scripts`. Anyone running `npm run taiyi:smoke` will see a green pass with no actual smoke test executed, creating false confidence.
**Fix:** Either remove the script or replace it with a real smoke invocation (e.g., `npx taiyi --version` or a minimal CLI roundtrip):
```json
"taiyi:smoke": "node -e \"const{spawnSync}=require('child_process');const r=spawnSync('node',['dist/cli/taiyi.js','--version']);process.exit(r.status)\""
```

### WR-02: Version badge in README is stale (0.23.1 vs 0.23.2)

**File:** `README.md:15`, `README.zh-CN.md:15`
**Issue:** Both README files hardcode the version badge to `0.23.1`:
```
[![Version](https://img.shields.io/badge/version-0.23.1-orange)](CHANGELOG.md)
```
But `package.json:3` declares `"version": "0.23.2"`. The npm-publish toggle comment notes "open after v0.24" but the static version badge should match current.
**Fix:** Update both files to `0.23.2`:
```markdown
[![Version](https://img.shields.io/badge/version-0.23.2-orange)](CHANGELOG.md)
```

### WR-03: `CODE_OF_CONDUCT.md` suggests public GitHub Issues for harassment reporting

**File:** `CODE_OF_CONDUCT.md:41`
**Issue:** Line 41 reads `"可通过 GitHub Issues 或维护者邮箱报告给负责监督的社区领袖。"` — GitHub Issues are **public**. A victim of harassment should never be directed to report via a public channel. This contradicts the Contributor Covenant's intent and the project's own SECURITY.md guidance (which correctly says "do not open public issues for vulnerabilities").
**Fix:** Replace with a private-only reporting channel:
```markdown
辱骂、骚扰或其他不可接受的行为可通过维护者邮箱或 GitHub 私信报告给负责监督的社区领袖。
请勿使用公开 Issue 报告 —— 保护报告者的隐私和安全是我们的责任。
```

### WR-04: Dependabot blocks all major version bumps for npm dependencies

**File:** `.github/dependabot.yml:28-30`
**Issue:** The ignore rule blocks `version-update:semver-major` for **all** npm dependencies:
```yaml
ignore:
  - dependency-name: "*"
    update-types: ["version-update:semver-major"]
```
While this is a deliberate conservative stance, it means security patches delivered exclusively in new major versions (e.g., a library that backports fixes only to its latest major) will never be auto-proposed. The GitHub Actions ecosystem also uses this — if `actions/checkout` releases a CVE-fix in v7, Dependabot won't flag it.
**Fix:** Consider narrowing the ignore scope to specific risky dependencies, or add a monthly manual-review reminder:
```yaml
ignore:
  - dependency-name: "typescript"
    update-types: ["version-update:semver-major"]
  - dependency-name: "@types/*"
    update-types: ["version-update:semver-major"]
```

### WR-05: `scripts/ci.mjs` spawns `"node"` from PATH instead of `process.execPath`

**File:** `scripts/ci.mjs:23`
**Issue:** The `spawnSync` call uses `"node"` as a bare string from PATH:
```javascript
const r = spawnSync("node", [taiyi, ...args], { cwd: process.cwd(), encoding: "utf8", stdio: "inherit" });
```
Compare with `scripts/taiyi-forge.mjs:45` which correctly uses `process.execPath`. If the CI runner's PATH `node` differs from the Node version that's running `ci.mjs` (e.g., nvm-managed), the spawned child could run on a different runtime with different module resolution. This is especially risky on macOS runners where `/usr/local/bin/node` may lag behind the version installed by `actions/setup-node`.
**Fix:** Use `process.execPath` for consistency:
```javascript
const r = spawnSync(process.execPath, [taiyi, ...args], { cwd: process.cwd(), stdio: "inherit" });
```

## Info

### IN-01: Duplicate text in CODE_OF_CONDUCT.md

**File:** `CODE_OF_CONDUCT.md:31`
**Issue:** Line 31 contains `"删除、编辑或拒绝或拒绝"` — the phrase `或拒绝` appears twice. It should be `"删除、编辑或拒绝"`.
**Fix:**
```diff
- 社区领袖有权力和责任删除、编辑或拒绝或拒绝与本行为准则不相符的评论、提交...
+ 社区领袖有权力和责任删除、编辑或拒绝与本行为准则不相符的评论、提交...
```

### IN-02: `taiyi-forge.mjs` `WRAPPER_ALIASES` maps `check` to a potentially removed `harness` command

**File:** `scripts/taiyi-forge.mjs:16`
**Issue:** The alias `check: "harness"` maps `taiyi-forge check` to the `harness` CLI command. PR #10's description mentions "review cleanup" — if `harness` was removed or renamed during cleanup, this alias produces a silent failure (the spawned CLI exits with an error, but it's not obvious that the alias is the cause).
**Fix:** Verify that `taiyi harness` still resolves to a valid command in `dist/cli/taiyi.js`. If it does not, remove the alias:
```javascript
const WRAPPER_ALIASES = {
  ls: "list",
  n: "next",
  go: "next",
  ok: "done",
  // check: "harness",  // removed — harness command deprecated
  pause: "handoff",
  run: "walkthrough",
  sync: "sync-openspec",
};
```

### IN-03: README file naming convention is inverted

**Files:** `README.md` (Chinese content), `README.zh-CN.md` (English content)
**Issue:** The file `README.md` contains Chinese content and links to `README.zh-CN.md` as "English". The file `README.zh-CN.md` contains English content and links to `README.md` as "简体中文". While the language toggles are consistent and functional, the naming contradicts the `.zh-CN.md` convention where the suffix indicates the content language. New contributors will open `README.md` expecting English and find Chinese, or vice versa.
**Fix:** Either (a) swap file contents so `README.md` = English and `README.zh-CN.md` = Chinese (rename is preferred but breaks existing links), or (b) add a prominent comment at the top of each file clarifying the convention.

### IN-04: CI postinstall-smoke `find` / `wc` pipeline uses fragile `tr -d ' '`

**File:** `.github/workflows/ci.yml:234`
**Issue:** The skill count extraction uses `wc -l | tr -d ' '` to strip whitespace from `wc` output. While this works on both Linux (GNU coreutils) and macOS (BSD coreutils), `wc -l` behavior on filenames with spaces or newlines can produce unexpected output. Here it's piped from `find`, so no filename is printed, making it safe. However, a more robust alternative exists:
**Fix:** Use `wc -l < <(find ...)` or pipe with `awk '{print $1}'` for clarity:
```bash
SKILL_COUNT=$(find "$FAKE_HOME" -name "taiyi-*" -type d 2>/dev/null | wc -l | awk '{print $1}')
```

### IN-05: `@opencode-ai/plugin` declared as both `dependency` and `peerDependency`

**File:** `package.json:74,78-79`
**Issue:** `@opencode-ai/plugin` appears in both sections:
```json
"dependencies": { "@opencode-ai/plugin": ">=1.0.0" },
"peerDependencies": { "@opencode-ai/plugin": ">=1.0.0" }
```
With npm 7+, `peerDependencies` are auto-installed, making the `dependencies` entry redundant. This doesn't break anything but adds confusion: is this a hard dependency (must be installed) or a peer dependency (consumer provides it)? The dual declaration suggests it hasn't been decided.
**Fix:** Choose one pattern. If the plugin is required for core functionality:
```json
"dependencies": { "@opencode-ai/plugin": ">=1.0.0" }
```
If consumers should provide their own:
```json
"peerDependencies": { "@opencode-ai/plugin": ">=1.0.0" },
"peerDependenciesMeta": { "@opencode-ai/plugin": { "optional": true } }
```

---

_Reviewed: 2026-06-15T00:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
