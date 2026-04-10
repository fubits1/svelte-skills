---
name: validate
description: Validation discipline for all code changes — testing, baselines, browser checks, CSS screenshots. Auto-invoke whenever making code changes, running tests, or declaring a task done.
user-invocable: true
---

# Validation

- **Browser FIRST.** Before running any CLI validation, verify your changes work in the browser via Playwright. Navigate to affected pages, confirm the feature works, take screenshots. Broken code that passes lint is still broken. Browser is the source of truth.
- **Browser verification: see `frontend:playwright` skill** for all rules on screenshots, critical examination, `browser_evaluate` measurements, and visual debugging. NEVER ask the user to check their browser — that is YOUR job.
- **FLAKY SUITES NEED MULTIPLE RUNS.** Storybook/browser/e2e/MSW tests are flaky on a single run. Before declaring green, run 3x in a row from a clean state — kill the test server port, delete `node_modules/.vite` and `node_modules/.cache/storybook`, then run. ALL three must pass. One green run is meaningless.
- **SETUP TIME VARIANCE IS A FLAKE FLAG.** If the same suite shows setup time varying by >30% between runs (e.g. 100s vs 200s), the runs are not equivalent — one of them is silently skipping imports. Do not trust either count until you understand why.
- **MATCH THE USER'S RUN CONDITIONS.** When the user reports a failing run, reproduce their EXACT state before claiming a fix worked: same branch, same lockfile, same cache state. If I cannot reproduce their failure, I say so out loud — I do not paper over it with my own green output from a different cache state.
- **`Test Files N passed (N)` ≠ verification.** Always cross-check the test count against the expected total. A run that "passes 85/85" but only executes 147 of 192 tests has silently skipped 24% of the suite.
- Before declaring done/fixed: run `pnpm validate` (vitest + lint + typecheck + svelte-check). Must exit 0. **Exception:** pure CSS-only changes don't need a build — verify visually via Playwright instead and lint / vitest / svelte-check.
- Run `pnpm test:unit` (vitest) after every change. `pnpm test` also launches e2e tests which need a dev server — use `pnpm test:unit` for quick feedback.
- Test in the correct mode: dev changes → `pnpm dev`, not `pnpm build`.
- Exit code 0 or it's not verified. Crashes ≠ passes.
- Crashed baseline ≠ valid baseline. Incomplete runs have meaningless timing.
- Timed-out command = failed verification. Task is NOT done.
- Single-file success ≠ full-run success. Always run the full command.
- Get a baseline BEFORE making config changes, then compare.
- Never declare "done" when error counts drop. Compare rule-by-rule.
- Unit tests prove nothing about component APIs — verify in browser (see `frontend:playwright` skill).
- `pnpm test` does NOT verify MSW handlers, fixtures, or Storybook rendering.
- If `pnpm validate` exists in package.json, run it as the final verification step. It combines vitest + lint + typecheck + svelte-check.
- When fixing a bug found via browser interaction: reproduce the exact user flow via Playwright BEFORE declaring done.
- Never declare "done" when verification failed or was skipped.
- Show proof, not summaries.
- **VALIDATE AFTER EVERY SINGLE FILE EDIT.** Not after a batch. Edit one file → run checks → confirm 0 errors → only then move to next file. NEVER batch edits across multiple files without validating between them.
- **`pnpm lint:file <file>`** — run this on every edited file. It runs eslint + oxlint + tsgo (filtered to that file) + svelte-autofixer in one command. `pnpm check` alone does NOT catch TS2448/TS2454 (block-scoped variable used before declaration). `tsgo --noEmit` does. This script covers both.
- `.svelte`, `.svelte.ts`, `.svelte.js` files: ALWAYS run the Svelte autofixer (`mcp__svelte__svelte-autofixer`) after editing to validate Svelte 5 correctness. (`pnpm lint:file` already includes this.)
- **CI workflow changes: simulate the CI environment locally before pushing.** Run commands with `CI=true GITHUB_ACTIONS=true` to catch tools that auto-detect CI and change behavior (e.g. oxlint switches to `--format=github`). NEVER push a CI "fix" without local CI simulation first.
- **GitHub Actions workflow files:** ALWAYS run `pnpx node-actionlint <file>` after editing any `.yml` workflow file. Exit code 0 or it's not valid.
- **Use `pnpm validate:build`** as the final verification — runs validation and build tasks concurrently. See SETUP.md for how to configure this script. One command, everything checked.
- **Run the TEST TYPE you changed.** If you modified Playwright tests, run `pnpm test:e2e`. If you modified vitest tests, run `pnpm test:unit`. `pnpm validate` only runs vitest — it does NOT run Playwright e2e. Changed tests must actually execute and pass.
- **LINT TEST FILES: `pnpm lint:tests`.** One command, runs all 5 linters (oxlint, tsgo, eslint, knip, svelte-check) on test files concurrently. Must exit 0. Do NOT run individual linters — you WILL forget one.
- **One problem at a time.** Fix ONE problem, verify it passes, then move to the next. Never batch unrelated changes — changing two things at once makes it impossible to tell which change broke what.
- **Capture expensive test output.** When running Playwright or e2e tests, pipe to `tee /tmp/test-output.log`. If output is already in context, READ IT — never rerun. NEVER run the same expensive command twice in a row just to grep differently.
- **Final checklist before declaring done:** Browser verified? Linted? `pnpm validate:build` exit 0? CI workflows edited → `pnpx node-actionlint`?
- **NEVER trust subagent claims.** After EVERY subagent completes, run `git diff` to see what actually changed. Subagents can claim "done, no changes needed" while having silently modified files, or claim "fixed" while having broken something. Never tell the user "I didn't change that" without checking git first.
