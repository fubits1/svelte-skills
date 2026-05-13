# composition-svelte — Composition shape

Read this when: you've picked the Composition shape per `decisions.md`.

The Composition shape covers two flavours of feature, distinguished by **who supplies the content**:

- **Caller-content (snippet variant)** — the Wrapper is reusable chrome; the caller plugs in what goes inside via Svelte snippets. Examples: Popover, Modal, Tooltip, single-content Drawer.
- **Feature-content (view-dispatcher variant)** — the Wrapper owns its views internally; state picks which view renders. Views live in a `Views/` peer folder. Examples: multi-step Wizard, profile Drawer with Edit + Detail views.

Same roles, same folder structure, same Controller pattern. Only the Content role's implementation differs.

Identifiers below (`<Feature>`, `<Feature>.model.ts`, `<View>`) are abstract placeholders. Substitute names that convey the role in your feature.

## Vocabulary

Three terms get confused in Svelte composition discussions. They are not interchangeable.

**Wrapper** — the root component file. The architectural role in the seven-role contract below. It's what consumers render in their template (`<Feature>.svelte`). Owns lifecycle, third-party bridging, reads from the Controller, a11y. "Wrapper" is colloquial English — not a Svelte-docs term — but reads cleanly in composition discussions.

**Controller** — the state-and-handlers module (`<Feature>/controller.svelte.ts`). Not a component — a `.svelte.ts` module. Owns reactive state and the handlers that mutate it. Imported by the Wrapper and by Content. "Controller" is borrowed from MVC tradition; Svelte has no native canonical name for this role. See `## Controller` below.

**Provider** — *behaviour*, not a separate file role. A Wrapper acts as a Provider when it does any of these for its subtree:

- Sets up context (via `createContext` / `setContext`).
- Handles cross-cutting concerns: teleport (mobile/desktop), error boundaries, transitions, layout.
- Dispatches between multiple internal Views (Content variant B below).

A simple Wrapper just wraps caller content. A Provider-Wrapper additionally provides things to its subtree. Same shape, different scope of responsibilities — that's why this skill has one Composition shape, not two.

See `## Readings` at the bottom for sources on Provider (Svelte Context API), Wrapper / compound components, and related patterns.

## Folder structure (load-bearing)

Co-locate by feature. Every component that has children gets a sibling folder of the same name. The rule applies recursively.

```text
src/lib/<area>/
├── <Feature>.svelte             ← the Wrapper — Svelte: PascalCase
└── <Feature>/                   ← same-named sibling folder for its children
    ├── Content.svelte           ← Content (snippet provider OR view-dispatcher)
    ├── controller.svelte.ts     ← Controller — Svelte: .svelte.ts for runes
    ├── <Feature>.model.ts       ← Types (Payload, shared interfaces, View union)
    ├── utils.ts                 ← local utils used only by <Feature>
    ├── utils.test.ts            ← co-located unit test (pure-TS)
    ├── Views/                   ← (only for the view-dispatcher variant) peer of Content.svelte
    │   ├── ViewA.svelte
    │   └── ViewB.svelte
    └── stories/                 ← Storybook stories (run as browser tests via svelte-5:storybook-vitest)

tests/browser/<feature>/
└── <Feature>.test.ts            ← Svelte component browser test — external
```

- `.svelte` components must be PascalCase; files using runes need the `.svelte.ts` extension — Svelte requirements.
- One filename style is shown above. Alternatives are common: types could be `types.ts` or `<Feature>.d.ts`; utils could be `<feature>-utils.ts`; component test could be `<Feature>.svelte.test.ts`. Pick what matches your project / TS convention. What's universal is the role each file plays.
- `Views/` is **only present in the view-dispatcher variant**. The snippet variant doesn't have it.
- Pure-TS unit tests co-locate next to the file they test.
- Svelte component browser tests live externally in `tests/browser/<feature>/`. Stories double as browser tests via `svelte-5:storybook-vitest`. See `svelte-5:testing-svelte`.

If a child component itself has children, the same rule applies one level deeper: `<Feature>/<SubFeature>.svelte` + `<Feature>/<SubFeature>/`.

**Drop arbitrary feature prefixes inside `<Feature>/`.** The folder carries the context — write `controller.svelte.ts`, not `<feature>Controller.svelte.ts`. The Types file is the one exception in the example above: convention-based suffixes like `<Feature>.model.ts` are fine because the prefix is part of an established naming pattern (similar to `<Feature>.d.ts` or `<Feature>.spec.ts`), not arbitrary feature-tagging. If your project uses `types.ts` instead, drop the prefix there too.

