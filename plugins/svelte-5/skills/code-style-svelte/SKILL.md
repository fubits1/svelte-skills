---
name: code-style-svelte
description: "Svelte component code style rules. Auto-invoke when creating new .svelte files or editing Svelte component structure. Covers component documentation comments and Svelte-specific style conventions."
user-invocable: true
---

# Svelte Code Style

## Optional snippet rendering

Use `{@render snippet?.()}` instead of `{#if snippet}{@render snippet()}{/if}`. The optional chaining form is shorter and idiomatic Svelte 5.

## No `$effect` for setting state

NEVER use `$effect` to set state. If you need derived state, use `$derived` instead. Effects that write to state create unnecessary re-renders and are a sign of wrong reactive design.

## No bare `async` in `onMount` or `$effect`

NEVER pass an `async` function directly to `onMount` or `$effect`:

```js
// BAD — cleanup function is lost, dependency tracking breaks
onMount(async () => { ... });
$effect(async () => { ... });

// GOOD — async IIFE inside a sync wrapper
onMount(() => {
 (async () => { ... })();
 return () => { /* cleanup */ };
});
```

Two reasons:

1. **Cleanup is lost.** Both `onMount` and `$effect` expect the callback to optionally return a teardown function. An `async` function always returns a `Promise`, so the teardown never runs — intervals won't clear, subscriptions won't unsubscribe, listeners won't detach.
2. **Dependency tracking breaks (`$effect` only).** `$effect` tracks reactive dependencies that are read _synchronously_. Anything read after an `await` is invisible to the tracker and won't trigger re-runs.

## No `addEventListener` / `removeEventListener`

NEVER use `addEventListener` or `removeEventListener` in Svelte components. Svelte 5 has multiple declarative mechanisms for event handling — `on*` attributes, callback props, `svelte:window`, `svelte:document`, `svelte:body`, and the `on` action from `svelte/events`. These handle cleanup automatically and integrate with Svelte's reactivity.

When unsure which pattern to use, invoke the Svelte MCP autofixer (`mcp__svelte__svelte-autofixer`) or fetch the relevant docs via `mcp__svelte__get-documentation` (sections: `svelte-events`, `svelte-special-elements`).

## Svelte 5 parent + Svelte 4 child: use `slot=`, not `{#snippet}`

> TODO: verify this is still needed after sveltejs/language-tools#2716 is resolved

When a Svelte 5 (runes mode) component renders a Svelte 4 child
that uses `<slot name="...">`, pass content with `slot="name"`
attribute syntax — NOT `{#snippet name()}`.

```svelte
<!-- GOOD — slot= works in runes mode and passes svelte-check -->
<CollapsibleCard>
 <div slot="header">Header content</div>
 <div slot="body">Body content</div>
</CollapsibleCard>

<!-- BAD — runtime works but svelte-check rejects it -->
<CollapsibleCard>
 {#snippet header()}Header content{/snippet}
 {#snippet body()}Body content{/snippet}
</CollapsibleCard>
```

**Why:** `svelte-check` does not resolve named snippet props on
legacy components ([sveltejs/language-tools#2716](https://github.com/sveltejs/language-tools/issues/2716),
open as of 2026-04-09). The `{#snippet}` approach produces
`'header' does not exist in type` errors. The `slot=` attribute
is still valid in runes-mode components and passes all checks.

**When to use `{#snippet}`:** Only when the child component is
also Svelte 5 and accepts snippet props via `$props()`.

**Events from Svelte 4 children:** `on:click`, `on:change`, etc.
still work in a Svelte 5 parent. Use `on:` for Svelte 4 children,
`onclick`/callback props for Svelte 5 children.

Verified 2026-04-09 with svelte ^5.55.2, svelte-check ^4.4.6.

## HTML comments in component markup

Svelte supports standard HTML comments in component markup. `<!-- stylelint-disable -->`, `<!-- svelte-ignore ... -->`, and other tool-control comments work in `.svelte` files.

## Component Documentation (`@component`)

Every new `.svelte` component file MUST start with a `<!-- @component -->` comment block on the very first line that documents the component's purpose. This follows JSDoc conventions — the `@component` tag is picked up by the Svelte language server (svelte2tsx) to display documentation on hover in IDEs, similar to how `/** @description */` works in JSDoc for JS/TS files.

Format:

```svelte
<!--
	@component
	Brief description of what this component does.
	Additional details if needed.
-->
```

The `@component` tag must appear inside the HTML comment. The description follows on subsequent lines, indented with a tab. Keep it concise but informative — someone reading this should understand the component's role without reading the implementation.

You can use other JSDoc tags inside the comment block where useful (e.g. `@example`, `@see`, `@deprecated`).

Excluded: pages, layouts, tests, and stories (`.stories.svelte`) do not need this comment.

## Styling / CSS

- **ALWAYS** nest the css using `/frontend:css-nesting` skill.
- **NEVER** use `:global()` selectors unless told otherwise. This is a code smell. Either refactor the component, relocate the state or use global feature-specific stylesheets

## Related skills

- `frontend:code-style` — General code style rules (variable naming, braces, data attributes). Applies to all code including Svelte.
- `svelte:svelte-code-writer` — Svelte 5 documentation lookup and code analysis. MUST invoke when creating or editing `.svelte` / `.svelte.ts` / `.svelte.js` files.
- `svelte:svelte-core-bestpractices` — Reactivity, events, styling, and integration patterns for modern Svelte.
- `svelte-5:testing-svelte` — Vitest + Playwright testing patterns for Svelte 5 components.
- `frontend:css-nesting` — CSS nesting rules.
