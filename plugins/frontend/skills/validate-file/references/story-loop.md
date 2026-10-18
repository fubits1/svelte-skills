# Per-file validation loop for component + story pairs

For component + story pairs, follow this exact sequence:

1. Reproduce first with `pnpm test:story <Pattern>`: see the failure before changing anything
2. Read the error: understand the root cause
3. Fix the component or story: context guards, prop guards and the like
4. Lint the fix before testing it: `pnpm lint:file <component> <story>`
   must exit 0 before you run the tests again. Lint catches type errors
   that would crash at runtime, so testing unlinted code wastes time.
   Fix ALL errors, not just yours
5. Run the Svelte autofixer (`mcp__svelte__svelte-autofixer`) on every
   edited `.svelte`, `.svelte.ts` and `.svelte.js` file (`frontend:validate`).
   It catches leftover Svelte 4 patterns, such as a slot where a snippet
   and `{@render children()}` belong, or a store where a rune belongs. In a file
   that stays on Svelte 4 (`export let`, `$:`), treat its migration
   suggestions as optional
6. Test the fix: `pnpm test:story <Pattern>`, once steps 4 and 5 are clean
7. Check it in the browser: open the story in Storybook through
   Playwright MCP (`svelte-5:storybook`, `frontend:validate` "Browser FIRST"):
   a story whose test passes can still render empty or broken
8. Review component props: check for svelecte, autocomplete,
   or Svelte 5 patterns. Also check CHILD components. Add story
   variants if needed
9. Lint the story again if variants were added
10. Test again if story changed, and repeat step 7

Do NOT move to the next file until all steps pass.

## Examples

```bash
# edited a component
pnpm lint:file src/lib/components/MyComponent.svelte

# edited a story + its wrapper
pnpm lint:file src/lib/components/stories/MyComponent.stories.svelte src/lib/components/stories/MyComponentWrapper.svelte
pnpm test:story MyComponent

# edited markdown docs
npx markdownlint-cli docs/STORYBOOK.md docs/STORYBOOK-DECORATOR.md
```
