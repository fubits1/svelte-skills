# Storybook decorator behavior in Svelte 5

## Contents

- How decorators render
- A throw inside the story leaves it green
- A common render error: `props_invalid_value`
- Debugging Storybook failures
- Decorator return form
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

## A throw inside the story leaves it green

When a context-providing wrapper (a wrapper decorator, or an `asChild` wrapper such as
`MyWrapper` below) sits around the story and the story renders empty, look for a render
error before blaming the wrapper for blocking args; in the Vitest run, also check the
decorator's return form ("Decorator return form"). A Svelte 5 error thrown inside the
story (a component stack through `StoryRenderer.svelte`) does not fail the story: the
story stays green, the error appears in Vitest's "Unhandled Errors" block, with the
component stack through `DecoratorHandler.svelte` (and your wrapper, when there is one), and
the run exits 1. A failing assertion in `play`
does fail the story, and so does an error from the argless instance a bare decorator
leaves in the Vitest run ("Decorator return form").

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

**ALWAYS read the actual error, when there is one, before changing anything. NEVER blame a decorator for a render error without seeing the error:**

1. Read Vitest's "Unhandled Errors" block: a throw inside the story lands there with the
   Svelte component stack (e.g. `in <YourDecorator>.svelte`, `in DecoratorHandler.svelte`),
   even when the story also fails on a `play` assertion. The stack can show the throwing
   component as `in <unknown>`; the `❯` source frames below it name its file and line. A throw from a bare decorator's
   argless instance shows only in that story's failure output (step 4)
2. Open the story via Playwright on the running Storybook (finding or starting it: `svelte-5:storybook`)
3. Check the browser console for the Svelte error and its component stack
4. If the story renders correctly in the Storybook UI but in the Vitest run the decorator's
   markup or context is missing, or the `defineMeta` component throws as if it had no props
   (its component stack goes from that component straight to `DecoratorHandler.svelte`,
   without your wrapper and without `StoryRenderer.svelte`), check the decorator's return form
   ("Decorator return form"). Check the markup or context rather than store values: in the
   Vitest run, a `writable()` or runes module state value set by an earlier story in the same
   file is still present

## Decorator return form

Return a decorator component as `{ Component }`, with `props` when the wrapper takes any:

```ts
decorators: [() => ({ Component: MyWrapper })]
// or, for a wrapper that takes props
decorators: [() => ({ Component: MyWrapper, props: { value: 'mock' } })]
```

A decorator that returns the bare component (`() => MyWrapper`) works in the Storybook UI
(`storybook dev` and a built Storybook), but not in the Vitest run. `@storybook/svelte`
replaces a decorator result that has no own enumerable keys with the `defineMeta`
component, rendered without props (nothing, when `defineMeta` has no `component`). In
`storybook dev` a component carries a `__docgen` key; in the Vitest run it has none. In the
Vitest run:

- the wrapper's markup, `setContext` calls and `store.set` calls are missing, and
  `getContext` returns `undefined` (or the reader's own fallback)
- when the `defineMeta` component does not throw without props, there is no render error,
  and a story without a `play` stays green, even when the story's own content is gone
- when it throws without props (e.g. `Cannot read properties of undefined`), the story
  fails with that error, `asChild` stories included; the component stack shows that
  component directly in `DecoratorHandler.svelte`, with no wrapper in it
- when the `defineMeta` component renders its children, the story renders inside that
  argless instance; an args story then shows the component twice, the argless instance
  and the story's own, which gets the args
- when it renders no children, the story's content disappears: the args instance of an
  args story and the content of an `asChild` story

In the Vitest run the bare form loses the wrapper and the `{ Component }` form keeps it, for Svelte 4
(`export let`, `<slot />`) and runes decorators alike, at story level, at meta level and in
`.storybook/preview.ts` `decorators`.

To find such decorators, search the stories and `.storybook/preview.ts` for `decorators`
entries whose function returns a component (`() => MyWrapper`) instead of
`{ Component: MyWrapper }`, and convert each. Then add or keep a `play` that checks the
wrapper's markup or context, and run the story in Vitest 3 times (`pnpm test:story <Pattern>`;
`frontend:validate` flake rules).

## Context propagation

A decorator in the `{ Component }` form provides its `setContext` values to the story
component, at story level and at meta level, in the Vitest run and in the Storybook UI. A
`store.set` call in such a decorator runs before the story mounts: a component that reads
the store once at init sees the value. The context also reaches `asChild` content under a
story-level or meta-level decorator, in the Vitest run and in the Storybook UI. An `asChild` wrapper component (below)
works too.

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

A decorator in the `{ Component }` form on an `asChild` story wraps the `asChild` content: the component renders once,
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