Shared utilities used across features live outside the feature folder — e.g. `$utils/domActions.ts`. Extracted on the SECOND use site, not pre-extracted.

## Seven roles

| Role | Owns | File |
| --- | --- | --- |
| Consumer | Where the feature is rendered + bootstrapped | e.g. `App.svelte` |
| Wrapper | Lifecycle + third-party bridge + Controller-handler integration + a11y | `<Feature>.svelte` |
| Content | (a) snippet provider for caller content **OR** (b) view-dispatcher reading from internal `Views/` registry | `<Feature>/Content.svelte` |
| Controller | `$state` data + `subscribeX` listener + pure handlers + sentinel ids | `<Feature>/controller.svelte.ts` |
| Types | `Payload` type + any shared interfaces — separate file, NOT inlined in the Wrapper | `<Feature>/<Feature>.model.ts` (or `types.ts`, `<Feature>.d.ts` — project convention) |
| Shared util | Reusable element attachments (autofocus, click-outside, …) | `$utils/<category>.ts` (outside the feature folder) |
| Tests | Co-located unit tests for pure-TS modules + stories that double as browser tests | `<Feature>/utils.test.ts` + `<Feature>/stories/<Feature>.stories.svelte` |

## Consumer

- ONE import line for setup + content: `import Wrapper from '…'` then `import { children as <alias>, subscribeX } from './<Feature>/Content.svelte'`.
- `onMount`: `const unsubscribe = subscribeX(); return () => unsubscribe()`. The wrapper is rendered declaratively in the template, NOT mounted imperatively here (imperative mount is reserved for third-party bridging — see `third-party.md`).
- Template: `<Wrapper children={<alias>} />` gated on the readiness check. ONE prop. No coordinate props, no `open=`, no third-party-context props.
- Anti-rules: NEVER pass globals as props; NEVER pass controller state as props. NEVER reassign a global into a local (`const map = appState.map` is a shadow — read `appState.map` at the call site, always).

## Wrapper

- Imports the `Payload` type from the Types file (not from its own `<script module>`).
- Instance script imports svelte runes + lifecycle + the third-party library + any shared global state + shared utils + the controller's state.
- Props: snippets + optional `onClose` callback. NO domain state props (read from the controller).
- Lifecycle decisions per `lifecycle.md`.
- Mandatory a11y per `a11y-overlays.md`.
- For container-owner third-party bridging (maplibre `Marker`, leaflet `L.marker`, d3 selections that adopt an element): the Wrapper creates a host element, imperatively `mount()`s a markup-only `.svelte` file into it, then hands the element to the third-party constructor. See `third-party.md`.

## Content — pick a variant

### Variant A: snippet provider (caller supplies content)

- `<script module>` ONLY. NO instance `<script>`. This constraint enables cross-file snippet export.
- Imports handlers from the controller in module scope so snippets call them at render time.
- Re-exports passthroughs (state value, subscriber, handlers) — consumer has ONE import line for setup + content.
- Snippet body: `onclick={async () => { await handler(payload); payload.close() }}` — `close()` is the SNIPPET's responsibility, not the handler's.
- No `<style>`. Wrapper owns container styling; content authors own item styling if needed — see `css-scope.md`.

Use this variant when the same Wrapper is reused across features with different bodies (Popover, Tooltip, generic Modal).

### Variant B: view-dispatcher (feature owns views internally)

- Reads the Controller's current-view state and renders the corresponding View component via `$derived`.
- Uses a `Record<View, Component>` registry to map view names to imported components.
- Views live in `Views/` peer folder (one `.svelte` per View name in the union).
- Snippets aren't typically involved — Views are full components.

```ts
// <Feature>.model.ts
export type View = 'a' | 'b' | 'closed'

// controller.svelte.ts
export const state = $state<{ view: View }>({ view: 'closed' })

// Content.svelte
import ViewA from './Views/ViewA.svelte'
import ViewB from './Views/ViewB.svelte'

const ViewByName: Record<View, Component | null> = {
  a: ViewA,
  b: ViewB,
  closed: null,
}
const CurrentView = $derived(ViewByName[state.view])
```

Use this variant when the feature OWNS its views (multi-step wizard, profile drawer with Edit + Detail). Views are tied to this feature and not reused elsewhere.

