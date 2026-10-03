# Test Troubleshooting

## Common Errors & Solutions

### Error 1: Strict Mode Violation

**Error:** `strict mode violation: getByRole() resolved to X elements`

**Cause:** Multiple elements match (common with responsive design -
desktop + mobile nav)

**Solution:**

```typescript
// Before
page.getByRole('link', { name: 'Home' });

// After
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

### Error 3: Cannot Access $derived

**Error:** Unsure whether reading a `$derived`/`$state` value in a test needs `untrack()`

**Cause:** Normally it does not: read it directly (the Svelte testing docs do). `untrack()` only exempts a read from dependency tracking *inside* a `$derived`/`$effect`; you might want it when reading state inside an `$effect.root`-wrapped effect test, and [sveltest](https://sveltest.dev/docs/runes-testing) wraps reads in it defensively.

**Solution:**

```typescript
import { untrack } from 'svelte';

// ✅ read directly: works
const value = component.derivedValue;

// ✅ defensive (sveltest): untrack() prevents the read leaking as a dependency
const value = untrack(() => component.derivedValue);
```

### Error 4: Form Submit Kills the Test File

**Error:** `Cannot connect to the iframe. Did you change the location or submitted a form? If so, don't forget to call event.preventDefault() to avoid reloading the page.` (the whole file fails, not one test)

**Cause:** the form posts natively: the browser navigates the test iframe to the form's `action` (measured).

