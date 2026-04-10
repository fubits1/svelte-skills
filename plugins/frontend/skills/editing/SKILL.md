---
name: editing
description: File editing discipline — preserving comments, using correct types, refactoring safely. Auto-invoke when editing code files.
user-invocable: true
---

# Editing Files

- Comments start with a lowercase letter: `// unmount svelte components...`
- **Comments must be noise-free and concise.** A comment must say WHY, not WHAT — the code already says what. Never restate what the code does in English. Never add filler like "fire-and-forget", "for safety", "just in case". If a comment doesn't teach the reader something they can't see from the code, delete it. Every token in a comment must earn its place.

  ```typescript
  // ❌ BAD: restates what void does
  // fire-and-forget the unmount promise
  void unmount(marker._popupComponent);

  // ❌ BAD: vague filler
  // no outro transition to wait for in tests
  void unmount(marker._popupComponent);

  // ✅ GOOD: says WHY the unusual syntax exists
  // svelte 5 unmount() is async — void satisfies no-floating-promises
  void unmount(marker._popupComponent);
  ```

- NEVER remove existing comments — not with Write, not with Edit, not ever. Modifying a comment is OK, but NEVER lose information from it (e.g. removing a keyword like HINT, TODO, or a cross-reference). If adding context, append — don't replace. Diff after to check.
- **TODO/comment placement:** put the comment directly above the line it describes, not somewhere else. Include the replacement command in the comment so whoever reads it knows exactly what to do. Never write "see TODO above" — if the reader has to search for context, the comment is useless. For each TODO - one block, one location, full context.
- Never use `any`, `unknown`, `ts-ignore`, or `eslint-disable` — fix the actual issue. Never use eslint-disable with fake justifications (e.g. "reserved for future", "API consistency"). If code is unused, delete it or wire it up.
- Refactors: grep entire codebase for ALL occurrences FIRST, then fix in one pass. Before removing any conditional logic, enumerate ALL callers and triggers (click, back/forward, programmatic navigation, keyboard, etc.). If ANY trigger still needs the old logic, keep it.
- When adding state management, trace ALL code paths before declaring done.
- Use Svelte components, not raw HTML strings. No `.setHTML()` or template literals.
- `.svelte` or `.svelte.ts/.svelte.js` files: ALWAYS invoke `svelte:svelte-code-writer` skill BEFORE writing or editing. No exceptions.
- `.svelte`, `.svelte.ts`, `.svelte.js` files: ALWAYS run the Svelte autofixer (`mcp__svelte__svelte-autofixer`) after editing to validate Svelte 5 correctness.
- When user says "test first" or "write failing test": write the test, run it, confirm it FAILS, only then implement the fix. Never apply both in the same pass.
- **Don't export types without checking if any consumer imports them.** Run knip via `pnpm lint:file` to catch unused exports (see SETUP.md). If it's only used internally, keep it private.
- **Before writing a config override**, check what it overrides. If per-item value equals the inherited default, the override does nothing — don't write it.
- **Markdown files:** after writing or editing any `.md` file, run `npx markdownlint-cli <file>` and fix all errors before declaring done.
- **Visual refactors (CSS, inline styles, class: directives, layout changes):** Follow this workflow BEFORE editing:
  1. Ensure a Storybook story exists for the component. If not, write one first.
  2. Open the story in the browser via Playwright MCP and take a BEFORE screenshot (`/tmp/before-<component>.png`).
  3. Apply the refactor.
  4. Take an AFTER screenshot (`/tmp/after-<component>.png`).
  5. Compare visually. If anything shifted, fix it before declaring done.
     If changes are already applied without a before screenshot: `git stash`, screenshot, `git stash pop`, screenshot, compare.
