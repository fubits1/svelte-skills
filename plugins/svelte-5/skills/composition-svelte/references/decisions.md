# composition-svelte — three pre-design decisions

Read this when: starting a new feature that fits the composition-svelte triggers, BEFORE generating files.

The three decisions are independent. Answer all three, in writing, before generating any file. Then jump to the matching shape reference.

## 1. Composition shape

Two shapes; each fits a different problem class.

| Shape | When | Reference |
| --- | --- | --- |
| **Composition shape** — Wrapper + Content + Controller scaffolding. Covers both caller-content (snippet variant: Popover, Modal, Tooltip) and feature-content (view-dispatcher / Provider variant: multi-step Wizard, Drawer with Edit + Detail views). | Single overlay with caller-controlled body, OR multi-view panel where state picks which View renders. Use this whenever the feature lives inside a Svelte tree. | `composition-shape.md` |
| **Non-Svelte Host** — declarative `{#if}` over many imperatively-mounted children inside a non-Svelte container | Cluster of N markers / popups / nodes owned by a third-party library like d3, maplibre, or leaflet, with per-item lifecycle | `non-svelte-host.md` |

If none fit, ask the user.

## 2. Snippet API design

What content slots does the wrapper expose? See [Svelte snippet docs](https://svelte.dev/docs/svelte/snippet).

| Shape | Use when | Example |
| --- | --- | --- |
| Default `children` only | One single content slot, items are equivalent | A context-menu component: a flat list of menu items |
| Named snippets only | Distinct regions with different roles | Card: `header`, `body`, `footer` |
| Mix (default + named) | Primary content + optional decorations | Table: `children` rows + optional `caption` |

Rules:

- Each snippet is a prop. Default → `children`; named → prop of its own name.
- Render with `{@render slotName?.(payload)}` (use `?.` for optional, per `svelte-5:code-style-svelte`).
- Payload shape: ONE object `{ ...domainFields, close?: () => void, ...slotHelpers }`. Adding fields later is non-breaking; positional args age badly.
- Cross-file export: a snippet exported from `<script module>` cannot reference instance-script declarations ([docs — Exporting snippets](https://svelte.dev/docs/svelte/snippet#Exporting-snippets)). Keep handlers imported into module scope so the snippet can be exported.
- Skip `createRawSnippet` unless you have an exotic reason.

## 3. State location

### SPA / Client-Side

| Where | When | Pros | Cons |
| --- | --- | --- | --- |
| Module-level `$state` in a `.svelte.ts` controller | Singleton feature state (one popup, one drawer at a time) | Shared across modules, reactive, no prop drilling | Singleton — can't have two instances; not safe under SSR if the state could be mutated during render |
| Class with `$state` fields in a `.svelte.ts` controller | Singleton or multi-instance feature state with richer encapsulation (action methods, type-safe testing) | Encapsulated, multiple instances OK, official Svelte recommendation for sharing reactivity | Slightly more ceremony than module-level exports |
| Component-local `$state` | Per-instance state with no need to share | Isolation, multiple instances OK | Caller wires `bind:value` etc. |
| Svelte context via `createContext` (Svelte ≥ 5.40) — fall back to `setContext` / `getContext` on older versions | Subtree-scoped sharing across deeply nested children; safer than module-level state under SSR | Provider-friendly, type-safe with `createContext`, scoped per request | Not shareable across separate subtrees |
| Existing application store / global state value | State already lives there | Single source of truth | Coupling to the store |

For overlays in a single-active-overlay client-rendered app (popup, drawer, slide-in): module-level `$state` or a class controller is the right default.

### SSR / Server-Side

> TODO

---

Once decided, jump to the matching shape reference (`composition-shape.md` or `non-svelte-host.md`).
