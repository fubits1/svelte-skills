---
name: composition-svelte
description: "Use when composing a Svelte 5 feature out of a provider/wrapper component, content snippets (default, named, or mixed), reactive state, and optional bridging into a third-party DOM library (maplibre, leaflet, d3, tippy, popper). Triggers: designing any provider or wrapper (popup, menu, drawer, modal, tooltip, panel, accordion, slide-in), reaching for `bind:this`, reaching for `$effect` for one-shot setup, prop-drilling a global store / appState value, naming a new component `Default`/`Feature`/`Wrapper` without checking codebase patterns, mounting Svelte content into a non-Svelte container, choosing default vs named snippets, fixing a UX bug in one of several visually-analogous components, or building a feature whose `<style>` block is about to use `:global()`."
user-invocable: true
---

# composition-svelte

Decompose a Svelte 5 feature by ROLE. Wrong role assignment is the root cause of every architectural fuckup. Before generating files, pin three decisions: composition shape, snippet API, state location. Per-file contracts fall out from those.

Rules from `frontend:code-style`, `svelte-5:code-style-svelte`, `frontend:editing`, `svelte:svelte-code-writer`, `svelte:svelte-core-bestpractices` apply throughout. Run `mcp__svelte__svelte-autofixer` after every `.svelte` edit.

## When to use

- Designing a wrapper or provider component (popup, menu, drawer, modal, tooltip, panel, slide-in, accordion)
- Autofixer flagged `bind:this`
- About to type `$effect(() => { new ThirdPartyThing(...) })`
- About to write `prop={appState.x}` or `prop={someStore.value}`
- Naming a new file `Default.svelte` / `Feature.svelte` / `Wrapper.svelte`
- Calling `setDOMContent` / `appendChild(svelteRenderedNode)` / similar
- Deciding default vs named snippets
- Fixing a focus / ESC / keyboard bug in one of several similar menus
- About to add a maplibre `Marker`, leaflet `L.marker`, d3 selection
- About to type `:global(...)` inside a wrapper's `<style>` block

Skip for: CSS-only tweaks, test-only edits, backend / non-Svelte work.

## Pin three decisions first

Answer in writing BEFORE generating files. Full tables and pointers in `references/decisions.md`.

1. **Shape**: Wrapper / Provider / Layer-of-many?
2. **Snippet API**: default `children`, named snippets, or mix?
3. **State location**: module-level `$state` (`.svelte.ts`), local, context, or existing store?

If intent is ambiguous, ask via `AskUserQuestion` — never infer silently.

## Quick reference

| Need | Read |
| --- | --- |
| Picking shape and snippet/state design | `references/decisions.md` |
| Wrapper shape — six-file contract | `references/wrapper-shape.md` |
| Provider shape | `references/provider-shape.md` |
| Layer-of-many shape | `references/layer-of-many.md` |
| Lifecycle rune choice | `references/lifecycle.md` |
| Bridging to a third-party DOM library | `references/third-party.md` |
| A11y for overlays (focus, ESC, `:focus-visible`) | `references/a11y-overlays.md` |
| CSS scope (avoiding `:global()`) | `references/css-scope.md` |
| Counter-arguments for common rationalizations | `references/rationalizations.md` |

## Naming

- **Files** by ROLE. `Default.svelte` alone is too vague — `DefaultItems.svelte` reads. `Feature.svelte` / `Wrapper.svelte` are banned for new code.
- **Function verbs**: `subscribeX/unsubscribeX` for event subscription; `attachX/detachX` for Svelte `{@attach}` lifecycle; `mountX/unmountX` for component lifecycle; `createX/destroyX` for factory pairs. Don't conflate.
- **Variables** per `frontend:code-style`: `element` not `el`; `event` not `e`; `result` not `res`.
- **Utils** grouped by CATEGORY (`$utils/domActions.ts` for all DOM attachments). NOT one file per export.

## Util extraction

When a pattern appears in 2+ components, extract to `$utils/<category>.ts`. Don't pre-extract — first use is inline; second triggers the move.

## Tooling

Multi-file Svelte refactors → `svelte:svelte-file-editor` subagent (per `agent:before-you-act` "Consider before doing it yourself"). Validates each file via `mcp__svelte__svelte-autofixer`.

## Symmetric bugs

UX bugs in overlay-style components almost always span ALL overlay-style components. On fix: grep for analogous (`role="menu"`, `tabindex="-1"`, `onkeydown.*Escape`), confirm, apply symmetrically in the same change, test both.

## Done close-path matrix

Before declaring an overlay feature done, run ALL of these in a real browser via Playwright MCP:

- [ ] X / close button → wrapper popup + auxiliary elements both cleared
- [ ] click-outside / `closeOnClick` → both cleared
- [ ] ESC → both cleared
- [ ] Each action click → both cleared
- [ ] Opening another overlay of the same kind → mutual exclusion via global slot
- [ ] Analogous components have the same UX behaviour
- [ ] `mcp__svelte__svelte-autofixer`: zero new issues. `$effect calling function` advisories on imperative third-party calls are OK; `bind:this` suggestions are NOT.
- [ ] Vitest: green for the file + regression neighbours
- [ ] Lint, type check: no new warnings/errors

Per `agent:done`: declaring done before this matrix is fraudulent. Per `agent:asshole`: don't dismiss failures as "not my problem".

## Red flags — STOP and reconsider

| Red flag | Means | Fix |
| --- | --- | --- |
| `prop={appState.x}` / `prop={someStore.value}` | Prop-drilling a global | Import the store, read it directly |
| `bind:this` with `{@attach}` autofixer suggestion | Wrong tool for element augmenters | `references/lifecycle.md` + `references/third-party.md` |
| `Default.svelte` / `Feature.svelte` / `Wrapper.svelte` | Role not conveyed | Role-specific name |
| maplibre / leaflet / d3 import inside a Visual file | Wrong axis | Move bridging to the parent wrapper |
| `$effect(() => new ThirdPartyThing(...))` for one-shot setup | Wrong rune | `onMount` + cleanup return |
| `$effect` writing to `$state` | Wrong rune | `$derived` |
| Fixing ESC for one menu only | Other menus have the same bug | Symmetric coverage |
| Two overlays visible simultaneously | Bypassed the global slot | `appState.createPopup` + `showPopup` + `closePopup` |
| Auxiliary element (marker dot, badge, etc.) still visible after popup auto-close | Visibility gated on `popup.isOpen()` — but maplibre fires 'close' AFTER `popup.remove()` | Reconcile unconditionally on `open`; `addTo`/`remove` are idempotent |
| Snippet inlined in consumer feels too long | Time to extract | `<script module>` re-export, `references/wrapper-shape.md` |
| `attachX` named but uses `map.on()` | Verb mismatch | `subscribeX` |
| `:global(button)` in a wrapper's `<style>` | Wrong place to style children | `references/css-scope.md` |
| `el` / `e` / `tmp` variable names | Code-style violation | Rename |

When tempted to rationalize, read `references/rationalizations.md`.
