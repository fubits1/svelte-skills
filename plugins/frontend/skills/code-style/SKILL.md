---
name: code-style
description: "Code style rules for all languages: variable naming, brace style, HTML data attributes, markup, forms and locale formatting, CSS nesting. Auto-invoke when editing code files, writing new functions or markup, or naming variables."
user-invocable: true
---

# Code Style

## Brace Style

Single-line `if` without braces is OK only when the entire statement fits on one line:

```js
// OK — fits on one line. But then we need an empty line after the statement, except there is another if, then we need an empty line after the last if.
if (x) doThing();

//OK
if (x) doThing();
if (y) doThingY();
if (z) do ThingZ();

let x = 1

//NOT OK
if (x) doThing();
let x = 1

// NOT OK — body wraps to the next line, needs braces
if (x)
  doThing();

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

## Markup and Locale

- A native `<button>` activates on Enter and Space, an `<a href>` on Enter only. Use `<button>` for actions and `<a href>` for navigation to a real URL; only a non-semantic element with a `role` needs its own key handler.
- Give inputs a meaningful `name`, the matching `type` (`email`, `tel`, `url`, `number`) and `inputmode`, and turn off spellcheck on emails, codes and usernames (`spellcheck="false"`).
- Give every field that collects information about the user its `autocomplete` token (`name`, `email`, `tel`, `street-address`, `one-time-code`), which WCAG 1.3.5 requires. Use `autocomplete="off"` only on a field that must never be autofilled.
- Wrap a checkbox or radio and its text in one `<label>`, so the whole row is a single hit target with no dead zone.
- Keep a submit button enabled until the request starts, then show a spinner while it runs.
- Warn before the user leaves with unsaved changes: `beforeunload` on plain pages, `beforeNavigate` on SvelteKit (`svelte-5:code-style-svelte`).
- Never disable zoom with `user-scalable=no` or `maximum-scale=1`. Match `<meta name="theme-color">` to the page background.
- During a drag, put `inert` on the content that isn't a drop target, not on the dragged element (text selection: `frontend:code-style-css`).
- Format dates, times, numbers and currency with `Intl.DateTimeFormat` and `Intl.NumberFormat`. Detect the language from `Accept-Language` or `navigator.languages`, not the IP. Mark brand names, code and identifiers with `translate="no"`.

## Variable Naming

Use semantic, human-readable names. The name should say what the thing IS, not save keystrokes.

| Don't | Do |
| --- | --- |
| `ctx` | `context` |
| `c`, `cb` | `callback` |
| `obj` | `object` or something more specific |
| `val` | `value` |
| `tmp` | `temporary` or something more specific |
| `res` | `result` or `response` |
| `el` | `element` |

**Exceptions:** Loop variables (`i`, `j`) and lambda params where meaning is obvious from context (`(item) => item.id`) are fine.

## Function Naming

Functions are verbs. Past-participle nouns (`mountedPopup`) lie about lifecycle, wrong for a factory that mounts lazily. Use `createComponentPopup`.

Conventions: `createX`/`buildX` (factory), `getX` (sync read), `loadX`/`fetchX` (async), `isX`/`hasX` (predicate), `toX` (transform), `attachX`/`detachX` (lifecycle), `onX`/`handleX` (event).

One word, not two: `toggle` already means open-if-closed/close-if-open. Don't write `toggleOrShow`. Same for `closeAndReset`, `getOrCreate`.

Plural follows the work: if a function grows to handle N where it handled 1, rename. `detachPopup` that now detaches info + context popups is `detachPopups`.

## TypeScript

### `type` over `interface`

Use `type` for object shapes. Never use `interface` unless extending a third-party interface.

```ts
// BAD
interface Milestone {
  date: string
  label: string
}

// GOOD
type Milestone = {
  date: string
  label: string
}
```

### Private members in classes

Private class members (fields and methods) should be prefixed with `#`, never `private`. `#` is enforced at runtime; `private` is compile-time only.

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

This applies to all CSS, component styles, global stylesheets, everywhere. For the full nesting workflow (specificity analysis, block ordering, stylelint compliance), use `frontend:css-nesting`.

## Related Skills

- `frontend:editing`: File editing discipline, comment preservation, refactoring safety.
- `svelte-5:code-style-svelte`: Svelte-specific style rules (component docs, reactivity patterns).
- `frontend:css-nesting`: Full CSS nesting workflow with specificity analysis and stylelint compliance.
