#!/usr/bin/env bash
# test-story.sh — run storybook vitest for specific story files
# usage: ./scripts/test-story.sh <file-pattern>
# example: ./scripts/test-story.sh MaterialPropertySelection
# example: ./scripts/test-story.sh AddressData
# vitest uses positional args for file filtering

set -uo pipefail

if [ $# -eq 0 ]; then
  echo "usage: $0 <filePattern>"
  exit 1
fi

PATTERN="$1"

pnpm exec vitest run --project storybook --silent --reporter verbose "$PATTERN" 2>&1
