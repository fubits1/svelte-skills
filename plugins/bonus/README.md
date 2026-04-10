# bonus

Optional hooks and skills for Claude Code. Part of the [svelte-skills](https://github.com/fubits1/svelte-skills) marketplace.

No dependencies on other plugins. Install standalone or alongside the rest.

## Skills

### discipline (SessionStart hook forces invocation)

Communication and scope discipline — how to interact with the user, handle rejection, stay in scope. Enforces rules like: one question at a time, no fabricated numbers, don't claim fixed from a single run, user's evidence wins when runs disagree.

A SessionStart hook forces `/discipline` to be invoked at the start of every session.

## Hooks

### nogrep (PreToolUse on Bash)

Blocks Bash calls that should use dedicated tools (Grep, Read, Glob). Dedicated tools are auto-allowed in the IDE — zero permission clicks. Bash equivalents (grep, cat, find, head, tail, sed, awk, wc) require user approval every time.

Also blocks git commands via Bash (use `gh` or `! git` instead) and piped search tools (`something | grep`).

See [anthropics/claude-code#19649](https://github.com/anthropics/claude-code/issues/19649) for context.

### fix-formatting (PostToolUse on Write|Edit)

Runs Prettier on edited files after every Write/Edit. Fixes Claude's tabs vs spaces inconsistency automatically.

- `.ts`, `.js`, `.svelte`, `.css`, `.scss`, `.json` — formatted with Prettier
- `.md` — formatted with markdownlint-cli2 `--fix` (Prettier pads markdown tables, so it's skipped for `.md`)

Requires `prettier` and `markdownlint-cli2` as dev dependencies in your project.

## Installation

```
/plugin marketplace add fubits1/svelte-skills
/plugin install bonus
```
