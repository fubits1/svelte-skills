---
name: css-subgrid
description: Use when building card grids, tile layouts, or repeated components where inner content (icons, titles, prices, buttons) must align across siblings. Also use when seeing misaligned card content at different text lengths.
---

# CSS Subgrid for Card Layouts

## Overview

CSS Subgrid lets grid children inherit parent track sizing, so inner content (icons, labels, prices, CTAs) aligns across sibling cards without fixed heights or hacks.

## When to Use

- Repeated card/tile components where inner elements must align horizontally across cards
- Icon + label grids where icons should share a row track
- Any layout where variable-length content in one card shouldn't break alignment with siblings

**When NOT to use:**

- Single-column layouts (no siblings to align with)
- Cards with identical fixed content heights (subgrid adds no value)

## Core Pattern

```css
/* Parent: responsive wrapping grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 200px));
  justify-content: center;
  gap: 1rem;
}

/* Child: spans N rows and inherits parent row tracks */
.card {
  display: grid;
  grid-row: span 2; /* one per content section: icon + label = 2 */
  grid-template-rows: subgrid;
  justify-items: center;
  align-content: center;
  gap: 0.5rem;
}
```

### How it works

1. **Parent** defines columns with `auto-fill` + `minmax()` for responsive wrapping
2. **Parent** does NOT need explicit `grid-template-rows`: implicit `auto` rows are created
3. **Child** uses `grid-row: span N` (N = number of content sections per card)
4. **Child** uses `grid-template-rows: subgrid` to inherit parent row tracks
5. All cards in the same visual row share track heights, so content aligns

## Key Decisions

### Column sizing: `minmax(min, max)` NOT `minmax(min, 1fr)`

Using `1fr` as max stretches cards to fill available space, cards become too wide and look bad:

```css
/* BAD: cards stretch to fill row */
grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));

/* GOOD: cards stay compact, max 200px */
grid-template-columns: repeat(auto-fill, minmax(140px, 200px));
```

Use `justify-content: center` on the parent to center the grid tracks.

### `auto-fill` vs `auto-fit`

- `auto-fill`: creates as many tracks as fit, empty tracks remain (grid stays compact)
- `auto-fit`: collapses empty tracks, items stretch to fill (can cause unwanted stretching with `1fr`)

For card grids with capped max width, both work similarly. Prefer `auto-fill`.

### `span N` vs `1 / -1`

- `grid-row: span 2`: works with implicit rows, cards wrap to new row groups naturally
- `grid-row: 1 / -1`: only works with explicit rows, breaks when cards wrap

**Always use `span N` for wrapping grids.**

## Subgrid Axis Limitations

Row subgrid + auto-fill columns **works** (the pattern above).

Column subgrid + auto-fill rows **does NOT work**, you need explicit column counts with media queries for column subgrid.

## Quick Reference

| Cards with N sections | `grid-row` | Example |
| --- | --- | --- |
| Icon + Label | `span 2` | Link cards, feature tiles |
| Image + Title + Description | `span 3` | Blog cards, product cards |
| Image + Title + Description + CTA | `span 4` | E-commerce cards |

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Cards stretch too wide | Use `minmax(min, max)` not `minmax(min, 1fr)` |
| Cards don't wrap on narrow screens | Use `auto-fill` not fixed `repeat(3, ...)` |
| Subgrid breaks when wrapping | Use `span N` not `1 / -1` |
| Icons misaligned across rows | Ensure ALL cards have same `span N` value |
| Cards without icons break alignment | Use consistent HTML structure, hide icon visually if absent |

## Resources

- [Learn CSS Subgrid: Ahmad Shadeed](https://ishadeed.com/article/learn-css-subgrid/), comprehensive guide with card examples
- [Brand New Layouts with CSS Subgrid: Josh W. Comeau](https://www.joshwcomeau.com/css/subgrid/), covers column subgrid limitations
- [CSS Subgrid: web.dev](https://web.dev/articles/css-subgrid), browser support and basics
- [Subgrid: MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Subgrid), reference documentation

## Browser Support

Supported in all modern browsers (Chrome 117+, Firefox 71+, Safari 16+, Edge 117+). ~98% global support as of 2026.

## Related skills

- `frontend:css-nesting`: Full CSS nesting workflow with specificity analysis and stylelint compliance.
- `frontend:code-style-css`: CSS-specific code style rules (nesting, layout-only).
- `frontend:pixel-perfect`: Pixel drift detection when modifying CSS or HTML element structure.
