# composition-svelte — Layer-of-many shape

Read this when: you've picked the Layer-of-many shape per `decisions.md`. See [LayerClusterMarker.svelte](src/lib/maplibre/MapApp/MapView/LayerClusterMarker.svelte).

Single file imperatively mounts many child components into third-party containers and manages add/remove diff per data change. State lives inside the layer component or in a store the layer subscribes to.

## When this is the right shape

- N items in a third-party container managed by per-item lifecycle.
- Items appear and disappear based on data, not user toggles.
- Each item carries its own Svelte component for display, but the third-party lib (maplibre Marker, leaflet L.marker) owns the DOM position.

## When NOT to use this

- Single overlays — use the Wrapper shape.
- Multi-section panels with shared layout — use the Provider shape.

## Reference contract

Read the actual file at [LayerClusterMarker.svelte:449-476](src/lib/maplibre/MapApp/MapView/LayerClusterMarker.svelte#L449) for the canonical per-item mount/unmount cycle. See `third-party.md` for the imperative `mount()` pattern used inside this shape.
