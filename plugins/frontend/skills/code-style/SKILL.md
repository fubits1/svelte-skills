---
name: code-style
description: "Code style rules for all languages — variable naming, brace style, HTML data attributes, CSS nesting. Auto-invoke when editing code files, writing new functions, or naming variables. Complements svelte-5:code-style-svelte (Svelte-specific) and frontend:css-nesting (full nesting workflow)."
user-invocable: true
---

# Code Style

## Brace Style

Single-line `if` without braces is OK only when the entire statement fits on one line:

```js
// OK — fits on one line
if (x) doThing();

// NOT OK — body wraps, needs braces
if (x) doThing();

// Correct
if (x) {
  doThing();
}
```

## HTML Data Attributes

Always use key-value syntax. Never use bare/boolean data attributes.

```html
<!-- BAD -->
<div data-active></div>

<!-- GOOD -->
<div data-active="true"></div>
```

## Variable Naming

Use semantic, human-readable names. The name should say what the thing IS, not save keystrokes.

| Don't     | Do                                     |
| --------- | -------------------------------------- |
| `ctx`     | `context`                              |
| `c`, `cb` | `callback`                             |
| `obj`     | `object` or something more specific    |
| `val`     | `value`                                |
| `tmp`     | `temporary` or something more specific |
| `res`     | `result` or `response`                 |
| `el`      | `element`                              |

**Exceptions:** Loop variables (`i`, `j`) and lambda params where meaning is obvious from context (`(item) => item.id`) are fine.

## CSS Nesting

Always nest CSS with `&`. Never write flat selectors as separate rules.

```css
/* BAD — flat selectors */
.parent .child { ... }
.parent:hover { ... }

/* GOOD — nested with & */
.parent {
  & .child { ... }
  &:hover { ... }
  &[data-active="true"] { ... }
}
```

This applies to all CSS — component styles, global stylesheets, everywhere. For the full nesting workflow (specificity analysis, block ordering, stylelint compliance), use `frontend:css-nesting`.

## Related Skills

- `frontend:editing` — File editing discipline, comment preservation, refactoring safety.
- `svelte-5:code-style-svelte` — Svelte-specific style rules (component docs, reactivity patterns).
- `frontend:css-nesting` — Full CSS nesting workflow with specificity analysis and stylelint compliance.
