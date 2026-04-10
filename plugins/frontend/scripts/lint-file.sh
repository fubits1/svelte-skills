#!/usr/bin/env bash
# lint-file.sh — run all lint/type checks on specific files
# usage: ./scripts/lint-file.sh <file-or-glob> [file2] [file3] ...
# example: ./scripts/lint-file.sh src/lib/autocomplete/AutocompleteInputField.svelte
# example: ./scripts/lint-file.sh src/lib/autocomplete/*.svelte

set -uo pipefail

if [ $# -eq 0 ]; then
  echo "usage: $0 <file-or-glob> [file2] ..."
  exit 1
fi

FILES=("$@")
FAILED=0

red() { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
bold() { printf '\033[1m%s\033[0m\n' "$1"; }

run_check() {
  local label="$1"
  shift
  bold "── $label ──"
  if "$@" 2>&1; then
    green "✓ $label"
  else
    red "✗ $label"
    FAILED=1
  fi
  echo
}

# 1. eslint
run_check "eslint" pnpm exec eslint "${FILES[@]}"

# 2. oxlint
run_check "oxlint" pnpm exec oxlint "${FILES[@]}"

# 3. tsgo --noEmit, filtered to only show errors in the specified files
bold "── tsgo ──"
TSGO_PATTERN=$(printf '%s\n' "${FILES[@]}" | sed 's/[.[\*^$()+?{}|]/\\&/g' | paste -sd '|' -)
TSGO_OUTPUT=$(pnpm exec tsgo --noEmit 2>&1 | grep -E "^($TSGO_PATTERN)" || true)
if [ -n "$TSGO_OUTPUT" ]; then
  echo "$TSGO_OUTPUT"
  red "✗ tsgo"
  FAILED=1
else
  green "✓ tsgo"
fi
echo

# 4. svelte-check, filtered to only show errors in the specified files
# tsgo misses .svelte template type errors — svelte-check catches them
HAS_SVELTE=false
for f in "${FILES[@]}"; do
  if [[ "$f" == *.svelte ]]; then
    HAS_SVELTE=true
    break
  fi
done
if [ "$HAS_SVELTE" = true ]; then
  bold "── svelte-check ──"
  SC_PATTERN=$(printf '%s\n' "${FILES[@]}" | grep '\.svelte$' | sed 's/[.[\*^$()+?{}|]/\\&/g' | paste -sd '|' -)
  SC_TMPFILE=$(mktemp)
  pnpm exec svelte-check --tsconfig ./tsconfig.json --threshold error > "$SC_TMPFILE" 2>&1 || true
  SC_OUTPUT=$(grep -E "($SC_PATTERN)" "$SC_TMPFILE" || true)
  rm -f "$SC_TMPFILE"
  if [ -n "$SC_OUTPUT" ]; then
    echo "$SC_OUTPUT"
    red "✗ svelte-check"
    FAILED=1
  else
    green "✓ svelte-check"
  fi
  echo
fi

# 5. knip (unused exports/types), filtered to specified files
bold "── knip ──"
KNIP_PATTERN=$(printf '%s\n' "${FILES[@]}" | sed 's/[.[\*^$()+?{}|]/\\&/g' | paste -sd '|' -)
KNIP_OUTPUT=$(pnpm exec knip --exports --no-progress 2>&1 | grep -E "($KNIP_PATTERN)" || true)
if [ -n "$KNIP_OUTPUT" ]; then
  echo "$KNIP_OUTPUT"
  red "✗ knip"
  FAILED=1
else
  green "✓ knip"
fi
echo

if [ $FAILED -eq 0 ]; then
  green "═══ ALL CHECKS PASSED ═══"
else
  red "═══ SOME CHECKS FAILED ═══"
  exit 1
fi
