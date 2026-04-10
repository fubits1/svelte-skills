# agent

Claude Code plugin for AI coding agent discipline. Four skills that enforce research rigor, pre-action safety checks, structured planning, and completion verification.

Not frontend-specific, not Svelte-specific. Works with any codebase.

Part of the [svelte-skills](https://github.com/fubits1/svelte-skills) marketplace.

## Skills

| Skill | Purpose |
| --- | --- |
| `research` | Investigation discipline -- mandatory research channels (local, docs, online, synthesis), evidence requirements, bullshit gate |
| `before-you-act` | Five-gate self-check: unauthorized action, irreversibility, unverified claims, premature completion, unread output |
| `plan` | Planning and problem-solving -- research-first plans, systematic debugging, survival context for long tasks |
| `done` | Final checklist -- browser verification, lint, full validation, flake detection, evidence-based reporting |

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
