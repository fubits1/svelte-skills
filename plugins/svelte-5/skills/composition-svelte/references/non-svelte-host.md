# composition-svelte — Non-Svelte Host shape

Read this when: you've picked the Non-Svelte Host shape per `decisions.md`.

A single Svelte component imperatively mounts many child components into a non-Svelte container (a DOM element owned by a third-party library like d3, maplibre, or leaflet) and manages add/remove diffing as data changes. State lives inside the host component or in a controller it subscribes to.

## When this is the right shape

- N items in a third-party container managed by per-item lifecycle.
- Items appear and disappear based on data, not user toggles.
- Each item carries its own Svelte component for display, but the third-party library (e.g. a marker, a `<g>` selection, a tree node) owns the DOM position.

## When NOT to use this

- Single overlays or multi-view features inside a Svelte tree — use the Composition shape (`composition-shape.md`).

## Folder structure

Same recursive co-location rule as `composition-shape.md`:

```text
src/lib/<area>/
├── <Host>.svelte                ← Non-Svelte Host root — Svelte: PascalCase
└── <Host>/
    ├── Item.svelte              ← per-item markup component (mounted imperatively by <Host>)
    ├── controller.svelte.ts     ← Controller (optional; only if state is non-trivial) — Svelte: .svelte.ts for runes
    ├── <Host>.model.ts          ← Types
    ├── utils.ts                 ← local utils (diff, mount/unmount helpers)
    ├── utils.test.ts            ← co-located unit test (pure-TS)
    └── stories/                 ← Storybook stories (run as browser tests via svelte-5:storybook-vitest)

tests/browser/<feature>/
└── <Host>.test.ts               ← Svelte component browser test — external
```

- `.svelte` components must be PascalCase; files using runes need the `.svelte.ts` extension — Svelte requirements.
- Other filenames follow your project / TS convention (types: `<Host>.model.ts`, `types.ts`, `<Host>.d.ts`, etc.).
- Pure-TS unit tests co-locate next to the file they test.
- Svelte component browser tests live externally in `tests/browser/<feature>/`. Stories double as browser tests via `svelte-5:storybook-vitest`. See `svelte-5:testing-svelte`.

## Reference contract

The host runs an imperative per-item lifecycle that diffs data against the current set of mounted children. See `third-party.md` for the imperative `mount()` pattern used inside this shape.

```svelte
<script lang="ts">
  import { mount, unmount, flushSync } from 'svelte'
  import Item from './<Host>/Item.svelte'
  // For each datum:
  //   1. Create a host element (document.createElement)
  //   2. mount(Item, { target: hostElement, props })
  //   3. If Item has onMount / $effect setup the third-party lib relies on
  //      (dimension measurement, listener registration, focus, …):
  //      flushSync()  // forces pending effects to run before step 4
  //   4. Hand the element to the third-party library
  // On data change: diff new vs old, mount/unmount the delta only.
  // Cleanup: unmount the instance returned by mount().
</script>
```

`flushSync()` is only needed when the mounted child has effects that must run before the third-party library adopts the element. A markup-only child (no `<script>`, per the markup-only discipline in `third-party.md`) has nothing to flush — skip the call.
