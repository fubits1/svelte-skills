# composition-svelte — third-party DOM bridging

Read this when: integrating a non-Svelte DOM library (a third-party library like maplibre, leaflet, d3, tippy, or popper). Read your codebase FIRST: if there's already a pattern for the library, review it first.

## Two API shapes drive the choice

| Third-party API shape | Pattern | Why |
| --- | --- | --- |
| **Decorates an existing element**: tippy, popper, click-outside, drag, IntersectionObserver — adds behaviour to an element that stays in Svelte's tree. | `{@attach factory}` | Cleanup is symmetric: attach mounts, return-fn destroys. |
| **Container-owner**: takes an `element` and adopts it as the marker/popup/widget body, controlling its parent (maplibre `Marker`/`Popup`, leaflet `L.marker`/`L.popup`, d3 selections that append-to) | Imperative: `document.createElement('div')` → `mount(Item, {target})` → `new ThirdPartyClass({element})` | The library moves the node into its own container. `{@attach}` cleanup fights with the library's own lifecycle. |

## Find the existing pattern first

NEVER invent a new bridging pattern when your codebase already has one. Grep first for `mount\(` and `new <Lib>\.<Class>\(` to find the call sites and follow the existing convention.

For the imperative per-item lifecycle that the container-owner pattern requires (mount on data add, unmount on data remove), see `non-svelte-host.md`.

## Markup-only discipline

For the container-owner case, the Wrapper creates a host element, imperatively `mount()`s a markup-only `.svelte` file into it, then hands the element to the third-party constructor. The mounted file has NO `<script>` block — pure markup + `<style>`. This isolates the rendered output from the bridging logic and keeps the markup testable in isolation.

If you find yourself importing a third-party library (like maplibre, leaflet, or d3) into that markup-only file, the abstraction is wrong; the bridging belongs in the parent Wrapper.
