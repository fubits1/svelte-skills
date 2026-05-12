# composition-svelte — CSS scope discipline (no `:global()`)

Read this when: about to type `:global(...)` inside a wrapper's `<style>` block.

`/code-style-svelte` says NEVER use `:global()` selectors unless told otherwise. The first instinct after splitting a wrapper from its content is to reach for `:global(button)` in the wrapper to style the snippet's children. Don't.

## Three options, in order of preference

| Option | When |
| --- | --- |
| **Content owns its own styles** | Default. The snippet provider (e.g. `DefaultItems.svelte`) puts the buttons' styles next to the buttons. Wrapper styles only its container. |
| **CSS custom properties as tokens** | When the wrapper wants to enforce a visual theme but let content opt in. Wrapper exposes `--menu-item-padding`; content uses `padding: var(--menu-item-padding)`. |
| **Shared utility class via global stylesheet** | When the styling truly is shared cross-feature (e.g. `.menu-item` in `$styles/features/menu.css`). Document the contract. |

`:global()` even nested under a parent class hides cross-scope coupling. Refactor, relocate, or expose a custom property.
