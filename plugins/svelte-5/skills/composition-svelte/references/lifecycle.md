# composition-svelte — lifecycle rune choices

Read this when: deciding between `onMount`, `$effect`, `{@attach}`, imperative `mount()`, or `<svelte:window>` for a piece of setup or reactivity.

## Decision matrix

| Situation | Tool | Rule of thumb |
| --- | --- | --- |
| One-shot setup with stable deps (host div, third-party constructor) | `onMount` + cleanup return | The wrapping component itself is the lifecycle boundary; parent already gates render on prerequisites |
| Reactive to prop / store / `$state` changes (coords, open) | `$effect` (nested inside `onMount` or `{@attach}`) | Re-runs on state changes within an already-mounted instance |
| Element-tied bridging when autofixer flags `bind:this` | `{@attach factory}` | Element-augmenter libraries (tippy, click-outside, drag, observers) |
| Imperative third-party container that wants to OWN a DOM element (maplibre Marker, leaflet L.marker) | `document.createElement` + `mount(Visual, {target})` + `new ThirdPartyClass({element})` | Container-owner libraries — see `third-party.md` |
| Programmatic focus when state flips truthy | `$effect` + `queueMicrotask(() => element.focus())` | `tabindex="-1"` elements that need a keyboard target |
| Global keyboard fallback | `<svelte:window onkeydown>` | Gate on the open state so it doesn't grab events when closed |

## Cross-skill rules from `/code-style-svelte`

- NEVER use `$effect` to set state — use `$derived` instead.
- NEVER pass an `async` function to `onMount` or `$effect`. Sync wrapper + async IIFE.

## Autofixer advisories

"Calling a function inside an `$effect`" advisory: OK when the call is an imperative side effect on a non-Svelte object (maplibre method, DOM API). NOT OK when the call writes to Svelte state — that's the wrong rune; use `$derived`.

`bind:this` advisory: take it seriously. See `third-party.md` to choose between `{@attach}` and imperative mount.

Need the wrapper to mount in vitest without booting the third-party library? See `/testing-svelte` → `references/critical-patterns.md` for the conditional `{@attach prereq ? factory : undefined}` pattern.
