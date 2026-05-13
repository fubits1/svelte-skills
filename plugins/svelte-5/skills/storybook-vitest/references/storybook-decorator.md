# Storybook decorator behavior in Svelte 5

Reference for `svelte-5:storybook-vitest`. Covers decorator rendering, common Svelte 5 traps,
and the `asChild` pattern.

## How decorators render

`@storybook/svelte` uses `DecoratorHandler.svelte`:

```svelte
{#if decorator}
 <decorator.Component {...decorator.props}>
  <Component {...propsWithoutDocgenEvents} />
 </decorator.Component>
{:else}
 <Component {...propsWithoutDocgenEvents} />
{/if}
```

The story component receives args via spread. The decorator wraps it as children. Args
DO reach the component.

## Wrapper components are NOT the problem

When a context-providing wrapper (e.g. `CardWrapper`) sits between the decorator and the
story, it's tempting to blame the wrapper for blocking args. This is usually wrong. The
wrapper **swallows Svelte 5 errors** — the real errors are only visible in the Storybook
browser console, not in vitest output.

## Real root cause: `props_invalid_value`

When a component uses `bind:prop={value}` and:

- `prop` has a `$bindable(fallback)` with a default value
- `value` is `undefined` (no default assigned)

Svelte 5 throws `props_invalid_value`:
`Cannot do bind:selection={undefined} when selection has a fallback value`

**Fix:** add explicit defaults to `$bindable()` declarations:

```diff
- search = $bindable(),
+ search = $bindable(null),
```

## Debugging Storybook failures

**ALWAYS debug in the browser FIRST:**

1. Open the story at your Storybook URL (default `localhost:6006`) via Playwright
2. Check console errors — the browser shows the full Svelte error with component stack trace
3. vitest only shows "test failed" without component details
4. The browser error points to the exact file and line

**NEVER blame decorators without seeing the browser error.**

## Context propagation

Storybook decorators that use `setContext` do NOT propagate context to the story component
in vitest headless mode.

In the Storybook browser UI, decorators DO propagate context.

Fix: use `hasContext` + a writable-store fallback in components that read context.

## `asChild` pattern

For stories that need specific context or prop control, use `<Story asChild>` with direct
component rendering:

```svelte
<Story name="Default" asChild>
 <WrapperComponent>
  <StoryComponent prop1={value1} prop2={value2} />
 </WrapperComponent>
</Story>
```

**Do not combine `asChild` with a decorator on the same story.** DecoratorHandler renders
`<Component {...args} />` inside the decorator — this instantiates the component WITHOUT
the props you pass manually in the `asChild` content. Result: the component renders twice
(once broken via decorator, once correct via `asChild`), and the broken render crashes
with e.g. `Cannot read properties of undefined`.

If you need both context and visual wrapping, put the visual wrapper inside the `asChild`
wrapper component:

```svelte
<!-- MyWrapper.svelte -->
<script>
 import { setContext } from 'svelte'
 import { writable } from 'svelte/store'
 import CardWrapper from '$lib/storybook-util/CardWrapper.svelte'
 setContext('myContext', writable(null))
</script>

<CardWrapper>
 <slot />
</CardWrapper>
```
