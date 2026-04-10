---
name: code-style-css
description: Use when editing CSS, SCSS, or style blocks in .svelte files. Covers CSS-specific code style rules. Auto-invoke when writing or modifying styles.
user-invocable: true
---

# CSS Code Style

- Only add layout/flow styles (flex, grid). No decorative styles unless asked.
- **ALWAYS** nest CSS and **ALWAYS** nest with `&`. For the full nesting workflow (specificity analysis, block ordering, stylelint compliance), use `frontend:css-nesting`.
