# composition-svelte — a11y for overlays

Read this when: building any overlay that accepts keyboard interaction (popup, menu, modal, drawer, dialog, tooltip).

## The problem

Overlays opened from a non-keyboard event (right-click, hover, programmatic) do NOT receive focus automatically. ESC keydown only fires on the focused element OR via a window listener. CSS `:focus-visible` shows focus on programmatic focus without leaking to mouse clicks.

## Three primitives — always paired

1. **Programmatic focus on open** — `{@attach autofocus}` (from `$utils/domActions`) on the overlay's root. `autofocus` does `queueMicrotask(() => element.focus())`. Pair with `tabindex="-1"`.
2. **Window-level ESC fallback** — `<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape') close() }} />`. Gate on `open` so it only grabs ESC while the overlay is up.
3. **`:focus-visible` styling** — focus ring on the root + each interactive descendant:

```css
&:focus-visible {
  outline: 2px solid var(--color-blue-500, #3b82f6);
  outline-offset: -2px;
}
```

Use `:focus-visible`, NOT `:focus`. Mouse-click shouldn't show the ring.

## Additional a11y

- `role="menu"` + `role="menuitem"` for menu-style overlays.
- `aria-hidden="true"` on purely visual companions (e.g. a marker dot).
- `aria-label` on the overlay root if it has no text title.

## Symmetric coverage

When a UX bug appears in any one overlay, the symmetric-bug discipline applies — fix the analogous components in the same change (see SKILL.md "Symmetric bugs").