**Solution:** click submit only when the form's submit handler calls `event.preventDefault()`. That works and lets you assert the outcome (measured). SvelteKit's `use:enhance` (from `$app/forms`) emulates the native behaviour "just without the full-page reloads" ([form actions docs](https://svelte.dev/docs/kit/form-actions#Progressive-enhancement-use:enhance)); an enhanced form was not measured in a Vitest browser run here. For a plain native form, test the form's states through props instead of submitting:

```typescript
// ✅ form with onsubmit={(e) => { e.preventDefault(); save(data) }}
await page.getByRole('button', { name: 'Send' }).click();
await expect.element(page.getByText('Saved: alice@example.com')).toBeInTheDocument();

// ✅ native post (no preventDefault): render the state instead of submitting
await render(MyForm, { props: { errors: { email: 'Required' } } });
await expect.element(page.getByText('Required')).toBeInTheDocument();
```

### Error 5: Wrong ARIA Role

**Error:** Locator doesn't find element

**Cause:** Using wrong role name

**Solution:**

```typescript
// ❌ Wrong roles
page.getByRole('input', { name: 'Email' }); // No "input" role
page.getByRole('div', { name: 'Container' }); // No "div" role

// ✅ Correct roles
page.getByRole('textbox', { name: 'Email' }); // For <input>
page.getByRole('button', { name: 'Submit' }); // For <button>
page.getByRole('link', { name: 'Home' }); // For <a>

// 💡 Tip: Check DevTools → Accessibility tab for actual roles
```

### Error 6: Astro `PropsWithClientDirectives` Type Mismatch

**Error:** `Argument of type '(_props: PropsWithClientDirectives<$$ComponentProps>) => any' is not assignable to parameter of type 'ComponentImport<Component>'`

**Cause:** `@astrojs/svelte`'s `svelte-shims.d.ts` wraps all `.svelte` imports with `PropsWithClientDirectives` when `astro/client` is in `tsconfig.json` types. This breaks `vitest-browser-svelte`'s `render()`.

**Solution:** Separate tsconfigs for app and tests:

```jsonc
// tsconfig.json: exclude test files
{ "exclude": ["dist", "src/**/*.svelte.test.ts"] }

// tsconfig.test.json: no astro/client types
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*.svelte.test.ts"],
  "compilerOptions": { "types": ["node", "svelte"] }
}

// vitest.config.ts: point to the test tsconfig with test.typecheck.tsconfig: './tsconfig.test.json'
```

### Error 7: Link Click Navigates Iframe Away

**Error:** `Cannot connect to the iframe. Did you change the location or submitted a form?`

**Cause:** Clicking an `<a href="/other-page">` navigates the test iframe to that URL (measured).

**Solution:** Hash links (`href="#section"`) and links whose click handler calls `event.preventDefault()` are safe to click (measured). For a real navigation link, assert its `href` (`await expect.element(link).toHaveAttribute('href', '/other-page')`) or the state around it instead of clicking.

### Error 8: Rune Outside Svelte (Melt UI, etc.)

**Error:** `The $derived rune is only available inside .svelte and .svelte.js/ts files`

**Cause:** Vite's `optimizeDeps` pre-bundles `.svelte.js` files with its dependency pre-bundler (Rolldown since Vite 8, esbuild before), which strips runes, instead of letting vite-plugin-svelte process them.

**Solution:** Exclude the library from optimizeDeps:

```ts
// vitest.config.ts: inside project object
optimizeDeps: { exclude: ['melt'] }
```

### Error 9: Locator `.focus()` Not a Function

**Error:** `input.focus is not a function`

**Cause:** Vitest browser locators don't have `.focus()` (Playwright's own locators do). Only DOM elements do.

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

### ✅ DO

- Use locators (`page.getBy*()`) first; raw `querySelector` / `data-testid` only with a one-line why-comment
- Always `await expect.element()` for locator assertions
- Use `.first()`, `.nth()`, `.last()` for multiple elements
- Read `$derived` values directly
- Click animated elements with a plain `click()`, which waits until they are actionable; never `force: true` (see critical-patterns)
- Test form validation lifecycle: initial (valid) to validate to invalid
  to fix
- Use real `FormData`/`Request` objects in server tests
- Test semantic structure: roles, exact accessible names, visible text (not CSS classes)
- Focus on user-visible behavior
- Plan with `.skip` blocks before implementing

### ❌ DON'T

- Don't click submit on a natively posting form or a navigation link: the iframe navigates and the whole file fails (Errors 4 and 7); `preventDefault` forms/links and hash links are fine
- Don't ignore strict mode violations
- Don't assume element roles - verify in DevTools
- Don't test implementation details (SVG paths, wrapper divs, class lists). In SSR tests the HTML string is the output: asserting semantic elements with their text (`<h1>Welcome</h1>`, `<li>Alpha</li>`) or an accessible name is fine
- Don't write brittle tests that break on library updates
- Don't replace `FormData` / `Request` with hand-rolled fakes in server tests; use the real objects. Spy only on browser APIs a headless test cannot use for real (e.g. `navigator.clipboard.writeText` rejects with `NotAllowedError: Document is not focused`, measured)
- Don't expect forms to be invalid initially
- Don't build a test wrapper for static `children`: pass a snippet from `createRawSnippet` (measured to render). Use a wrapper component only for two-way bindings, context, or interactive snippets (Svelte testing docs)

### Common Locator Methods

```typescript
// Semantic queries (preferred)
page.getByRole('button', { name: 'Submit' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('heading', { name: 'Title', level: 1 });
page.getByLabelText('Email address');
page.getByText('Welcome'); // exact full text since Vitest 5; /welcome/i or { exact: false } for partial
page.getByPlaceholder('Enter email');

// fallback, with its reason: the third-party chart canvas exposes no role or accessible name
page.getByTestId('custom-widget');

// Multiple element handling
page.getByRole('link').first(); // First match
page.getByRole('link').nth(1); // Second match (0-indexed)
page.getByRole('link').last(); // Last match
```

### Test File Patterns

```typescript
// button.test.ts: browser component test (the browser project's `include` globs pick it up)
import { render } from 'vitest-browser-svelte';
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import Component from './button.svelte'; // <button onclick={() => count++}>Clicked: {count}</button>

test('component behavior', async () => {
 await render(Component);
 await page.getByRole('button').click();
 await expect.element(page.getByRole('button')).toHaveTextContent('Clicked: 1');
});

// passing static children (measured)
import { createRawSnippet } from 'svelte';
import Card from './card.svelte'; // renders {@render children?.()}

test('card renders its children', async () => {
 const children = createRawSnippet(() => ({ render: () => '<span>child content</span>' }));
 await render(Card, { children });
 await expect.element(page.getByText('child content')).toBeInTheDocument();
});

// Server-side API test
// api/users/server.test.ts
import { expect, test, vi } from 'vitest';
import * as database from '$lib/server/database';
import { POST } from './+server';

// mock the external service only: the request stays a real Request with real FormData
vi.mock('$lib/server/database');

test('API endpoint creates a user', async () => {
 vi.mocked(database.createUser).mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
 const formData = new FormData();
 formData.append('email', 'user@example.com');
 formData.append('password', 'securepass123');
 const request = new Request('http://localhost/api/users', {
  method: 'POST',
  body: formData,
 });
 const response = await POST({ request });
 expect(response.status).toBe(201);
 expect((await response.json()).email).toBe('user@example.com');
});
```

```typescript
// SSR test
// page.ssr.test.ts
import { expect, test } from 'vitest';
import { render } from 'svelte/server';
import PageComponent from './+page.svelte';

test('SSR rendering', () => {
 const { body } = render(PageComponent, { props: { data: {} } });
 expect(body).toContain('expected content');
});
```

---
