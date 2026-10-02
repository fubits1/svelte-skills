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
story, it's tempting to blame the wrapper for blocking args. This is usually wrong. A Svelte 5
error thrown inside the story does not fail the story: the story stays green, and the error
appears in Vitest's "Unhandled Errors" block (with the component stack through the
decorator) and in the Storybook browser console (measured).

## Real root cause: `props_invalid_value`

When a component uses `bind:prop={value}` and:

- `prop` has a `$bindable(fallback)` with a default value
- `value` is `undefined` (no default assigned)

Svelte 5 throws `props_invalid_value`:
`Cannot do bind:selection={undefined} when selection has a fallback value`

`null` counts as a fallback: `$bindable(null)` throws the same error as `$bindable('x')`
when the parent binds `undefined` (measured).

**Fix:** remove the mismatch on one side:

```diff
<!-- parent: give the bound variable a defined initial value -->
- let selection = $state()
+ let selection = $state(null)
```

```diff
<!-- child: or drop the fallback when undefined is a valid value (measured to render) -->
- search = $bindable(null),
+ search = $bindable(),
```

## Debugging Storybook failures

**ALWAYS read the actual error before changing anything:**

1. Read Vitest's "Unhandled Errors" block: render-time errors land there with the Svelte
   component stack, even when every story is reported green (measured)
2. Open the story at your Storybook URL (default `localhost:6006`) via Playwright
3. Check console errors: the browser shows the full Svelte error with component stack trace
4. The error points to the exact file and line

**NEVER blame decorators without seeing the error.**

## Context propagation

Storybook decorators that use `setContext` do NOT propagate context to the story component
in vitest headless mode.

In the Storybook browser UI, decorators DO propagate context.

Fix: provide the context from an `asChild` wrapper component (see `asChild` pattern below), as
the main skill says. Only if the component must also work without any provider, give it a
`hasContext` check with a writable-store fallback; that changes production code for a test
problem, so prefer the wrapper.

## `asChild` pattern

For stories that need specific context or prop control, use `<Story asChild>` with direct
component rendering:

```svelte
<script module>
 import { defineMeta } from '@storybook/addon-svelte-csf'
 import { expect, within } from 'storybook/test'
 import MyComponent from './MyComponent.svelte' // renders <p>{prop} / {$ctx}</p>
 import MyWrapper from './MyWrapper.svelte' // see below

 const { Story } = defineMeta({ title: 'MyComponent', component: MyComponent })
</script>

<Story
 name="Default"
 asChild
 play={async ({ canvasElement }) => {
  // assert what the props and the wrapper's context produce, not just that it rendered
  await expect(within(canvasElement).getByText('value / from wrapper')).toBeVisible()
 }}
>
 <MyWrapper>
  <MyComponent prop="value" />
 </MyWrapper>
</Story>
```

**Do not combine `asChild` with a decorator on the same story.** DecoratorHandler renders
`<Component {...args} />` inside the decorator, this instantiates the component WITHOUT
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
 let { children } = $props()
 setContext('myContext', writable('from wrapper'))
</script>

<CardWrapper>
 {@render children()}
</CardWrapper>
```
