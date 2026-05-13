#!/bin/bash
# Block Bash calls that prepend project-root absolute paths to commands.
# cwd is already the project root — use relative paths.
# Pattern bloats permissions.allow with single-use entries (e.g.
# `Bash(grep -l "..." /Users/you/projects/myrepo/src/...)`)
# because Claude Code's permission matcher treats relative and absolute paths
# as unrelated strings — see anthropics/claude-code#18200.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$COMMAND" ] && exit 0

ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"
[ -z "$ROOT" ] && exit 0

# Block if the command references the project root as an absolute path.
# `grep -F` for a literal substring match — no regex surprises with slashes.
if echo "$COMMAND" | grep -qF "$ROOT"; then
  echo "BLOCKED: command contains absolute path \"$ROOT\". cwd IS already that path. Use relative paths from cwd (e.g. 'src/lib/foo.ts' not '$ROOT/src/lib/foo.ts', 'git diff' not 'git -C $ROOT diff'). Prepending project-root absolute paths bloats permissions.allow with single-use entries — see anthropics/claude-code#18200." >&2
  exit 2
fi

exit 0
