# agent

Claude Code plugin for AI coding agent discipline. Twelve skills that enforce research rigor, pre-action safety checks, structured planning, completion verification, day-to-day execution discipline (git safety, dev server lifecycle, command obedience, supply-chain checks), and a meta-skill for syncing skill collections.

Not frontend-specific, not Svelte-specific. Works with any codebase.

Part of the [svelte-skills](https://github.com/fubits1/svelte-skills) marketplace.

## Skills

| Skill | Purpose |
| --- | --- |
| `research` | Investigation discipline -- mandatory research channels (local, docs, online, synthesis), evidence requirements, bullshit gate |
| `before-you-act` | Five-gate self-check: unauthorized action, irreversibility, unverified claims, premature completion, unread output |
| `plan` | Planning and problem-solving -- research-first plans, systematic debugging, survival context for long tasks |
| `done` | Final checklist -- browser verification, lint, full validation, flake detection, evidence-based reporting |
| `asshole` | Never dismiss failures as "not my problem" when reporting test/build output |
| `dev-server` | Background-process lifecycle -- never start the user's server, kill cleanups, port safety |
| `git` | Git safety -- `git mv` for renames, no `stash`, no destructive resets, no deletion of dirty files |
| `nogrep` | Use fff MCP / Grep / Read / Glob instead of Bash for file search/read (paired with the `bonus` plugin's enforcement hook) |
| `obey` | Run user-given commands verbatim -- no decomposition, no "equivalent" substitutions |
| `pnpm` | Always pnpm (never npm/npx), socket checks before install, official migration CLIs |
| `socket` | Supply-chain checks via Socket.dev -- score evaluation before `pnpm add`, project scans |
| `update-skills` | Reconcile two skill collections -- backport from a source dir into a marketplace, with proprietary-reference scrubbing |

## Prerequisites

The `superpowers` plugin must be installed. The `plan` skill references `superpowers:systematic-debugging` for complex bug investigations.

## Dependency chain

This plugin sits at the base of the `svelte-skills` marketplace dependency chain:

```
agent  <--  frontend  <--  svelte-5  <--  svelte-5-migration
```

Each layer builds on the previous one. `agent` has no dependency on the plugins to its right.

## Installation

See the [svelte-skills marketplace README](https://github.com/fubits1/svelte-skills) for installation and setup instructions.
