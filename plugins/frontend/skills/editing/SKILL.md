---
name: editing
description: File editing discipline, preserving comments, using correct types, refactoring safely. Auto-invoke when editing code files.
user-invocable: true
---

# Editing Files

- Comments start with a lowercase letter: `// unmount svelte components...`
- No trailing period on bullet points or incomplete sentences (headers, fragments, single-noun-phrase comments). e.g. `- open /maplibre?debug` not `- open /maplibre?debug.`; `// close event listener` not `// close event listener.`
- No space between number and unit: `30s` not `30 s`.
- **Lengthy and important comments belong in `/** */` blocks**, not in stacked `//` lines. Use `//` for short single-line comments and inline notes. Anything that explains a non-obvious invariant, a multi-step rationale, or warns about a foot-gun goes in a JSDoc-style block so it stands out and IDEs/tooling render it. Place the block directly above the construct it describes (function, method, branch, or key statement).

  ```typescript
  // ❌ BAD: stacked // lines for a multi-paragraph rationale
  // programmatic closes (showPopup, closePopup) reassign or clear
  // activePopup before remove(), so the comparison fails for those
  // and the listener returns. user-initiated closes still match.
  popup.on('close', () => { ... })

  // ✅ GOOD: lengthy/important rationale in a /** */ block
  /**
   * close event listener
   *
   * programmatic closes (showPopup, closePopup) reassign or clear
   * activePopup before remove(), so the comparison fails for those
   * and the listener returns. user-initiated closes still match.
   */
  popup.on('close', () => { ... })

  // ✅ GOOD: short single-line note stays inline
  // reassign before remove() so the close listener sees activePopup !== popup
  this.activePopup = popup
  ```

- **A comment you write or touch defaults to DELETE: it earns its place or it goes.** This removes only noise: information-bearing comments are protected by the never-remove rule below, which outranks it. For the survival test that decides whether a comment earns its place, the ban-list, and the removal procedure, see [references/comments.md](references/comments.md).

  ```typescript
  // ❌ BAD: restates what void does
  // fire-and-forget the unmount promise
  void unmount(marker._popupComponent);

  // ✅ GOOD: says WHY the unusual syntax exists
  // svelte 5 unmount() is async, void satisfies no-floating-promises
  void unmount(marker._popupComponent);
  ```

- NEVER remove an existing information-bearing comment: not with Write, not with Edit, not ever. This outranks the default-DELETE above: when a comment carries information (a keyword like HINT/TODO/FIXME, a cross-reference, a non-obvious WHY), it is protected and default-DELETE does not touch it. Modifying such a comment is OK, but NEVER lose information from it. If adding context, append, don't replace. Diff after to check.
- **TODO/comment placement:** put the comment directly above the line it describes, not somewhere else. Include the replacement command in the comment so whoever reads it knows exactly what to do. Never write "see TODO above": if the reader has to search for context, the comment is useless. For each TODO - one block, one location, full context.
- Never use `any`, `unknown`, `ts-ignore`, or `eslint-disable`: fix the actual issue. Never use eslint-disable with fake justifications (e.g. "reserved for future", "API consistency"). If code is unused, delete it or wire it up.
- Refactors: grep entire codebase for ALL occurrences FIRST, then fix in one pass. Before removing any conditional logic, enumerate ALL callers and triggers (click, back/forward, programmatic navigation, keyboard, etc.). If ANY trigger still needs the old logic, keep it.
- When adding state management, trace ALL code paths before declaring done.
- Use Svelte components, not raw HTML strings. No `.setHTML()` or template literals.
- **`.svelte` / `.svelte.ts` / `.svelte.js` files: prefer delegating creation, editing, and review to the `svelte:svelte-file-editor` subagent.** It runs in a separate context window, so its docs lookup and autofixer iteration don't spend the main agent's context. Name the subagent in your dispatch to delegate. When editing inline instead (small change, or subagent unavailable), follow the two rules below.
- `.svelte` or `.svelte.ts/.svelte.js` files: ALWAYS invoke `svelte:svelte-code-writer` skill BEFORE writing or editing. No exceptions.
- `.svelte`, `.svelte.ts`, `.svelte.js` files: ALWAYS run the Svelte autofixer (`mcp__plugin_svelte_svelte__svelte-autofixer`) after editing to validate Svelte 5 correctness.
- When user says "test first" or "write failing test": write the test, run it, confirm it FAILS, only then implement the fix. Never apply both in the same pass.
- **Don't export types without checking if any consumer imports them.** Run knip via `pnpm lint:file` to catch unused exports (see SETUP.md). If it's only used internally, keep it private.
- **Before writing a config override**, check what it overrides. If per-item value equals the inherited default, the override does nothing: don't write it.
- **Markdown files:** after writing or editing any `.md` file, run `npx markdownlint-cli <file>` and fix all errors before declaring done.
- **Visual refactors (CSS, inline styles, class: directives, layout changes):** Follow this workflow BEFORE editing:
  1. Ensure a Storybook story exists for the component. If not, write one first.
  2. Open the story in the browser via Playwright MCP and take a BEFORE screenshot (`/tmp/before-<component>.png`).
  3. Apply the refactor.
  4. Take an AFTER screenshot (`/tmp/after-<component>.png`).
  5. Compare visually. If anything shifted, fix it before declaring done.
     If changes are already applied without a before screenshot: `git stash`, screenshot, `git stash pop`, screenshot, compare.
