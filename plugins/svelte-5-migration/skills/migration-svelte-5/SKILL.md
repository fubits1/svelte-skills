---
name: migration-svelte-5
description: "Use when migrating .svelte files from Svelte 3/4 to Svelte 5 runes. Auto-invoke when converting $: reactive blocks, export let props, createEventDispatcher, or slot patterns. Covers interop with unmigrated Svelte 4 children/parents."
user-invocable: true
---

# Svelte 3/4 → 5 Migration

## Required companion skills

Invoke these at the indicated points. This skill says WHEN —
they say HOW.

| Skill | When | Source |
| --- | --- | --- |
| `svelte:svelte-code-writer` | Before writing/editing ANY `.svelte` or `.svelte.ts` | plugin: `svelte/svelte` |
| `svelte:svelte-core-bestpractices` | Before writing ANY Svelte 5 component logic | plugin: `svelte/svelte` |
| `svelte-5:code-style-svelte` | After every `.svelte` file edit | this marketplace |
| `frontend:code-style` | After every file edit | this marketplace |
| `frontend:editing` | During every code edit | this marketplace |
| `svelte-5:doc-component` | After creating or migrating a `.svelte` component | this marketplace |
| `svelte-5:storybook` | When creating/updating stories | this marketplace |
| `svelte-5:storybook-vitest` | When writing play functions | this marketplace |
| `svelte-5:testing-svelte` | When writing vitest browser tests | this marketplace |
| `frontend:playwright` | Before AND after migration (baselines + verification) | this marketplace |
| `frontend:pixel-perfect` | For any CSS/layout changes during migration | this marketplace |
| `frontend:validate-file` | After EVERY file edit | this marketplace |
| `frontend:migration` | Framework-agnostic phases this skill builds on | this marketplace |

## Phase 1: Capture baselines BEFORE any code changes

Nothing gets edited until baselines are recorded.

1. **Lint baseline**: run the project's lint/typecheck on all
   files in scope. Record exact error counts per tool. This is
   the number to beat, not increase.
2. **Playwright visual baseline**: navigate to every affected
   route, take BEFORE screenshots. Use `browser_evaluate` to
   measure key element positions/sizes per `frontend:pixel-perfect`.
3. **Console error baseline**: check browser console after
   navigation AND after key interactions (clicks, selects,
   submits). Record every error.
4. **Test baseline**: run related story tests and browser tests.
   Record pass/fail counts.

## Phase 2: Pre-migration audit

1. Draw the component tree for the route or dependency graph
   for the feature. Use mermaid if more than 5 elements.
2. Mark each component: Svelte 4 or 5.
3. If any component uses a third-party Svelte wrapper (e.g.
   autocomplete, datepicker), check whether its callback and
   binding APIs return different data shapes — this is a
   common source of silent regressions during migration.
4. If Svelte 3/4 `writable()` stores (from `svelte/store`) are
   used, check how many components consume them. If all
   consumers are in scope, consider migrating the store to a
   `.svelte.ts` runes-based state module.
5. Document the audit in a migration tracking file.

### `npx sv migrate svelte-5` (use with caution)

Svelte provides an auto-migration script. It converts `let` →
`$state`, `on:click` → `onclick`, slots → render tags. But:

- It does NOT convert `createEventDispatcher` (too risky)
- It converts `slot="name"` → `{#snippet}` which fails
  svelte-check when the child is still Svelte 4
- It may convert `$:` to `run()` from `svelte/legacy` instead
  of `$derived`/`$effect`

Run per-file via VS Code command "Migrate Component to Svelte 5
Syntax", review every change, fix interop issues manually. Do
NOT run on the entire codebase at once.

## Phase 3: Migration order

- Leaf components first (children before parents)
- Extract large `{#each}` bodies into child components
- FLAG each `createEventDispatcher` with a FIXME comment when
  Svelte 5 parents consume the component; keep unchanged when
  Svelte 4 parents still depend on it
