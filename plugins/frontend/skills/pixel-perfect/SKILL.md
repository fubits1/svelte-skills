---
name: pixel-perfect
description: Pixel drift detection — mandatory measurement workflow for any CSS or HTML element change. Auto-invoke when editing CSS, changing HTML elements, or replacing DOM structures.
user-invocable: true
---

# Pixel-Perfect: Mandatory Measurement Workflow

When making **any** CSS change or HTML element swap (e.g. `<dl>` to `<ul>`, `<div>` to `<section>`), follow this workflow exactly. Screenshots alone prove NOTHING about pixel parity — only measured numbers do.

## Step 1: Measure BEFORE (while original code is still in place)

Use `browser_evaluate` to capture exact values for every affected element:

```js
// Capture dimensions
el.getBoundingClientRect() // width, height, x, y

// Capture computed styles — the ACTUAL rendered values, not what CSS says
getComputedStyle(el).display     // may differ from your CSS (global overrides!)
getComputedStyle(el).gap
getComputedStyle(el).margin
getComputedStyle(el).padding
getComputedStyle(el).lineHeight
getComputedStyle(el).fontSize
```

**Store these numbers.** Report them. They are your baseline.

### Critical: Measure ACTUAL computed styles, not what you think the CSS does

Global styles, resets, and browser defaults frequently override scoped CSS. A `<dl>` might render as `display: grid; gap: 16px` even though scoped CSS says `display: flex; gap: 8px`. **Never assume — always measure.**

## Step 2: Make the code change

Edit the HTML/CSS.

## Step 3: Measure AFTER

Navigate to the same page. Measure the **same elements** with `browser_evaluate`. Report the numbers side by side.

### Beware HMR staleness

After `git stash pop`, `git checkout`, or file restoration, the dev server may serve stale CSS. **Touch the file** (`touch path/to/file`) and hard-reload before measuring.

## Step 4: Compare and report

Report a table:

```
| Metric         | Before | After | Diff |
| -------------- | ------ | ----- | ---- |
| footer height  | 396px  | 396px | 0    |
| section height | 98px   | 98px  | 0    |
```

## Step 5: Investigate any diff

If **any** measurement differs by even 1px:

1. **Do not dismiss it.** Do not say "close enough" or "imperceptible."
2. Investigate the root cause: default margins, line-heights, display mode, gap values, global style overrides.
3. Fix it to 0px diff.
4. Measure again to prove the fix.

## Common traps when replacing HTML elements

| Trap                    | Example                                                          | Fix                                              |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| Browser default margins | `<ul>` has `margin: 0 0 16px`, `<dl>` has `margin: 1em 0`        | Explicitly reset `margin: 0`                     |
| Browser default padding | `<ul>` has `padding-left: 40px`                                  | Explicitly reset `padding: 0`                    |
| Default line-height     | `<li>` gets `line-height: 1.5` from UA stylesheet                | Set `line-height: 1` or match original           |
| Global CSS overrides    | A global `dl { display: grid }` overrides scoped `display: flex` | Measure computed styles BEFORE changing elements |
| Scoped CSS not matching | Changed `& dl` to `& ul` but Astro scoping attrs differ          | Touch file + reload to force CSS rebuild         |

## NEVER

- NEVER claim "no visual regression" or "looks identical" from eyeballing screenshots
- NEVER skip the BEFORE measurement — you cannot compare without a baseline
- NEVER report "approximately the same" — report exact pixel values
- NEVER proceed if you don't have BEFORE numbers — revert and measure first
