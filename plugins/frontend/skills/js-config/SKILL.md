---
name: js-config
description: "Use when editing ESLint, Prettier, Stylelint, PostCSS, or Svelte config files. Use when adding or removing linting plugins, resolving formatter conflicts, auditing JS/TS toolchain configuration, or deciding whether a config package is needed."
---

# JS Config

Actionable decisions for JS/TS toolchain configuration.

## ESLint + Prettier: What To Do

### Scenario: ESLint and Prettier conflict on formatting

1. Run `pnpm exec eslint-config-prettier src/some-file.js`
2. If conflicts found, add `eslint-config-prettier`. See [eslint-prettier.md](eslint-prettier.md) for flat config setup.
3. If no conflicts, ESLint config has no formatting rules. Nothing to fix.

### Scenario: Should I add/keep `eslint-config-prettier`?

- Only needed if ESLint has active formatting rules (indent, quotes, semi, comma-dangle, etc.)
- Modern `recommended` configs enable zero formatting rules
- Legacy configs (`airbnb`, `standard`) enable many, so you need it
- Verify: `pnpm exec eslint-config-prettier src/some-file.js`

### Scenario: Knip/audit flags `eslint-config-prettier` as unused

- If not imported in `eslint.config.js`, it has zero effect. Safe to remove.
- If imported but CLI checker finds no conflicts, safe to remove.

### Three different packages: know which is which

| Package | What it does | When to use |
| --- | --- | --- |
| `eslint-config-prettier` | Turns OFF ESLint formatting rules that clash with Prettier | When ESLint config has formatting rules active |
| `eslint-plugin-prettier` | Runs Prettier inside ESLint as a linting rule | Rarely, slower, worse editor DX. Prefer running Prettier separately. |
| `svelte.configs.prettier` | Built into `eslint-plugin-svelte`, turns off Svelte-specific formatting rules | When using eslint-plugin-svelte with Prettier |

Full research, flat config code examples, and sources: [eslint-prettier.md](eslint-prettier.md)

## Svelte Config vs Vite Config vs Astro Config

Three config files touch Svelte/Vite behavior. Know which one owns what.

| File | What goes here | NOT here |
| --- | --- | --- |
| `svelte.config.js` | Svelte compiler options, preprocessors (`vitePreprocess`), inspector toggle | Vite plugins |
| `astro.config.mjs` under `vite.plugins` | Vite plugins that transform imports (SVG-as-component, YAML, devtools) | Svelte compiler options |
| `vite.config.js` | Only in pure Vite/SvelteKit projects. Astro owns Vite config via `astro.config.mjs` | |

### Scenario: Adding a Vite plugin (e.g. `@poppanator/sveltekit-svg`) to an Astro project

Goes in `astro.config.mjs` under `vite.plugins`, NOT in `svelte.config.js`:

```js
// astro.config.mjs
import svg from '@poppanator/sveltekit-svg'

export default defineConfig({
  vite: {
    plugins: [svg()]
  }
})
```

`@poppanator/sveltekit-svg` works with any Vite+Svelte project despite the name. It transforms `import Icon from './icon.svg'` into Svelte components.

### Scenario: Enabling Svelte inspector

Goes in `svelte.config.js` under `vitePlugin`, NOT in astro/vite config:

```js
// svelte.config.js
export default {
  vitePlugin: { inspector: true }
}
```

### Scenario: Adding preprocessors (SCSS in Svelte, etc.)

Goes in `svelte.config.js` via `vitePreprocess`:

```js
import { vitePreprocess } from '@astrojs/svelte'
export default { preprocess: vitePreprocess() }
```
