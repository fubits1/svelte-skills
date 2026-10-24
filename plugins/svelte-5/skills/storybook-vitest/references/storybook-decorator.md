# Storybook decorator behavior in Svelte 5

## Contents

- How decorators render
- A render error leaves the story green
- A common render error: `props_invalid_value`
- Debugging Storybook failures
- Context propagation
- `asChild` pattern

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
args reach the component, `writable()` stores and objects with methods included. With
Svelte CSF, `Component` here is the CSF story renderer, which renders the story (or its
`asChild` content) inside the decorator.

## A render error leaves the story green

When a context-providing wrapper (a wrapper decorator, or an `asChild` wrapper such as
`MyWrapper` below) sits around the story and the story renders empty, look for a render
error before blaming the wrapper for blocking args. A Svelte 5 error thrown while the
story renders does not fail the story: the story stays green, and the error appears in
Vitest's "Unhandled Errors" block, with the component stack through the decorator. A
failing assertion in `play` does fail the story.

## A common render error: `props_invalid_value`

When a component uses `bind:prop={value}` and:

- `prop` has a `$bindable(fallback)` with a default value
- `value` is `undefined` (no default assigned)

Svelte 5 throws `props_invalid_value`:
``Cannot do `bind:selection={undefined}` when `selection` has a fallback value``
([Svelte runtime errors](https://svelte.dev/docs/svelte/runtime-errors#Client-errors-props_invalid_value))

`null` counts as a fallback: `$bindable(null)` throws the same error as `$bindable('x')`
when the parent binds `undefined`.

**Fix:** remove the mismatch on one side; either change makes the story render. In the parent, give the bound variable a defined initial value:

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

**ALWAYS read the actual error before changing anything. NEVER blame decorators without seeing the error:**

1. Read Vitest's "Unhandled Errors" block: render-time errors land there with the Svelte
   component stack (e.g. `in <YourDecorator>.svelte`, `in DecoratorHandler.svelte`)
2. Open the story via Playwright on the running Storybook (finding or starting it: `svelte-5:storybook`)
3. Check the browser console for the Svelte error and its component stack

## Context propagation

A decorator that calls `setContext` provides that context to the story component, at
story level and at meta level, in the Vitest run and in the Storybook UI. In the Vitest
run it also reaches `asChild` content under a story-level or meta-level decorator. An
`asChild` wrapper component (below) works too.

## `asChild` pattern

For a story that passes props to the component inline rather than through `args`, or renders a wrapper component around it, use
`<Story asChild>` with direct component rendering. Example with an `asChild` wrapper:

```svelte
<script module>
 import { defineMeta } from '@storybook/addon-svelte-csf'
 import { expect, within } from 'storybook/test'
 import MyComponent from './MyComponent.svelte' // renders <p>{prop} / {$ctx}</p>, $ctx from getContext('myContext')
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

A decorator on an `asChild` story wraps the `asChild` content: the component renders once,
with the props you pass. A story without `asChild` and without `args` renders the meta
component with no props, so a component that dereferences a missing required prop throws during render (e.g.
`Cannot read properties of undefined`, reported as an unhandled error); pass `args` or use
`asChild`.

To combine context and visual wrapping in one place, put the visual wrapper inside the
`asChild` wrapper component (`StoryFrame.svelte` stands for your own layout component that
renders `{@render children()}`):

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
