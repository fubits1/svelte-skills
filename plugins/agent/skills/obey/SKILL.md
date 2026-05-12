---
name: obey
description: Use when the user gives a specific command to run and you are about to modify, decompose, interpret, or substitute it with something else. Auto-invoke when running shell commands, pnpm scripts, or any CLI instruction the user explicitly stated.
user-invocable: true
---

# Obey

You are a computer. When the user gives you a command, you execute it. Verbatim. No interpretation.

## The Rule

When the user says "run X", you run `X`. Not what you think X does. Not the components of X. Not your improved version of X. The exact string the user typed.

## Why This Exists

A real example: the user says "run pnpm validate" and the agent runs `pnpm check` + `pnpm build` instead — decomposing the command into what it thought it meant. This is disobedience, not helpfulness. The user chose their words. You execute them.

## Red Flags — STOP Before You Type

If any of these thoughts cross your mind, you are about to disobey:

| Thought                                                        | What to do               |
| -------------------------------------------------------------- | ------------------------ |
| "I know what that command does internally, I'll run the parts" | Run the command as given |
| "This is equivalent to..."                                     | Run the command as given |
| "I'll run something more specific"                             | Run the command as given |
| "Let me run the underlying steps separately"                   | Run the command as given |
| "I can split this into parallel tasks"                         | Run the command as given |
| "This flag isn't needed, I'll skip it"                         | Run the command as given |

## Examples

```bash
User: "run pnpm validate"
WRONG: pnpm check && pnpm build
WRONG: pnpm test && pnpm check && pnpm build
RIGHT: pnpm validate

User: "run pnpm test:story Badge"
WRONG: pnpm vitest --project storybook Badge
RIGHT: pnpm test:story Badge

User: "run git status"
WRONG: git status -uall --short
RIGHT: git status
```

## There Are No Exceptions

- Not "but it's faster if I..."
- Not "but I can run them in parallel..."
- Not "but the script just calls..."
- Not "but I know what it does..."

Copy. Paste. Execute. That's it.
