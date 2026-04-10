#!/usr/bin/env bash
# test-file.sh — run vitest for specific test files (node + browser projects)
# usage: ./scripts/test-file.sh <file-pattern>
# example: ./scripts/test-file.sh autocomplete
# example: ./scripts/test-file.sh datepicker
# vitest uses positional args for file filtering

set -uo pipefail

if [ $# -eq 0 ]; then
  echo "usage: $0 <filePattern>"
  exit 1
fi

PATTERN="$1"

pnpm exec vitest run --project node --project browser --reporter verbose "$PATTERN" 2>&1
