#!/usr/bin/env bash
set -euo pipefail

# CONFIGURABLE: directories to search for test files
FILES=$(find src tests -name '*.test.ts' -not -path '*/node_modules/*' -not -path '*__screenshots__*' | tr '\n' ' ')

# filter-errors: run a command, show only .test.ts errors, exit non-zero if any found
filter_test_errors() {
  local name="$1"; shift
  local output
  output=$("$@" 2>&1) || true
  local test_errors
  test_errors=$(echo "$output" | grep -E '\.test\.ts' || true)
  if [ -n "$test_errors" ]; then
    echo "$test_errors"
    echo "[$name] FAILED — errors in test files"
    exit 1
  fi
}

export -f filter_test_errors

# Adapt: knip.tests.jsonc → your knip config for test files
# Adapt: tsconfig.tests.json → your tsconfig that includes test files
concurrently --group --names oxlint,eslint,knip,svelte-check \
  "oxlint $FILES" \
  "eslint $FILES" \
  "knip --config knip.tests.jsonc --include files,exports" \
  "bash -c 'filter_test_errors svelte-check svelte-check --tsconfig tsconfig.tests.json --tsgo --threshold error'"
