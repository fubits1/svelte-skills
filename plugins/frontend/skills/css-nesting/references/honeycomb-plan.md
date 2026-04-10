# HoneycombGrid CSS Nesting

## Context

All CSS in `src/lib/compositions/HoneycombGrid.svelte` uses flat selectors. Code-style rule requires nesting with `&`. Previous attempts failed because edits were made incrementally without planning the full specificity ordering upfront, causing cascading stylelint errors.

## Constraints

Two stylelint rules (from `stylelint-config-standard`, NOT overridden in `stylelint.config.js`):

- **`no-descending-specificity`**: selectors matching the SAME element must appear in ascending specificity in source order
- **`no-duplicate-selectors`**: no two rule blocks with the same resolved selector

## The Problem

The desaturate rule `.honeycomb:has(:hover) .hex-wrapper:not(:has(:hover))` has specificity (0,4,0) and matches `.hex-wrapper` elements. It MUST appear after ALL other `.hex-wrapper`-matching selectors. But it's nested under `.honeycomb`. If `.honeycomb` block comes first and `.hex-wrapper` block comes second, the linter flags descending specificity.

## Solution

Put `.hex-wrapper` block FIRST, `.honeycomb` block SECOND. They target different elements so source order between them doesn't trigger the linter. The desaturate rule inside `.honeycomb` at the end naturally comes after all `.hex-wrapper` selectors.

Nest `.hex-tile` and `.hex-label` inside `.hex-wrapper` (matching DOM hierarchy).

### Specificity order proof (selectors matching `.hex-wrapper`)

```
.hex-wrapper                           (0,1,0)  ← .hex-wrapper block start
.hex-wrapper:has(:hover)               (0,2,0)  ← &:has(:hover)
.hex-wrapper:nth-child(*)              (0,2,0)  ← mobile grid rules
.hex-wrapper:nth-child(*) @media       (0,2,0)  ← desktop grid rules
.hex-wrapper:first-child:nth-last-child(3)        (0,3,0)  ← special 3-item
.hex-wrapper:..~ .hex-wrapper:nth-child(2)        (0,4,0)  ← sibling in 3-item
.honeycomb:has(:hover) .hex-wrapper:not(:has(:hover))  (0,4,0)  ← desaturate (LAST)
```

### Specificity order proof (selectors matching `.hex-tile`)

```
.hex-wrapper .hex-tile                 (0,2,0)  ← & .hex-tile
.hex-wrapper:has(:hover) .hex-tile     (0,3,0)  ← ascending
.honeycomb:has(:hover) ...  .hex-tile  (0,5,0)  ← desaturate (LAST)
```

## File

- Modify: `src/lib/compositions/HoneycombGrid.svelte` — lines 34-177 (`<style>` block only)

## Steps

1. **Run existing tests as baseline** — `pnpm vitest run src/lib/compositions/HoneycombGrid.svelte.test.ts` — expect all pass (14 tests: 7 desktop + 7 mobile layout tests covering positioning for 1-7 items)
2. **Before measurement** — take pixel-perfect baseline measurements of the honeycomb at `localhost:4321` using `browser_evaluate` (getBoundingClientRect on `.honeycomb`, `.hex-wrapper`, `.hex-tile`)
3. **Replace the entire `<style>` block** with the nested version (one edit, not incremental)
4. **Run stylelint** — `pnpm stylelint "src/lib/compositions/HoneycombGrid.svelte"` — expect zero errors
5. **Re-run tests** — same vitest command — expect all 14 pass with 0 failures
6. **After measurement** — same measurements, compare side-by-side, expect 0px diff
7. **Visual spot-check** — hover behavior (scale, brightness, desaturate) still works

## Test file

- `src/lib/compositions/HoneycombGrid.svelte.test.ts` — vitest-browser-svelte tests verifying hex positions at desktop (1024px) and mobile (400px) viewports for 1-7 item counts

## Target CSS

```css
.hex-wrapper {
    /* base */
    & .hex-tile {
        /* base */
        & .hex-label { /* base */ }
    }
    &:has(:hover) {
        /* hover state */
        & .hex-tile { filter: brightness(1.15); }
    }
    /* mobile nth-child */
    @media (width > 500px) {
        /* desktop nth-child, special layouts */
    }
}

.honeycomb {
    /* base + custom props */
    @media (width > 500px) { /* desktop overrides */ }
    /* desaturate — highest specificity, LAST */
    &:has(:hover) .hex-wrapper:not(:has(:hover)) {
        & .hex-tile { /* grayscale */ }
    }
}
```
