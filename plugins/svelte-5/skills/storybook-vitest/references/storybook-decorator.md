# Storybook decorator behavior in Svelte 5

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

The story component receives args via spread, and the decorator wraps it as children, so
args reach the component.

## A render error leaves the story green

When a context-providing wrapper (e.g. a `StoryFrame` component) sits between the decorator and the
story and the story renders empty, look for a render error before blaming the wrapper for
blocking args. A Svelte 5 error thrown while the story renders does not fail the story: the story stays green, and the
error appears in Vitest's "Unhandled Errors" block (with the component stack through the
decorator) and in the Storybook browser console (measured). A failing assertion in `play`
does fail the story (measured).

## A common render error: `props_invalid_value`

When a component uses `bind:prop={value}` and:

- `prop` has a `$bindable(fallback)` with a default value
- `value` is `undefined` (no default assigned)

Svelte 5 throws `props_invalid_value`:
`Cannot do bind:selection={undefined} when selection has a fallback value`
([Svelte runtime errors](https://svelte.dev/docs/svelte/runtime-errors#Client-errors-props_invalid_value))

`null` counts as a fallback: `$bindable(null)` throws the same error as `$bindable('x')`
when the parent binds `undefined` (measured).

**Fix:** remove the mismatch on one side (both measured to render). In the parent, give the bound variable a defined initial value:

```diff
- let selection = $state()
+ let selection = $state(null)
```

Or, in the child, drop the fallback when `undefined` is a valid value:

```diff
- let { selection = $bindable(null) } = $props()
+ let { selection = $bindable() } = $props()
```

## Debugging Storybook failures

Read the error before changing anything, decorators included:

1. Read Vitest's "Unhandled Errors" block: render-time errors land there with the Svelte
   component stack (e.g. `in Frame.svelte`, `in DecoratorHandler.svelte`)
2. Open the story at your Storybook URL (default `localhost:6006`) via Playwright
3. Check console errors: the browser shows the full Svelte error with the component stack
   trace, down to the file and line

## Context propagation

Storybook decorators that use `setContext` do not propagate context to the story component
in Vitest headless mode, while they do in the Storybook browser UI (observed in a real
project, not measured).

Fix: provide the context from an `asChild` wrapper component (see `asChild` pattern below).
Only if the component must also work without any provider, give it a
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
 import MyWrapper from './MyWrapper.svelte'

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

Do not combine `asChild` with a decorator on the same story. DecoratorHandler renders
`<Component {...args} />` inside the decorator, which instantiates the component without
the props you pass manually in the `asChild` content. The component then renders twice
(once broken via decorator, once correct via `asChild`), and the broken render crashes
with e.g. `Cannot read properties of undefined` (observed in a real project, not measured).

If you need both context and visual wrapping, put the visual wrapper inside the `asChild`
wrapper component:

```svelte
<!-- MyWrapper.svelte -->
<script>
 import { setContext } from 'svelte'
 import { writable } from 'svelte/store'
 import StoryFrame from './StoryFrame.svelte'
 let { children } = $props()
 setContext('myContext', writable('from wrapper'))
</script>

<StoryFrame>
 {@render children()}
</StoryFrame>
```
