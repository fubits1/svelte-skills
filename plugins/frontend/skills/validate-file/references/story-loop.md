# Per-file validation loop for component + story pairs

For component + story pairs, follow this exact sequence:

1. **Test first:** `pnpm test:story <Pattern>` (`<Pattern>` is a Vitest file filter, e.g. part of the story file name): see the failure before changing anything
   - New story with a `play`: write it, temporarily change the expected value in its assertion, confirm the story fails, then restore it
   - New story without a `play`: its test passes even when a component inside the story throws while rendering (the error shows under "Unhandled Errors" and the run exits 1), and under a decorator that returns a bare component it can stay green with the wrapper missing (`svelte-5:storybook-vitest`, `references/storybook-decorator.md`, "Decorator return form"); add a `play` if the component is interactive (`svelte-5:storybook-vitest`); a failing first run for a non-interactive story without a `play` is not covered here
2. **Read the error:** understand the root cause. `pnpm test:story` passes `--silent`, which hides console output and msw warnings; `svelte-5:storybook-vitest` shows how to see them
3. **Fix the component or story:** context guards, prop guards and the like
4. **LINT BEFORE TESTING:** `pnpm lint:file <component> <story>` must exit 0
   before you run the tests again. Install every tool the scripts call
   ([`SETUP.md`](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md))
   and read the [type-check caveats](../SKILL.md#lint-single-files):
   a type check can report `✓` without checking a file. Lint catches type errors
   that would crash at runtime, so testing unlinted code wastes time. Fix ALL
   errors, not just yours
5. **Run the Svelte autofixer** (`mcp__plugin_svelte_svelte__svelte-autofixer`) on every
   edited `.svelte`, `.svelte.ts` and `.svelte.js` file. It catches leftover Svelte 4 patterns and other migration
   issues, such as a `<slot />` where a snippet and `{@render children()}`
   belong, or a store where a rune belongs. Skip it for a `.svelte` file not yet migrated (pure Svelte 4: `export let`, `$:`, `<slot />`, no runes)
6. **Test AFTER lint:** `pnpm test:story <Pattern>`, once steps 4 and 5 are clean
7. **Check it in the browser:** open the story in Storybook through
   Playwright MCP (`svelte-5:storybook`): navigate to the story (how to
   build a story's URL is not covered here),
   wait for the render, take a screenshot, check the console for 0 errors.
   A story whose test passes can still render empty or broken
8. **Review component props:** list the props a story must exercise
   (selection callbacks, bindable values, autocomplete or select
   inputs) in the component AND its CHILD components, and add a story
   variant for each one not covered yet
9. **Lint the story again** if variants were added
10. **Test again** if story changed, and repeat step 7

Do NOT move to the next file until all steps pass.

## Examples

```bash
# edited a component
pnpm lint:file src/lib/components/MyComponent.svelte

# edited a story + its wrapper
pnpm lint:file src/lib/components/stories/MyComponent.stories.svelte src/lib/components/stories/MyComponentWrapper.svelte
pnpm test:story MyComponent

# edited markdown docs
pnpm exec markdownlint docs/STORYBOOK.md docs/STORYBOOK-DECORATOR.md
```
