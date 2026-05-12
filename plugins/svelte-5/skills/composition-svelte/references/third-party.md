# composition-svelte — third-party DOM bridging

Read this when: integrating a non-Svelte DOM library (maplibre, leaflet, d3, tippy, popper, etc.). Read the codebase FIRST: if there's already a pattern for the library, follow it.

## Two API shapes drive the choice

| Third-party API shape | Pattern | Why |
| --- | --- | --- |
| **Element-augmenter**: decorates an existing element in place (tippy, popper, click-outside, drag, IntersectionObserver) | `{@attach factory}` | Cleanup is symmetric: attach mounts, return-fn destroys. Element stays in Svelte's tree. |
| **Container-owner**: takes an `element` and adopts it as the marker/popup/widget body, controlling its parent (maplibre `Marker`/`Popup`, leaflet `L.marker`/`L.popup`, d3 selections that append-to) | Imperative: `document.createElement('div')` → `mount(Visual, {target})` → `new ThirdPartyClass({element})` | The library moves the node into its own container. `{@attach}` cleanup fights with the library's own lifecycle. |

## Canonical reference in this codebase

[LayerClusterMarker.svelte:449-476](src/lib/maplibre/MapApp/MapView/LayerClusterMarker.svelte#L449) — maplibre marker adoption.

NEVER invent a new bridging pattern when the project already has one. Grep first for `mount\(` and `new <Lib>\.<Class>\(` to find the call sites.

## Pure-visual discipline

The mounted Visual component has NO third-party imports — see `wrapper-shape.md` Visual section. If you find yourself importing maplibre/leaflet/d3 into a Visual file, the abstraction is wrong; the bridging belongs in the parent.