- Switch to callback props when the parent is also Svelte 5
- Validate after EVERY file edit: lint, autofixer, story tests

## Phase 4: Pattern conversion reference

### `$:` → `$derived` or `$effect`

| Svelte 4                 | Svelte 5                                | Notes                                               |
| ------------------------ | --------------------------------------- | --------------------------------------------------- |
| `$: foo = expr`          | `let foo = $derived(expr)`              | Pure derivation, no side effects                    |
| `$: { sideEffect() }`    | `$effect(() => { sideEffect() })`       | Only for true side effects (DOM, fetch, logging)    |
| `$: if (cond) { ... }`   | `$effect(() => { if (cond) { ... } })`  | Review carefully — race conditions, execution order |
| `$: (dep, action())`     | `$effect(() => { void dep; action() })` | Explicit dependency tracking                        |
| `$: ({ a, b } = $store)` | `let a = $derived($store.a)` per field  | Don't destructure Svelte 3/4 stores in effects      |

**NEVER use `$effect` to set `$state`.** Use `$derived` instead.
Test the runtime behavior — `$:` ran synchronously before
render, `$effect` runs asynchronously after DOM updates.

### `export let` → `$props()`

```svelte
// Before
export let editable = true
export let title: string

// After
let { editable = true, title }: {
  editable?: boolean
  title: string
} = $props()
```

**`$bindable()` for bound props:** In Svelte 4, every `export let`
prop is bindable. In runes mode, props need explicit `$bindable()`:

```svelte
// without default
let { value = $bindable() }: { value?: string } = $props()

// with default
let { count = $bindable(0) }: { count?: number } = $props()
```

Check ALL parents for `bind:` usage before removing `export let`.

### `$$props` / `$$restProps` → destructured rest

```svelte
// Before
<button {...$$restProps}>click</button>

// After
let { class: className, ...rest } = $props()
<button class={className} {...rest}>click</button>
```

### `createEventDispatcher` → callback props

```svelte
// Before
const dispatch = createEventDispatcher()
dispatch('valuesChanged')

// After — ONLY when parent is also Svelte 5
let { onValuesChanged }: { onValuesChanged?: () => void } = $props()
onValuesChanged?.()
```

**Keep `createEventDispatcher` when the parent is still Svelte 4.**
Svelte 4 parents use `on:valuesChanged={handler}` which does NOT
map to callback props on a runes-mode child. Use the legacy
import as a stopgap until the parent is migrated.

### `on:click` → `onclick`

```svelte
// Before
<button on:click={handler}>click</button>
<button on:click|preventDefault={handler}>click</button>

// After
<button onclick={handler}>click</button>
<button onclick={(event) => { event.preventDefault(); handler(event) }}>click</button>
```

Event modifiers (`|once`, `|preventDefault`) become wrapper
functions or inline logic. `on:` syntax still works but is
deprecated.

### Slots → snippets (direction matters)

**Svelte 5 parent → Svelte 4 child** (child uses `<slot>`):

