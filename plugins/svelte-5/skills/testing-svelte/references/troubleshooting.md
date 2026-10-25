# Test Troubleshooting

## Contents

- Common Errors & Solutions: 1 strict mode violation, 2 async assertion failures, 3 reading `$derived` in a test, 4 form submit kills the test file, 5 wrong ARIA role, 6 Astro `PropsWithClientDirectives`, 7 link click navigates the iframe away, 8 rune outside Svelte, 9 locator `.focus()`, 10 locator or text assertion stopped matching after the Vitest 5 upgrade
- Quick Reference: do, don't, common locator methods, test file patterns

## Common Errors & Solutions

### Error 1: Strict Mode Violation

**Error:** `strict mode violation: getByRole() resolved to X elements`

**Cause:** Multiple elements match (common with responsive design:
desktop and mobile nav)

**Solution:**

```typescript
// before
page.getByRole('link', { name: 'Home' });

// after
page.getByRole('link', { name: 'Home' }).first();
```

### Error 2: Async Assertion Failures

**Error:** Element assertions fail intermittently

**Cause:** Not using `await expect.element()`

**Solution:**

```typescript
// ❌ WRONG - No auto-retry
expect(element).toHaveTextContent('text');

// ✅ CORRECT - Waits for element
await expect.element(element).toHaveTextContent('text');
```

### Error 3: Reading `$derived` in a Test

**Question:** Unsure whether reading a `$derived`/`$state` value in a test needs `untrack()`

