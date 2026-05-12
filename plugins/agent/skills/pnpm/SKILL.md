---
name: pnpm
description: Package manager rules — always pnpm, never npm/npx, socket checks before installing. Auto-invoke when installing packages or running project tools.
user-invocable: true
---

# pnpm

- Always `pnpm`. Never npm/npx.
- `pnpm exec` or `pnpx` to run project tools, not `npx`.
- `socket npm/<pkg>` to check score BEFORE installing. Then install with `pnpm add`.
- **Always use official migration/upgrade tools when they exist** (e.g. `pnpx @astrojs/upgrade`, `pnpx svelte-migrate`, `pnpx @next/codemod`). Never manually edit version numbers in package.json when a migration CLI is available.
- **Test script layout:** `pnpm test` runs vitest + e2e concurrently (via `concurrently`). `pnpm test:unit` runs vitest only. `pnpm test:e2e` runs Playwright e2e only. `pnpm validate` runs vitest (not e2e) + lint + typecheck + svelte-check.