- Use `slot="header"` attribute — passes svelte-check
- Do NOT use `{#snippet header()}` — fails svelte-check
  ([sveltejs/language-tools#2716](https://github.com/sveltejs/language-tools/issues/2716))
- Use `on:click` / `on:event` for Svelte 4 child events

**Svelte 5 parent → Svelte 5 child** (child uses `{@render}`):

```svelte
// Child
let { header, children } = $props()
{@render header?.()}
{@render children?.()}

// Parent
<Child>
  {#snippet header()}Header{/snippet}
  Body content
</Child>
```

### `<svelte:component>` → direct rendering

```svelte
// Before — required for dynamic components
<svelte:component this={DynamicComp} {prop} />

// After — Svelte 5 re-renders when the variable changes
<DynamicComp {prop} />
```

### `onMount` / `onDestroy` → `$effect` (context-dependent)

**Reactive subscription** — replace with `$effect`:

```svelte
// Before
let unsubscribe
onMount(() => { unsubscribe = store.subscribe(handler) })
onDestroy(() => unsubscribe())

// After — $store auto-subscribes in runes mode
$effect(() => { handler($store) })
```

Note: `store.subscribe(handler)` passes the store value to
`handler`. The `$effect` replacement must do the same —
`handler($store)`, not `handler()`.

If the handler needs cleanup, return a teardown function:

```svelte
$effect(() => {
  const connection = createConnection($config)
  return () => { connection.close() }
})
```

**One-time init** — keep `onMount`:

```svelte
onMount(() => { fetchInitialData() })
```

`onMount` works in Svelte 5. Use for one-time initialization.
`$effect` for reactive re-runs. `$effect.pre` for code that
must run before DOM updates (replaces `beforeUpdate`).

## Phase 5: Interop rules

| Parent   | Child    | Slots                      | Events                                       | Props           |
| -------- | -------- | -------------------------- | -------------------------------------------- | --------------- |
| Svelte 5 | Svelte 4 | `slot="name"`              | `on:event`                                   | `bind:` works   |
| Svelte 4 | Svelte 5 | Keep `<slot>` in child     | Keep `createEventDispatcher` (legacy import) | `$props()` safe |
| Svelte 5 | Svelte 5 | `{#snippet}` + `{@render}` | callback props                               | `$props()`      |

## Phase 6: Storybook stories (BEFORE running tests)

Stories must exist and render correctly before any test can
verify behavior:

1. Use `asChild` pattern — NOT decorators for components that
   depend on Svelte 3/4 `writable()` stores (from `svelte/store`)
2. Create a wrapper component that calls `store.set()` with
   mock data + `setContext()` for required Svelte contexts
3. Use `fn()` from `storybook/test` as callback spy for critical
   callbacks — NOT `noop`. Pass the spy in the `asChild` markup
   AND assert it in the play function.
4. Play functions MUST interact (click, type, select) AND assert
   specific values — not just "something rendered"
5. Lint the story, run story tests, verify in Storybook browser
   UI via Playwright — check console for errors

## Phase 7: Per-file checklist (after each migration)

Each step gates the next:

1. Project lint/typecheck — all checks must pass
2. Svelte autofixer — zero issues
3. Story exists and passes (Phase 6 done first)
4. Tests pass. Three testing layers, pick per component:
   - **Storybook + MSW**: data flow (callbacks, API calls, store
     mutations). Use `fn()` spy play functions.
   - **Vitest browser**: pure component behavior (rendering,
     props, DOM state). No MSW duplication.
   - **Vitest browser + live API**: if a running backend and
     auth flow exist, test against the real API.
5. **Playwright AFTER screenshots**: navigate to affected routes,
   measure with `browser_evaluate`, compare against BEFORE
   baselines from Phase 1. Use `frontend:pixel-perfect` diff tables.
6. **Console error check**: after navigation AND after key
   interactions. Compare against baseline. New errors = regression.
7. No `eslint-disable` or `@ts-ignore`/`@ts-expect-error`
   without FIXME

## Known traps

1. **Third-party wrapper callback vs binding data shapes** —
   callbacks and bound values may return different types (e.g.
   full objects vs extracted IDs). When dropping `bind:value`
   for callback-only, extract the value in the parent.
2. **`{#snippet}` on Svelte 4 children** — fails svelte-check.
   Use `slot="name"` instead.
   ([sveltejs/language-tools#2716](https://github.com/sveltejs/language-tools/issues/2716))
3. **Nested `Writable<Record<string, Writable<...>>>`** —
   conflicts with `svelte/require-store-reactive-access`. Use
   `in` operator for existence checks.
4. **Storybook decorators lose complex args** — Svelte 3/4
   `writable()` stores, objects with methods get serialized
   away. Use `asChild` with wrapper components instead.
5. **`noop` callbacks hide bugs** — `() => {}` silently swallows
   wrong data types. Use `fn()` spy and assert in play functions.