**Cause:** Normally it does not: read it directly (the Svelte testing docs do). `untrack()` only exempts a read from dependency tracking *inside* a `$derived`/`$effect`; you might want it when reading state inside an `$effect.root`-wrapped effect test, and [sveltest](https://sveltest.dev/docs/runes-testing) wraps reads in it defensively.

**Solution:**

```typescript
import { untrack } from 'svelte';

// ✅ read directly: works
const value = component.derivedValue;

// ✅ defensive (sveltest): untrack() prevents the read leaking as a dependency
const untrackedValue = untrack(() => component.derivedValue);
```

### Error 4: Form Submit Kills the Test File

**Error:** ``Cannot connect to the iframe. Did you change the location or submitted a form? If so, don't forget to call `event.preventDefault()` to avoid reloading the page.`` (the whole file fails, not one test)

**Cause:** the form posts natively: the browser navigates the test iframe to the form's `action`.

**Solution:** click submit only when the form's submit handler calls `event.preventDefault()`. That works and lets you assert the outcome. For a plain native form, test the form's states through props instead of submitting:

```typescript
// ✅ form with onsubmit={(e) => { e.preventDefault(); save(data) }}
await page.getByRole('button', { name: 'Send' }).click();
await expect.element(page.getByText('Saved: alice@example.com')).toBeInTheDocument();

// ✅ native post (no preventDefault): render the state instead of submitting
await render(MyForm, { props: { errors: { email: 'Required' } } });
await expect.element(page.getByText('Required')).toBeInTheDocument();
```

A form with SvelteKit's `use:enhance` is not covered here.

### Error 5: Wrong ARIA Role

**Error:** Locator doesn't find element

**Cause:** Using wrong role name

**Solution:**

```typescript
// ❌ Wrong roles
page.getByRole('input', { name: 'Email' }); // no "input" role
page.getByRole('div', { name: 'Container' }); // no "div" role

// ✅ Correct roles
page.getByRole('textbox', { name: 'Email' }); // for <input>
page.getByRole('button', { name: 'Submit' }); // for <button>
page.getByRole('link', { name: 'Home' }); // for <a>

// check the DevTools Accessibility tab for actual roles
```

### Error 6: Astro `PropsWithClientDirectives` Type Mismatch

**Error:** `Argument of type '(_props: PropsWithClientDirectives<$$ComponentProps>) => any' is not assignable to parameter of type 'ComponentImport<Component>'`

**Cause:** `@astrojs/svelte`'s `svelte-shims.d.ts` wraps all `.svelte` imports with `PropsWithClientDirectives` when `astro/client` is in `tsconfig.json` types. This breaks `vitest-browser-svelte`'s `render()`.

**Solution:** Separate tsconfigs for app and tests:

```jsonc
// tsconfig.json: exclude test files
{ "exclude": ["dist", "src/**/*.svelte.test.ts"] }
```

```jsonc
// tsconfig.tests.json: no astro/client types
{
  "extends": "./tsconfig.json",
  // add your other TEST_GLOBS patterns
  "include": ["src/**/*.svelte.test.ts"],
  // an inherited exclude would drop the test files again
  "exclude": ["dist"],
  "compilerOptions": { "types": ["node", "svelte"] }
}
```

Without the `exclude` override, the test config inherits the base `exclude` and `tsc -p tsconfig.tests.json` stops with `TS18003: No inputs were found in config file`. In `vitest.config.ts`, point to the test tsconfig with `test.typecheck.tsconfig: './tsconfig.tests.json'`. `lint:tests` reads the same file, so its `include` must also cover your `TEST_GLOBS` ([`SETUP.md`](https://github.com/fubits1/svelte-skills/blob/main/SETUP.md), §2, step 2). Which declaration files an Astro project should add to that `include` is not covered here.

### Error 7: Link Click Navigates Iframe Away

**Error:** `Cannot connect to the iframe. Did you change the location or submitted a form?`

**Cause:** Clicking an `<a href="/other-page">` navigates the test iframe to that URL.

**Solution:** Hash links (`href="#section"`) and links whose click handler calls `event.preventDefault()` are safe to click. For a real navigation link, assert its `href` (`await expect.element(link).toHaveAttribute('href', '/other-page')`) or the state around it instead of clicking.

### Error 8: Rune Outside Svelte

**Error:** `Svelte error: rune_outside_svelte` ("The `$derived` rune is only available inside `.svelte` and `.svelte.js/ts` files"), or `ReferenceError: $state is not defined`

**Cause:** a rune sits in a `.js`/`.ts` file without the `.svelte.` infix (`foo.svelte.ts` and `foo.svelte.test.ts` have it), so Svelte never compiles it.

- Which message: in dev builds, Svelte's client entry defines the rune globals that throw `rune_outside_svelte`. In browser mode, until a component, `vitest-browser-svelte` or any import from `svelte` itself (e.g. `tick`) has loaded Svelte's client runtime, `$state` is not defined and the call throws the `ReferenceError`. The form in a node project is not covered here
- Dependencies, on Vite 8: vite-plugin-svelte also compiles the `.svelte.js` and `.svelte.ts` files of dependencies during pre-bundling, so a library that ships its runes in such files needs no config: Melt UI works as is, and excluding it from `optimizeDeps` changes nothing. A dependency's plain `.js` file with runes fails pre-bundled and excluded alike. Dependencies on Vite 6.4 and 7 are not covered here

**Solution:** when the stack trace names a file in your project, add `.svelte` to its name:

- A module: `foo.ts` to `foo.svelte.ts`, then update every import of it
- A test file: `foo.test.ts` to `foo.svelte.test.ts`, or `foo.spec.ts` to `foo.svelte.spec.ts` (both still match their `*.test.ts` / `*.spec.ts` patterns), then check which Vitest project's `include` and `exclude` the new name matches. The `sv add vitest` config, with both its unit and component usages, sends `*.svelte.test.ts` and `*.svelte.spec.ts` files under `src/` (except `src/lib/server/`) to its browser (`client`) project, and its node (`server`) project's `exclude` removes them there. A renamed file under `src/lib/server/` matches neither project and no longer runs. Keeping a renamed test in the node (`server`) project, under `src/lib/server/` or elsewhere, is not covered here

When the stack trace names a file in a dependency (under `node_modules`, including the pre-bundled copy under `node_modules/.vite/`), report it to the library instead.

### Error 9: Locator `.focus()` Not a Function

**Error:** `input.focus is not a function`

**Cause:** Vitest browser locators don't have `.focus()`, unlike Playwright's own locators; call it on the DOM element.

**Solution:** Use `.click()` to focus, or use `page.getByRole('textbox').element().focus()` for direct DOM access.

### Error 10: Locator or Text Assertion Stopped Matching After the Vitest 5 Upgrade

**Error:** `expect.element()` times out on an element that is visibly there, or `toHaveTextContent('Error')` fails with received `Error: email required`

**Cause:** Vitest 5 made locators exact by default (full, case-sensitive text for `getByText`, `getByLabelText`, and the `name` of `getByRole`) and made `toHaveTextContent` a strict full-string comparison without `RegExp`.

**Solution:**

```typescript
// ❌ Vitest 5: misses <button>Submit form</button>
page.getByRole('button', { name: 'Submit' });

// ✅ full name, RegExp, or opt out per call
page.getByRole('button', { name: 'Submit form' });
page.getByRole('button', { name: /submit/i });
page.getByText('Submit', { exact: false });

// ❌ Vitest 5: fails on "Error: email required"
await expect.element(banner).toHaveTextContent('Error');

// ✅ exact full text (preferred: a value assertion)
await expect.element(banner).toHaveTextContent('Error: email required');
// ⚠️ partial/regex matcher only for text you cannot compute
await expect.element(banner).toMatchTextContent(/error/i);
```

`browser.locators.exact: false` in the config restores substring matching for every locator; prefer fixing the tests.

---

## Quick Reference

### Do

- Use locators (`page.getBy*()`) first; raw `querySelector` / `data-testid` only with a one-line why-comment
- Always `await expect.element()` for locator assertions
- Use `.first()`, `.nth()`, `.last()` for multiple elements
- Read `$derived` values directly
- Click animated elements with a plain `click()`, which waits until they are actionable; never `force: true` (see critical-patterns)
- Test the form validation lifecycle: valid at first, invalid after
  validating empty fields, valid again once fixed
- Use real `FormData`/`Request` objects in server tests
- Test semantic structure: roles, exact accessible names, visible text (not CSS classes)
- Focus on user-visible behavior
- Plan with `.skip` blocks before implementing

### Don't

- Don't click submit on a natively posting form or a navigation link: the iframe navigates and the whole file fails (Errors 4 and 7); `preventDefault` forms/links and hash links are fine
- Don't ignore strict mode violations
- Don't assume element roles: verify them in DevTools
- Don't test implementation details (SVG paths, wrapper divs, class lists). In SSR tests the HTML string is the output: asserting semantic elements with their text (`<h1>Welcome</h1>`, `<li>Alpha</li>`) or an accessible name is fine
- Don't write brittle tests that break on library updates
- Don't replace `FormData` / `Request` with hand-rolled fakes in server tests; use the real objects. Spy only on browser APIs a headless test cannot use for real (e.g. `navigator.clipboard.writeText` rejects with `NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.`, or with the same prefix ending in `Write permission denied.` once a click has focused the page)
- Don't expect forms to be invalid initially
- Don't build a test wrapper for static `children`: pass a snippet from `createRawSnippet`. Use a wrapper component only for two-way bindings, context, or interactive snippets ([Svelte testing docs](https://svelte.dev/docs/svelte/testing))

### Common Locator Methods

```typescript
// semantic queries (preferred)
page.getByRole('button', { name: 'Submit' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('heading', { name: 'Title', level: 1 });
page.getByLabelText('Email address');
page.getByText('Welcome'); // exact full text; /welcome/i or { exact: false } for partial
page.getByPlaceholder('Enter email');

// fallback, with its reason: the third-party chart canvas exposes no role or accessible name
page.getByTestId('custom-widget');

// multiple element handling
page.getByRole('link').first();
page.getByRole('link').nth(1); // second match (0-indexed)
page.getByRole('link').last();
```

### Test File Patterns

```typescript
// button.svelte.test.ts: browser component test
import { render } from 'vitest-browser-svelte';
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import Component from './button.svelte'; // <button onclick={() => count++}>Clicked: {count}</button>

test('component behavior', async () => {
 await render(Component);
 await page.getByRole('button').click();
 await expect.element(page.getByRole('button')).toHaveTextContent('Clicked: 1');
});
```

```typescript
// card.svelte.test.ts: passing static children
import { render } from 'vitest-browser-svelte';
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { createRawSnippet } from 'svelte';
import Card from './card.svelte'; // renders {@render children?.()}

test('card renders its children', async () => {
 const children = createRawSnippet(() => ({ render: () => '<span>child content</span>' }));
 await render(Card, { children });
 await expect.element(page.getByText('child content')).toBeInTheDocument();
});
```

```typescript
// src/routes/api/users/server.test.ts: server-side API test
import { expect, test, vi } from 'vitest';
import * as database from '#lib/server/database.js';
import { POST } from './+server';

// mock the external service only: the request stays a real Request with real FormData
vi.mock('#lib/server/database.js');

test('API endpoint creates a user', async () => {
 vi.mocked(database.createUser).mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
 const formData = new FormData();
 formData.append('email', 'user@example.com');
 formData.append('password', 'securepass123');
 const request = new Request('http://localhost/api/users', {
  method: 'POST',
  body: formData,
 });
 // the handler reads only `request`; the cast stands in for the rest of the RequestEvent
 const response = await POST({ request } as Parameters<typeof POST>[0]);
 expect(response.status).toBe(201);
 expect((await response.json()).email).toBe('user@example.com');
});
```

```typescript
// page.ssr.test.ts: SSR test
import { expect, test } from 'vitest';
import { render } from 'svelte/server';
import PageComponent from './+page.svelte';

test('SSR rendering', () => {
 const { body } = render(PageComponent, { props: { data: {} } });
 expect(body).toContain('expected content');
});
```

---
