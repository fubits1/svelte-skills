# composition-svelte — three pre-design decisions

Read this when: starting a new feature that fits the composition-svelte triggers, BEFORE generating files.

The three decisions are independent. Answer all three, in writing, before generating any file. Then jump to the matching shape reference.

## 1. Composition shape

There is no single "the composition pattern". This codebase uses three shapes; each fits a different problem class.

| Shape | When | Reference |
| --- | --- | --- |
| **Wrapper** — one provider, one content slot (default or named) | Single overlay with caller-controlled body: popup, menu, modal, drawer, tooltip, accordion | [MapContextMenu.svelte](src/lib/maplibre/MapApp/MapView/MapContextMenu.svelte) — full contract in `wrapper-shape.md` |
| **Provider** — orchestrates cross-cutting concerns over a subtree | Multi-section panel that switches between concrete views via a state machine, applies layout transitions, error boundaries, teleport | [SlideIn.svelte](src/lib/maplibre/MapApp/SlideIn.svelte) + [SlideIn_Content.svelte](src/lib/maplibre/MapApp/SlideIn/SlideIn_Content.svelte) — `provider-shape.md` |
| **Layer-of-many** — declarative `{#if}` over many imperatively-mounted children inside a third-party container | Cluster of N markers/popups managed by a third-party lib, with per-item lifecycle | [LayerClusterMarker.svelte](src/lib/maplibre/MapApp/MapView/LayerClusterMarker.svelte) — `layer-of-many.md` |

If none fit, ask the user.

## 2. Snippet API design

What content slots does the wrapper expose? See [Svelte snippet docs](https://svelte.dev/docs/svelte/snippet).

| Shape | Use when | Example |
| --- | --- | --- |
| Default `children` only | One single content slot, items are equivalent | MapContextMenu: a flat list of menu items |
| Named snippets only | Distinct regions with different roles | Card: `header`, `body`, `footer` |
| Mix (default + named) | Primary content + optional decorations | Table: `children` rows + optional `caption` |

Rules:

- Each snippet is a prop. Default → `children`; named → prop of its own name.
- Render with `{@render slotName?.(payload)}` (use `?.` for optional, per `/code-style-svelte`).
- Payload shape: ONE object `{ ...domainFields, close?: () => void, ...slotHelpers }`. Adding fields later is non-breaking; positional args age badly.
- Cross-file export: a snippet exported from `<script module>` cannot reference instance-script declarations ([docs — Exporting snippets](https://svelte.dev/docs/svelte/snippet#Exporting-snippets)). Keep actions imported into module scope so the snippet can be exported.
- Skip `createRawSnippet` unless you have an exotic reason.

## 3. State location

| Where | When | Pros | Cons |
| --- | --- | --- | --- |
| Module-level `$state` in a `.svelte.ts` controller | Singleton feature state (one popup, one drawer at a time) | Shared across modules, reactive, no prop drilling | Singleton — can't have two instances |
| Component-local `$state` | Per-instance state with no need to share | Isolation, multiple instances OK | Caller wires `bind:value` etc. |
| Svelte `setContext` / `getContext` | Subtree-scoped sharing across deeply nested children | Provider-friendly | Not shareable across separate subtrees |
| Existing application store (e.g. `appState`) | State already lives there | Single source of truth | Coupling to the store |

For overlays in a single-active-overlay app (popup, drawer, slide-in): module-level `$state` is the right default.

---

Once decided, jump to the matching shape reference (`wrapper-shape.md`, `provider-shape.md`, or `layer-of-many.md`).
