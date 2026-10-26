---
name: editing
description: "File editing discipline: correct types, safe refactors, Svelte file rules, config overrides, markdown lint, visual refactors. Requires frontend:code-style and frontend:comments. Auto-invoke when editing code files."
user-invocable: true
---

# Editing Files

**REQUIRED SUB-SKILLS:** invoke `frontend:code-style` and `frontend:comments` before you write or edit code or any comment, even when you add no comment: a rewrite with Write can drop existing comments.

- In markdown and other prose:
  - no trailing period on fragments (headers, bullets that aren't full sentences, single-noun phrases): `- open /maplibre?debug` not `- open /maplibre?debug.`
  - A full-sentence bullet starts with a capital letter and ends with a period.
  - no space between number and unit: `30s` not `30 s`
- Never use `any` or `unknown`: fix the actual issue.
- Never use a lint or TypeScript directive (`eslint-disable`, `oxlint-disable`, `svelte-ignore`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`) to silence a real defect, except as allowed below: fix the actual issue. If code is unused, delete it or wire it up. A directive is allowed only when:
  - the user asks for it
  - a specific constraint requires the code as written (a `Map` that must not be reactive)
  - a known defect can't be fixed in this change; then the reason is a FIXME or TODO that says what needs fixing and why it can't be fixed now

  A directive covers the narrowest scope its tool offers and gives the reason: `// eslint-disable-next-line <rule> -- <reason>`, `<!-- svelte-ignore <code> (<reason>) -->`, `// @ts-expect-error <reason>`. "Reserved for future" or "API consistency" is not a reason.
- Refactors: grep entire codebase for ALL occurrences FIRST, then fix in one pass. Before removing any conditional logic, enumerate ALL callers and triggers (click, back/forward, programmatic navigation, keyboard, etc.). If ANY trigger still needs the old logic, keep it.
- When adding state management, trace ALL code paths before declaring done.
- Use Svelte components, not raw HTML strings. No `.setHTML()` or template literals.
- **`.svelte` / `.svelte.ts` / `.svelte.js` files: prefer delegating creation, editing, and review to the `svelte:svelte-file-editor` subagent.** It runs in a separate context window, so its docs lookup and autofixer iteration don't spend the main agent's context. Name the subagent in your dispatch to delegate, and tell it to invoke `frontend:editing`. When editing inline instead (small change, subagent unavailable, or you are that subagent), follow the two rules below.
- `.svelte` or `.svelte.ts/.svelte.js` files: ALWAYS invoke `svelte:svelte-code-writer` skill BEFORE writing or editing. No exceptions.
- `.svelte`, `.svelte.ts`, `.svelte.js` files: ALWAYS run the Svelte autofixer (`mcp__plugin_svelte_svelte__svelte-autofixer`) after editing to validate Svelte 5 correctness.
- When user says "test first" or "write failing test": write the test, run it, confirm it FAILS, only then implement the fix. Never apply both in the same pass.
- **Don't export types without checking if any consumer imports them.** Run knip via `pnpm lint:file` to catch unused exports (see [SETUP.md](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md)). If it's only used internally, keep it private.
- **Before writing a config override**, check what it overrides. If per-item value equals the inherited default, the override does nothing: don't write it.
- **Markdown files:** after writing or editing any `.md` file, run `pnpm exec markdownlint <file>` (`pnpm dlx markdownlint-cli <file>` if it isn't installed) and fix all errors before declaring done.
- **Visual refactors (CSS, inline styles, class: directives, layout changes):** Follow this workflow BEFORE editing:
  1. Ensure a Storybook story exists for the component. If not, write one first.
  2. Open the story in the browser via Playwright MCP and take a BEFORE screenshot (`/tmp/before-<component>.png`).
  3. Apply the refactor.
  4. Take an AFTER screenshot (`/tmp/after-<component>.png`).
  5. Compare visually. If anything shifted, fix it before declaring done.
     If changes are already applied without a before screenshot: `git stash`, screenshot, `git stash pop`, screenshot, compare.
