---
name: code-style-css
description: Use when editing CSS, SCSS, or style blocks in .svelte files. Covers CSS-specific code style rules. Auto-invoke when writing or modifying styles.
user-invocable: true
---

# CSS Code Style

- Only add layout/flow styles (flex, grid). No decorative styles unless asked.
- **ALWAYS** nest CSS and **ALWAYS** nest with `&`. For the full nesting workflow (specificity analysis, block ordering, stylelint compliance), use `frontend:css-nesting`.

## Rules for styles you write

These rules apply to styles the task already calls for; they don't license decorative styles you weren't asked for.

- Never `transition: all`; list the animated properties. Set the right `transform-origin`; for SVG, transform a `<g>` wrapper with `transform-box: fill-box; transform-origin: center`.
- Lay out with flex or grid rather than JS measurement. Fix content that overflows instead of hiding scrollbars.
- Size text containers for short, average and very long content. A flex child that truncates text needs `min-width: 0`; clamp multi-line text with `line-clamp`.
- Full-bleed layouts pad with `env(safe-area-inset-*)` so notches don't cover content.
- Number columns and compared numbers use `font-variant-numeric: tabular-nums`.
- Group focus with `:focus-within` on compound controls.
- Set `-webkit-tap-highlight-color` on purpose. During a drag, disable text selection (`user-select: none`; `inert` placement: `frontend:code-style`).
- Give native `<select>` an explicit `background-color` and `color`, or Windows dark mode renders it unreadable.
