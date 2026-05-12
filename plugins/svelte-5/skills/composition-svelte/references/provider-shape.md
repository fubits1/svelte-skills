# composition-svelte — Provider shape

Read this when: you've picked the Provider shape per `decisions.md`. See [SlideIn.svelte](src/lib/maplibre/MapApp/SlideIn.svelte) + [SlideIn_Content.svelte](src/lib/maplibre/MapApp/SlideIn/SlideIn_Content.svelte).

## Three roles

| Role | Example | Owns |
| --- | --- | --- |
| Provider (root) | `SlideIn.svelte` | Cross-cutting concerns: teleport (mobile/desktop), error boundaries, transitions |
| Content / view-registry | `SlideIn_Content.svelte` | View selection via `$derived` from FSM state; renders the chosen `<View />` dynamically |
| Views | `Views/Lot.svelte`, `Views/Pop.svelte`, … | Concrete domain components, one per FSM mode |

## Key distinction from Wrapper

The Provider doesn't have a single content slot; it orchestrates which View component renders, often via a `Record<Mode, Component>` registry. Snippets aren't typically involved — Views are full components.

Cross-references when the Provider sets up subtree state: `lifecycle.md` for one-shot wiring; `a11y-overlays.md` if the Provider hosts overlay-style content.
