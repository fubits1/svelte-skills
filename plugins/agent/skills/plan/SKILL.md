---
name: plan
description: Planning, problem-solving approach, and systematic debugging. Auto-invoke when user says "plan", when debugging, fixing issues, or implementing features.
user-invocable: true
---

# Plan

- When the user says "plan", "plan this", "make a plan", or any variant — ENTER PLAN MODE. Write the plan in the plan file. NOT in chat. NOT in a table. NOT in a code block.
- Plans in chat are worthless. The plan file is the only place plans belong.
- NEVER skip plan mode because "it's simple enough". If the user said plan, they mean plan.
- **Self-trigger:** also plan WITHOUT being asked when: (1) a CI failure has multiple root causes, (2) the first fix attempt failed, (3) you're about to touch 3+ files.
- **A plan is NOT a list of edits.** A plan MUST include:
  1. **Research** — what do I need to verify before touching anything? What docs to check? What commands to run? What assumptions need proof?
  2. **Validation** — how will I verify each step worked? What does success look like? What are the failure modes?
  3. **Implementation** — only AFTER research and validation strategy are defined.
- NEVER jump to implementation. Research first, define validation criteria, then plan the changes.
- Every assumption in the plan must have a verification step. "I think X works" is not a plan — "verify X by running Y, then proceed" is.
- **Plans must contain survival context.** Save test URLs, route paths, IDs, and exact verification steps in the plan file — conversation context doesn't survive resets.
- **When incorporating a sub-plan, INCLUDE by reference.** Add `**Full detail:** plan-name.md` and keep the sub-plan file intact. NEVER rewrite as a lossy summary. The sub-plan IS the detail.
- **When told to "update the plan," UPDATE THE PLAN FILE.** Not a chat summary. Not a mental note. Open the plan file and edit it.
- **NEVER include commit or push steps in a plan.** Git operations are the user's business, not yours.

## Problem-Solving Approach

- Simplest fix first. Don't hallucinate root causes.
- Don't over-engineer. Use framework standard solutions.
- Follow the approved plan. Don't silently deviate during implementation.
- Stop chaining fixes on a broken foundation. Reassess the whole approach.
- Never dismiss errors as "pre-existing" or "out of scope". Acknowledge ALL failures and ask "Want me to look into fixing these too?"
- NEVER suggest "parking" a bug or "moving on". If there's a visible issue, fix it immediately.
- **Before editing ANY file, verify the FULL chain of assumptions** (command, port, env vars, all referencing files). All changes in one pass, never iteratively.
- **When splitting a config value from global to per-item**, preserve the original value for items that weren't asked to change.
- **When changing a wrapper/shared default that affects ALL consumers**, test EVERY consumer pattern — not just one edge case.

## Systematic Debugging

**REQUIRED:** Also invoke `superpowers:systematic-debugging` for complex bugs.

When encountering a bug, test failure, or unexpected behavior — BEFORE proposing any fix:

1. **STOP repeating.** If the same action failed twice, it will fail a third time. After two identical failures, change your hypothesis.
2. **Read ALL the output.** Not just the first error. CI logs, test output, console errors — read the FULL output. Multiple root causes are common.
3. **Trace the FULL code path.** Follow the exact execution path from trigger to failure. Check CHILD component imports too — grep children for the pattern, not just the parent.
4. **Debug in the REAL environment first.** Mocked tests that pass prove nothing about real-app behavior. Browser first (Playwright), then write tests that match what the browser showed.
5. **One hypothesis at a time.** Change one thing, verify, then next. Never batch unrelated changes.
6. **Wrappers swallow errors.** When a wrapper component (CardWrapper, ErrorBoundary, etc.) is between you and the bug, the wrapper is NOT the root cause — it's hiding the real one. Debug in the browser with Playwright, not in vitest output.
