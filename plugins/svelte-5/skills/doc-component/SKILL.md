---
name: doc-component
description: "Document a Svelte component using @component JSDoc. Auto-invoke when asked to document a .svelte component. Reads the component, analyzes its interface, and writes a structured @component comment block."
user-invocable: true
---

# Document Svelte Component

Write a `<!-- @component -->` JSDoc comment block at the top of a `.svelte` file. The comment is processed by svelte2tsx into a JSDoc block on the component class — IDE hover tooltips render it directly.

## Process

1. **Read the component file** — understand what it does, its props, its reactive dependencies, its key functions.
2. **Read direct dependencies** — imports, models, utilities — to understand the full interface.
3. **Write the `@component` block** — structured, tab-indented, at the very top of the file (before `<script>`).

## Format

````svelte
<!--
	@component
	One-line summary of what this component does.

	## Section heading
	- Bullet point with key information
	- Another bullet point

	@see {@link ./RelatedFile.ts} for details on X
	@example
	```svelte
	<MyComponent prop={value} />
	```
-->
````

## Rules

- **Tab-indent everything** inside the comment (project convention).
- **`@component` on its own line**, description starts on the next line.
- **No component name after `@component`** — the filename IS the name. Write `@component`, not `@component MyComponent`.
- **Use markdown** — headers (`##`), lists (`-`), code blocks (triple backtick), inline code. All render in IDE hover.
- **Supported JSDoc tags**: `@example`, `@see`, `@deprecated`, `@since`, `@author`, `{@link}`. These are rendered by TypeScript's language service.
- **Do NOT use**: `@param`, `@returns`, `@slot`, `@event` — they have no effect at the component level. Document props with JSDoc on their declarations inside `<script>`.
- **Focus on the interface, not internals.** The reader wants to know: what does this do, how do I use it, what are the key concepts. Implementation details only where they affect usage (e.g. debounce timing, cluster behavior).
- **Enumerate core properties/concepts only.** No noise. If a prop has a sensible default that most users never touch, skip it.
- **"How to extend" sections** are valuable for complex components — e.g. how to add a new marker type, how to add a new filter.
- **Keep it concise.** If the component is simple, a one-liner after `@component` is enough. Don't pad simple components with unnecessary structure.

## What NOT to document

- Pages, layouts, tests, stories (`.stories.svelte`)
- Internal implementation details that don't affect the component's consumers
- Every single local variable or helper function
- Types that are already documented in their own `.ts` files

## Verification

After writing the comment, check that the file still parses by reading the first few lines to confirm the comment is well-formed HTML.
