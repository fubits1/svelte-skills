# composition-svelte — Wrapper shape

Read this when: you've picked the Wrapper shape per `decisions.md`. Examples below are from [MapContextMenu.svelte](src/lib/maplibre/MapApp/MapView/MapContextMenu.svelte) and siblings. File names are conventions; pick whatever conveys the role.

## Six roles

| Role | Example | Owns |
| --- | --- | --- |
| Consumer | `MapView.svelte` | Where the feature is rendered + bootstrapped |
| Wrapper | `MapContextMenu.svelte` | Lifecycle + third-party bridge + global-slot integration + a11y |
| Content | `DefaultItems.svelte` | The default snippet(s) + re-exports for one-import consumer wiring |
| Controller | `defaultItemsController.svelte.ts` | `$state` data + `subscribeX` listener + pure action functions + sentinel ids |
| Visual | `Marker.svelte` | Markup + styles. ONE element, NO `<script>` |
| Shared util | `$utils/domActions.ts` | Reusable element attachments (autofocus, click-outside, …) |

## Consumer

- ONE import line for setup + content: `import Wrapper from '…'` then `import { children as <alias>, subscribeX } from '<Content>.svelte'`.
- `onMount`: `const unsubscribe = subscribeX(); return () => unsubscribe()`. The wrapper is rendered declaratively in the template, NOT mounted imperatively here (imperative mount is reserved for third-party bridging — see `third-party.md`).
- Template: `<Wrapper children={<alias>} />` gated on the readiness check. ONE prop. No `lat=`, no `map=`, no `open=`.
- Anti-rules: NEVER pass globals as props; NEVER pass controller state as props. NEVER reassign a global into a local (`const map = appState.map` is a shadow — read `appState.map` at the call site, always).

## Wrapper

- `<script module>` exports the `Payload` type forwarded to snippets.
- Instance script imports svelte runes + lifecycle + the third-party lib + the global store + shared utils + the controller's state + the Visual.
- Props: snippets + optional `onClose` callback. NO domain state props (read from the controller).
- Lifecycle decisions per `lifecycle.md`.
- Mandatory a11y per `a11y-overlays.md`.

## Content

- `<script module>` ONLY. NO instance `<script>`. This constraint enables cross-file snippet export.
- Imports actions from the controller in module scope so snippets call them at render time.
- Re-exports passthroughs (`mapMenu`, `subscribeX`, …) — consumer has ONE import line for setup + content.
- Snippet body: `onclick={async () => { await action(payload); payload.close() }}` — `close()` is the SNIPPET'S responsibility, not the action's.
- No `<style>`. Wrapper owns container styling; content authors own item styling if needed — see `css-scope.md`.

## Controller

- `.svelte.ts` filename — required for runes.
- Exports: sentinel ID constants; `$state` data; `subscribeX()` returning unsubscribe; action functions.
- `subscribeX()`: reads `appState.map` directly (no `map` argument). Desktop + marker-collision guards live INSIDE the handler.
- Verb pairs (per `/code-style`): `subscribeX`/`unsubscribeX` for event subscription; `attachX`/`detachX` reserved for Svelte `{@attach}` lifecycle; `mountX`/`unmountX` for component lifecycle; `createX`/`destroyX` for factory pairs. Conflation is a bug (verified from the 2026-05-12 session).
- Action functions are pure: take Payload, mutate the appropriate stores, never call `close()`.
- Sentinel ids when no domain id exists: `MAP_CONTEXT_POPUP_ID = '__map__'` — double-underscore + lowercase prevents collision with real ids.

## Visual

- NO `<script>` block at all (neither instance nor module).
- NO third-party imports.
- Markup + styles only. If you can't remove the `<script>` and have the file still render, it's not Visual.
- `@component` JSDoc per `/code-style-svelte`.
- Mounted by the wrapper via imperative `mount()` when needed for third-party bridging (`third-party.md`).

## Shared util

- One file per CATEGORY, not per symbol. `$utils/domActions.ts` holds ALL DOM attachments. NOT `autofocus.ts`.
- Each export typed `Attachment<HTMLElement>` (or narrower).
- Extract on the SECOND use site. Don't pre-extract.