If your "view-dispatcher" only has one View → use Variant A. The variant is for multi-view features.

## Controller

- `.svelte.ts` filename — required for runes.
- Exports: sentinel ID constants; `$state` data; `subscribeX()` returning unsubscribe; handlers.
- `subscribeX()`: reads any required global state directly (no argument). Platform / collision guards live INSIDE the handler.
- Verb pairs (per `frontend:code-style`): `subscribeX`/`unsubscribeX` for event subscription; `attachX`/`detachX` reserved for Svelte `{@attach}` lifecycle; `mountX`/`unmountX` for component lifecycle; `createX`/`destroyX` for factory pairs. Conflation is a bug.
- **Handler**: a function the Controller exports that the Content's snippets call to mutate state in response to user interaction (`select(id)`, `submit(payload)`, `dismiss()`, etc.). Not Svelte 4's `use:action` (replaced by `{@attach}`) or SvelteKit form actions. Handlers are pure: they take a Payload, mutate the appropriate state, and **do not** call `close()` — closing is the snippet's responsibility (see Content section).
- **Sentinel id**: a non-collidable string used by the Controller when the feature has no natural domain id (e.g. the singleton instance of an overlay that needs a key in a store keyed by id). Pick a prefix no real id will ever collide with — common conventions include double-underscore + lowercase (`__feature__`) or a project-wide sentinel namespace.

### Controller styles: module-level vs class

Two valid shapes for the Controller — pick what fits your feature; they coexist fine.

**Module-level `$state` exports** — leanest. Singleton by construction. Good default for simple overlays.

```ts
// controller.svelte.ts
export const state = $state<{ open: boolean; items: Item[] }>({
  open: false,
  items: [],
})

export function subscribe() {
  // attach listeners that mutate state
  return () => {
    /* detach */
  }
}

export function select(id: string) {
  // pure handler; mutates state; does not call close()
}
```

**Class with `$state` fields** — preferred by official Svelte guidance for sharing reactivity, and the right choice when you want multiple instances, richer encapsulation, or type-safe testing helpers.

```ts
// controller.svelte.ts
export class Controller {
  open = $state(false)
  items = $state<Item[]>([])

  subscribe() {
    // attach listeners that mutate this.open / this.items
    return () => {
      /* detach */
    }
  }

  select(id: string) {
    // pure handler; mutates state; does not call close()
  }
}

// Singleton: instantiate at module scope.
// Multi-instance: instantiate per consumer (often via context).
export const controller = new Controller()
```

Bare `state`, `subscribe`, `controller` exports rely on the folder name (`<Feature>/`) for disambiguation at the import site. Consumers can alias on import if needed (`import { state as menuState } from './<Feature>/controller.svelte'`).

Both shapes satisfy the Controller role. Pick what fits your feature — they coexist fine.

## Types

- Separate file co-located in the `<Feature>/` folder. Filename follows your project / TS convention (e.g. `<Feature>.model.ts`, `types.ts`, `<Feature>.d.ts`).
- Holds the `Payload` type forwarded to snippets, the Controller's state shape, the View union (for the view-dispatcher variant), and any shared interfaces.
- Imported by Wrapper, Content, Controller — single source of truth. The Wrapper does NOT inline these types in its `<script module>`.
- Plain `.ts` (not `.svelte.ts`) — types only, no runes.

## Shared util

- One file per CATEGORY, not per symbol. `$utils/domActions.ts` holds ALL DOM attachments. NOT `autofocus.ts`.
- Each export typed `Attachment<HTMLElement>` (or narrower).
- Extract on the SECOND use site. Don't pre-extract.

## Tests

- **Co-located pure-TS unit tests.** `utils.test.ts` next to `utils.ts`. Likewise for any other pure-TS module.
- **Stories double as browser tests.** `<Feature>/stories/<Feature>.stories.svelte` runs under `svelte-5:storybook-vitest` — each `<Story>` with a `play` function asserts component behaviour in the browser.
- **Svelte component browser tests live externally** in `tests/browser/<feature>/` at the project root, not inside the feature folder. See `svelte-5:testing-svelte`.
- **No SSR tests.** Composition-svelte features are client-rendered; SSR couples to routes, not to component composition.

The term "Controller" is not Svelte-canonical — it borrows from MVC / MVP / MVVM. This skill adopts it because no Svelte-native name covers the same shape (reactive state + handlers in a `.svelte.ts` module).
