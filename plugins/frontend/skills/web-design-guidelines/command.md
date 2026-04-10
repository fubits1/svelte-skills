# Web Interface Guidelines (Svelte)

> Adapted from [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines).
> Copyright 2025 Vercel Labs. Licensed under the MIT License.
> Svelte-specific additions are original.

Review these files for compliance: $ARGUMENTS

Read files, check against rules below. Output concise but comprehensive—sacrifice grammar for brevity. High signal-to-noise.

## Rules

### Accessibility

- Icon-only buttons need `aria-label`
- Form controls need `<label>` or `aria-label`
- Interactive elements need keyboard handlers (`onkeydown`/`onkeyup`)
- `<button>` for actions, `<a>` for navigation (not `<div onclick>`)
- Images need `alt` (or `alt=""` if decorative)
- Decorative icons need `aria-hidden="true"`
- Async updates (toasts, validation) need `aria-live="polite"`
- Use semantic HTML (`<button>`, `<a>`, `<label>`, `<table>`) before ARIA
- Headings hierarchical `<h1>`–`<h6>`; include skip link for main content
- `scroll-margin-top` on heading anchors

### Focus States

- Interactive elements need visible focus: `:focus-visible` outline or equivalent
- Never `outline: none` without focus replacement
- Use `:focus-visible` over `:focus` (avoid focus ring on click)
- Group focus with `:focus-within` for compound controls

### Forms

- Inputs need `autocomplete` and meaningful `name`
- Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`
- Never block paste (`onpaste` + `preventDefault`)
- Labels clickable (`for` attribute or wrapping control)
- Disable spellcheck on emails, codes, usernames (`spellcheck="false"`)
- Checkboxes/radios: label + control share single hit target (no dead zones)
- Submit button stays enabled until request starts; spinner during request
- Errors inline next to fields; focus first error on submit
- Placeholders end with `…` and show example pattern
- `autocomplete="off"` on non-auth fields to avoid password manager triggers
- Warn before navigation with unsaved changes (`beforeunload` or `beforeNavigate`)

### Animation

- Honor `prefers-reduced-motion` (provide reduced variant or disable)
- Animate `transform`/`opacity` only (compositor-friendly)
- Never `transition: all`—list properties explicitly
- Set correct `transform-origin`
- SVG: transforms on `<g>` wrapper with `transform-box: fill-box; transform-origin: center`
- Animations interruptible—respond to user input mid-animation
- Svelte transitions (`transition:`, `in:`, `out:`) respect `prefers-reduced-motion`

### Typography

- `…` not `...`
- Curly quotes `"` `"` not straight `"`
- Non-breaking spaces: `10&nbsp;MB`, `⌘&nbsp;K`, brand names
- Loading states end with `…`: `"Loading…"`, `"Saving…"`
- `font-variant-numeric: tabular-nums` for number columns/comparisons
- Use `text-wrap: balance` or `text-pretty` on headings (prevents widows)

### Content Handling

- Text containers handle long content: `truncate`, `line-clamp-*`, or `overflow-wrap: break-word`
- Flex children need `min-width: 0` to allow text truncation
- Handle empty states—don't render broken UI for empty strings/arrays
- User-generated content: anticipate short, average, and very long inputs

### Images

- `<img>` needs explicit `width` and `height` (prevents CLS)
- Below-fold images: `loading="lazy"`
- Above-fold critical images: `fetchpriority="high"`

### Performance

- Large lists (>50 items): virtualize (`svelte-virtual-list`, `content-visibility: auto`)
- No layout reads in reactive statements (`getBoundingClientRect`, `offsetHeight`, `offsetWidth`, `scrollTop`)
- Batch DOM reads/writes; avoid interleaving
- Use `{@attach}` for DOM interactions instead of `$effect` reading layout
- Add `<link rel="preconnect">` for CDN/asset domains
- Critical fonts: `<link rel="preload" as="font">` with `font-display: swap`
- Use `$state.raw` for large objects that are only reassigned, not mutated

### Navigation & State

- URL reflects state—filters, tabs, pagination, expanded panels in query params
- Links use `<a>` (Cmd/Ctrl+click, middle-click support)
- Deep-link all stateful UI (use `$page.url.searchParams` or `goto` with query params)
- Destructive actions need confirmation modal or undo window—never immediate

### Touch & Interaction

- `touch-action: manipulation` (prevents double-tap zoom delay)
- `-webkit-tap-highlight-color` set intentionally
- `overscroll-behavior: contain` in modals/drawers/sheets
- During drag: disable text selection, `inert` on dragged elements

### Safe Areas & Layout

- Full-bleed layouts need `env(safe-area-inset-*)` for notches
- Avoid unwanted scrollbars: `overflow-x: hidden` on containers, fix content overflow
- Flex/grid over JS measurement for layout

### Dark Mode & Theming

- `color-scheme: dark` on `<html>` for dark themes (fixes scrollbar, inputs)
- `<meta name="theme-color">` matches page background
- Native `<select>`: explicit `background-color` and `color` (Windows dark mode)

### Locale & i18n

- Dates/times: use `Intl.DateTimeFormat` not hardcoded formats
- Numbers/currency: use `Intl.NumberFormat` not hardcoded formats
- Detect language via `Accept-Language` / `navigator.languages`, not IP

### Hover & Interactive States

- Buttons/links need hover state (visual feedback)
- Interactive states increase contrast: hover/active/focus more prominent than rest

### Content & Copy

- Active voice: "Install the CLI" not "The CLI will be installed"
- Title Case for headings/buttons (Chicago style)
- Numerals for counts: "8 deployments" not "eight"
- Specific button labels: "Save API Key" not "Continue"
- Error messages include fix/next step, not just problem
- Second person; avoid first person
- `&` over "and" where space-constrained

### Anti-patterns (flag these)

- `user-scalable=no` or `maximum-scale=1` disabling zoom
- `onpaste` with `preventDefault`
- `transition: all`
- `outline: none` without `:focus-visible` replacement
- Inline `onclick` navigation without `<a>`
- `<div>` or `<span>` with click handlers (should be `<button>`)
- Images without dimensions
- Large arrays `{#each}` without virtualization
- Form inputs without labels
- Icon buttons without `aria-label`
- Hardcoded date/number formats (use `Intl.*`)
- `$effect` for derived state (use `$derived` instead)
- `on:click` instead of `onclick` (legacy Svelte 4 syntax)
- `<slot>` instead of `{#snippet}` / `{@render}` (legacy Svelte 4 syntax)
- `use:action` instead of `{@attach}` (legacy Svelte 4 syntax)

## Output Format

Group by file. Use `file:line` format (VS Code clickable). Terse findings.

```text
## src/lib/Button.svelte

src/lib/Button.svelte:42 - icon button missing aria-label
src/lib/Button.svelte:18 - input lacks label
src/lib/Button.svelte:55 - animation missing prefers-reduced-motion

## src/lib/Modal.svelte

src/lib/Modal.svelte:12 - missing overscroll-behavior: contain
src/lib/Modal.svelte:34 - "..." → "…"

## src/lib/Card.svelte

✓ pass
```

State issue + location. Skip explanation unless fix non-obvious. No preamble.
