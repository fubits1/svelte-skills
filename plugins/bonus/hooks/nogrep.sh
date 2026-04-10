#!/bin/bash
# Block Bash calls that should use dedicated tools (Grep, Read, Glob).
# Dedicated tools are auto-allowed — zero permission clicks in the IDE.
# This hook hard-blocks (exit 2) the Bash call and tells Claude which tool to use.
# See: https://github.com/anthropics/claude-code/issues/19649

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$COMMAND" ] && exit 0

# Extract the first word (the command being run)
FIRST_WORD=$(echo "$COMMAND" | sed 's/^[[:space:]]*//' | awk '{print $1}')

case "$FIRST_WORD" in
  git)
    # Allow git mv (file renames — required by CLAUDE.md)
    if echo "$COMMAND" | grep -qE '^\s*git\s+mv\b'; then
      exit 0
    fi
    echo "BLOCKED: NEVER use Bash for git commands. Use gh (auto-allowed) for remote state, or suggest the user run ! git <command> for local operations." >&2
    exit 2
    ;;
  grep|egrep|fgrep|rg)
    echo "BLOCKED: Use the Grep tool instead of Bash $FIRST_WORD. Grep supports: multiline: true, output_mode (content/files_with_matches/count), -A/-B/-C context, -i case-insensitive, glob/type filtering, head_limit, offset. Zero permission clicks." >&2
    exit 2
    ;;
  cat)
    echo "BLOCKED: Use the Read tool instead of Bash cat. Read supports: offset, limit (for head/tail behavior). Line numbers included by default. Zero permission clicks." >&2
    exit 2
    ;;
  head|tail)
    echo "BLOCKED: Use the Read tool instead of Bash $FIRST_WORD. Read supports: offset (start line), limit (number of lines). Zero permission clicks." >&2
    exit 2
    ;;
  find)
    echo "BLOCKED: Use the Glob tool instead of Bash find. Glob supports: pattern (e.g. '**/*.ts', '**/*test*'). Zero permission clicks." >&2
    exit 2
    ;;
  sed)
    # Only block sed used for reading (sed -n 'Np', sed -n 'N,Mp')
    if echo "$COMMAND" | grep -qE "sed\s+(-n\s+)?'[0-9]"; then
      echo "BLOCKED: Use the Read tool instead of Bash sed for reading file ranges. Read supports: offset, limit. Zero permission clicks." >&2
      exit 2
    fi
    # sed for substitution is a legitimate Bash use — allow it
    exit 0
    ;;
  awk)
    echo "BLOCKED: Use the Grep tool (for searching) or Read tool (for reading) instead of Bash awk. Zero permission clicks." >&2
    exit 2
    ;;
  wc)
    echo "BLOCKED: Use the Grep tool with output_mode: 'count' instead of Bash wc. Zero permission clicks." >&2
    exit 2
    ;;
esac

# Catch piped search tools: something | grep, something | awk, something | wc
# NOTE: head/tail pipes are allowed (truncating output from pnpm test etc. is legit)
if echo "$COMMAND" | grep -qE '\|\s*(grep|egrep|fgrep|rg|awk|wc)\b'; then
  echo "BLOCKED: Piped grep/awk/wc detected. Use the Grep tool instead — it supports head_limit and offset natively. Zero permission clicks." >&2
  exit 2
fi

exit 0
