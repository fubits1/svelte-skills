---
name: web-design-guidelines
description: "Routes web UI work to maintained sources: Chrome modern-web-guidance for new HTML/CSS/JS, web-quality-skills for a11y, performance and SEO audits, and installed design skills. Adds UI copy rules and a file:line review format."
argument-hint: <file-or-pattern>
user-invocable: true
---

# Web design guidelines

Pick the source that matches the task. The sources are maintained upstream: fetch or run them instead of answering from memory. Skip a skill that isn't installed; installing it is the user's call.

## Sources

| Task | Source | How |
| --- | --- | --- |
| Building a feature with HTML, CSS or client-side JS | GoogleChrome modern-web-guidance | Run `pnpx modern-web-guidance@latest search "<what you build>"`, then `pnpx modern-web-guidance@latest retrieve "<id>"`. Apply a guide's fallbacks for features that aren't Baseline Widely available, unless the project's CLAUDE.md sets another Baseline target |
| Accessibility, performance, Core Web Vitals, SEO or best-practice audit | addyosmani/web-quality-skills | Fetch `https://raw.githubusercontent.com/addyosmani/web-quality-skills/main/skills/<name>/SKILL.md`, with `<name>` one of `accessibility`, `performance`, `core-web-vitals`, `seo`, `best-practices`, or `web-quality-audit` for all of them |
| Visual direction for a new page or component | `frontend-design:frontend-design` | Invoke the skill |
| UX rules, palettes, font pairings, design tokens | `ui-ux-pro-max:ui-ux-pro-max`, `ui-ux-pro-max:design-system`, `ui-ux-pro-max:ui-styling` | Invoke the skill |
| Checking a running page | `chrome-devtools-mcp:a11y-debugging`, `chrome-devtools-mcp:debug-optimize-lcp` | Invoke the skill |
| Markup, CSS and locale rules the sources miss | `frontend:code-style` ("Markup and Locale"), `frontend:code-style-css` ("Rules for styles you write") | Apply them while writing; check them in a review |
| Svelte components | Svelte's `a11y_*` compiler warnings, `svelte-5:code-style-svelte`, `svelte:svelte-core-bestpractices` | `svelte-check` and the Svelte autofixer report the warnings. Treat each as a finding; suppress one with `<!-- svelte-ignore <code> -->` only next to a comment that says why |

## Precedence

- WCAG 2.2 AA is the floor: text contrast at least 4.5:1 (3:1 for large text and UI components) and targets at least 24x24 CSS px. A stricter value from a design skill, such as 44x44 px touch targets, is a target on top of that floor.
- The project's own rules (CLAUDE.md, this marketplace's skills) override the generic sources.

## Interactive states

Buttons and links have a hover state, and hover, active and focus states raise the contrast over the resting state.

## Copy and typography

- Write `…`, not `...`, also in loading states (`Loading…`, `Saving…`). Placeholders end with `…` and show an example.
- Use curly quotes, not straight quotes.
- Put a non-breaking space in units, shortcuts and brand names: `10&nbsp;MB`, `⌘&nbsp;K`.
- Use Title Case for headings and buttons (Chicago style).
- Use numerals for counts: "8 deployments", not "eight".
- Label buttons with the action ("Save API Key", not "Continue"). Error messages say how to fix the problem.
- Write in active voice and second person. Use `&` instead of "and" only where space is short.

## Review output

To review files (`$ARGUMENTS`; ask which files if none are given), group findings by file in clickable `file:line` form, one terse finding per line, and write `✓ pass` for a clean file. State the issue and location; explain only when the fix isn't obvious.

This skill, `frontend:code-style` and `frontend:code-style-css` adapt several rules from Vercel's [web-design-guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) skill and its [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) (MIT).
