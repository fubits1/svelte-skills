---
name: css-nesting
description: How to convert flat CSS to nested CSS using & while satisfying stylelint's no-descending-specificity and no-duplicate-selectors rules. Use this skill whenever nesting CSS selectors, refactoring flat CSS to use &, or encountering stylelint specificity/duplicate errors after nesting. Auto-invoke when editing <style> blocks and the code-style rule says to nest with &.
user-invocable: true
---

# CSS Nesting with Stylelint Compliance

Flat-to-nested CSS conversion breaks when done incrementally because each edit shifts specificity ordering, triggering cascading linter errors. This skill prevents that by requiring upfront analysis before any edits.

## When This Applies

- Converting flat CSS selectors to nested `&` syntax
- Fixing `no-descending-specificity` or `no-duplicate-selectors` errors after nesting
- Any CSS restructuring that changes selector source order

## The Two Rules You Must Satisfy

### `no-descending-specificity`

Selectors matching the **same DOM element** must appear in ascending specificity order in source. A `.foo` (0,1,0) appearing after `.bar:hover .foo` (0,3,0) is an error because both can match a `.foo` element.

Selectors matching **different elements** don't conflict regardless of order.

### `no-duplicate-selectors`

Two rule blocks resolving to the same selector are forbidden. Nesting changes resolved selectors: `& .child` inside `.parent` resolves to `.parent .child`. A second `.parent` block is a duplicate even if the contents differ.

Exception: the same selector inside vs outside a `@media` block is allowed (different parent nodes).

## The Workflow

### Step 1: Map the DOM hierarchy

Write out the parent-child nesting from the HTML template:

```css
.container
  .wrapper
    .item
      .label
```

### Step 2: List every selector with its specificity

For each selector in the flat CSS, calculate specificity and note which DOM element it matches:

```css
.wrapper              (0,1,0)  matches .wrapper
.wrapper:hover        (0,2,0)  matches .wrapper
.item                 (0,1,0)  matches .item
.wrapper:hover .item  (0,3,0)  matches .item
.label                (0,1,0)  matches .label
.container:has(:hover) .wrapper:not(:has(:hover))  (0,4,0)  matches .wrapper
```

### Step 3: Group by target element and sort ascending

For each element, the selectors that match it must appear in ascending specificity order in the final source:

```css
Selectors matching .wrapper:
  .wrapper              (0,1,0)  ← first
  .wrapper:hover        (0,2,0)
  .container:has(:hover) .wrapper:not(:has(:hover))  (0,4,0)  ← last

Selectors matching .item:
  .item                 (0,1,0)  ← first
  .wrapper:hover .item  (0,3,0)  ← last
```

### Step 4: Design the block structure

Place blocks so that within each element group, specificity ascends in source order. Key principles:

**Nest children inside parents** to match DOM hierarchy. `& .item` inside `.wrapper` resolves to `.wrapper .item` (0,2,0) — this increases specificity vs flat `.item` (0,1,0), which is fine as long as the ordering still ascends.

**High-specificity cross-cutting selectors go last.** If `.container:has(:hover) .wrapper:not(...)` at (0,4,0) matches `.wrapper`, it must appear in source after all other `.wrapper`-matching selectors. Since it's nested under `.container`, put the `.container` block after the `.wrapper` block.

**One block per selector.** Can't have two `.container` blocks — use one block with all its rules.

**`@media` nests inside its parent block.** `@media` inside `.wrapper { }` avoids both duplicate-selector issues and keeps related rules together.

### Step 5: Write the entire `<style>` block in one edit

Never do incremental edits. Write the complete nested CSS as a single replacement. Each incremental edit shifts source order and triggers new linter errors.

### Step 6: Validate

1. Run stylelint on the file
2. Run existing tests
3. If using pixel-perfect workflow, compare before/after measurements

## Specificity Calculation Reference

| Component                                                         | Specificity added                            |
| ----------------------------------------------------------------- | -------------------------------------------- |
| Element type (`div`, `span`)                                      | (0,0,1)                                      |
| Class, attribute, pseudo-class (`.foo`, `:hover`, `:nth-child()`) | (0,1,0)                                      |
| ID (`#bar`)                                                       | (1,0,0)                                      |
| `:is()`, `:not()`, `:has()`                                       | Highest specificity of their argument        |
| `&` (nesting selector)                                            | Same as `:is()` — takes parent's specificity |
| `~`, `+`, `>`, ` ` (combinators)                                  | Add nothing                                  |

Nesting with `&` uses `:is()` wrapping semantics per [CSS Nesting Module Level 1](https://www.w3.org/TR/css-nesting-1/). The `&` selector adopts the highest specificity from the parent selector list.

## Example: The Hard Case

This is the pattern that breaks naive nesting — a high-specificity desaturate rule that crosses parent-child boundaries:

**Problem:** `.container:has(:hover) .child:not(:has(:hover))` at (0,4,0) matches `.child` elements. If `.container` block comes first with this rule inside, then `.child` block comes second at (0,1,0), that's descending specificity.

**Solution:** Put `.child` block first (all its selectors ascending), then `.container` block second (with the desaturate rule at the end). They target different elements so the block ordering doesn't trigger `no-descending-specificity`.

```css
/* .child block first — all .child-matching selectors in ascending order */
.child {
  /* (0,1,0) matches .child */

  & .grandchild {
    /* (0,2,0) matches .grandchild */
  }

  &:hover {
    /* (0,2,0) matches .child */

    & .grandchild {
      /* (0,3,0) matches .grandchild — ascending */
    }
  }

  &:nth-child(2n) {
    /* (0,2,0) matches .child — same specificity as :hover, OK */
  }

  @media (width > 768px) {
    /* desktop overrides — same selectors allowed inside @media */
    &:nth-child(2n) {
      /* different parent node, not a duplicate */
    }
  }
}

/* .container block second — highest-specificity .child selector comes last */
.container {
  /* (0,1,0) matches .container — different element, no conflict */

  @media (width > 768px) {
    /* desktop overrides */
  }

  /* Desaturate — (0,4,0) matches .child — after all .child selectors above */
  &:has(:hover) .child:not(:has(:hover)) {
    opacity: 0.85;

    & .grandchild {
      /* (0,5,0) matches .grandchild — after all .grandchild selectors above */
      filter: grayscale(100%);
    }
  }
}
```

## References

- [CSS Nesting Module Level 1 (W3C)](https://www.w3.org/TR/css-nesting-1/)
- [MDN: CSS Nesting and Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Nesting/Nesting_and_specificity)
- [stylelint: no-descending-specificity](https://stylelint.io/user-guide/rules/no-descending-specificity/)
- [stylelint: no-duplicate-selectors](https://stylelint.io/user-guide/rules/no-duplicate-selectors/)
- [HoneycombGrid plan](references/honeycomb-plan.md) — real-world example: full specificity analysis and solution for a complex honeycomb grid with cross-cutting desaturate rule
