---
name: done?
description: Final checklist before declaring any task complete. Auto-invoke before saying "done", "ready", "complete", or asking to commit/push.
user-invocable: true
---

# Definition of Done

BEFORE declaring done, you MUST complete ALL of the following steps IN ORDER. No skipping. No summarizing. Show proof for each.

## 1. Read dependent skills

You MUST read and follow these skills — not just reference them by name:

- **Read `frontend:validate` skill** and follow every rule in it.
- **Read `frontend:playwright` skill** and follow every rule in it.

Do not proceed until you have read both files in this conversation.

## 2. Browser verification (per `frontend:playwright` rules)

- Navigate to ALL affected page(s) via Playwright MCP.
- For CSS/layout changes: screenshot BEFORE and AFTER.
- For behavior changes: reproduce the exact user flow via Playwright. Automate multi-step flows — no ad-hoc evaluate with unreliable timeouts.
- Take screenshots to `/tmp/` paths. Visually confirm. State what you checked and whether it passed.
- NEVER ask the user to check their browser — that is YOUR job.

## 3. Lint

- Run `pnpm lint` and fix any new errors in files you touched. For per-file linting, use `pnpm lint:file` (eslint, oxlint, tsgo, svelte-check, knip — run concurrently). See SETUP.md for script setup.
- **This includes test files.** Run `pnpm lint:tests`. Must exit 0.

## 4. Full validation

- Run `pnpm validate:build`. Must exit 0. This should run `pnpm validate` (vitest + lint + typecheck + svelte-check) and build tasks (app build, storybook build) concurrently. See SETUP.md for how to configure `validate` and `validate:build` scripts.
- **Exception:** pure CSS-only changes — verify visually via Playwright instead, still run lint + svelte-check.

## 4b. Multiple-run verification for flaky suites

If the work touches storybook tests, vitest browser mode, MSW, or e2e:

- Kill the test server port (`lsof -ti :<port>` → `kill -9`).
- `rm -rf node_modules/.vite node_modules/.cache/storybook`
- Run the affected test command 3x consecutively.
- Compare: counts must match ±0 tests, setup time ±30%.
- If any run differs: NOT done. The suite is flaky. Investigate the flake itself before any "done" claim.
- If my run goes green but the user's run is failing, my run is NOT authoritative. Ask for the user's log/conditions and reproduce their failure before claiming anything.

A single green run on a flaky suite is not verification — it is one possible execution order. The user pays for every false "done" claim in tokens and in time. See `frontend:validate` and `frontend:vitest` skills for the full flake-hygiene protocol.

## 5. Svelte files

- If any `.svelte`, `.svelte.ts`, or `.svelte.js` file was edited: run the Svelte autofixer (`mcp__svelte__svelte-autofixer`) on it.

## 6. CI workflows

- If any `.yml` workflow file was edited: run `pnpx node-actionlint <file>`. Must exit 0.

## 7. Report

State what was verified with evidence (exit codes, screenshots, measurements). Not summaries. Proof.
