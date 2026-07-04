#!/usr/bin/env bash
# TaiyiForge — L1 shell wrapper for 5-layer semantic verification
# Usage:
#   ./scripts/verify-semantic.sh <slug>            # verify a single change
#   ./scripts/verify-semantic.sh --all             # verify all active changes
#   ./scripts/verify-semantic.sh <slug> --json     # JSON output for tooling
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SLUG="${1:-}"
OUTPUT_MODE="${2:---text}"

if [[ -z "${SLUG}" || "${SLUG}" == "--all" ]]; then
  CHANGES_DIR="${ROOT_DIR}/.taiyi/changes"
  if [[ ! -d "${CHANGES_DIR}" ]]; then
    echo ":: No changes directory found at ${CHANGES_DIR}"
    exit 0
  fi
  for slug_dir in "${CHANGES_DIR}"/*/; do
    slug_name="$(basename "${slug_dir}")"
    echo "===== ${slug_name} ====="
    "${BASH_SOURCE[0]}" "${slug_name}" "${OUTPUT_MODE}"
    echo ""
  done
  exit 0
fi

# Build if needed
TAIYI_CLI="${ROOT_DIR}/dist/cli/taiyi.js"
if [[ ! -f "${TAIYI_CLI}" ]]; then
  echo ":: Building TaiyiForge first (dist/cli/taiyi.js not found)..."
  (cd "${ROOT_DIR}" && npm run build)
fi

RESULT=$(node --input-type=module -e "
import { runSemanticVerify } from '${ROOT_DIR}/dist/core/gates/semantic-gate.js';
const result = runSemanticVerify('${ROOT_DIR}', '${SLUG}');
console.log(JSON.stringify(result, null, 2));
" 2>&1)

if [[ "${OUTPUT_MODE}" == "--json" ]]; then
  echo "${RESULT}"
else
  echo "${RESULT}" | node --input-type=module -e "
  import { readFileSync } from 'fs';
  const input = readFileSync('/dev/stdin', 'utf8').trim();
  const result = JSON.parse(input);
  console.log('Semantic Verification — ' + result.summary);
  console.log('');
  for (const check of result.checks) {
    const icon = check.passed ? '✓' : '✗';
    console.log('  ' + icon + ' [' + check.code + '] ' + check.label);
    if (check.detail) {
      console.log('      ' + check.detail);
    }
  }
  console.log('');
  if (result.passed) {
    console.log('Semantic gate: PASS');
  } else {
    console.log('Semantic gate: BLOCK');
    process.exitCode = 1;
  }
  "
fi
