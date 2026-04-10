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

**Error:** Cannot read $derived value in test

**Cause:** Svelte 5 reactive values need `untrack()`

**Solution:**

```typescript
import { untrack } from 'svelte';

// Before
const value = component.derivedValue; // Error!

// After
const value = untrack(() => component.derivedValue);
```

### Error 4: Form Submit Hangs

**Error:** Test hangs after clicking submit button

**Cause:** SvelteKit form submission triggers full page navigation

**Solution:**

```typescript
// ❌ DON'T
await submitButton.click(); // Hangs!

// ✅ DO - Test form state directly
render(MyForm, { props: { errors: { email: 'Required' } } });
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
// tsconfig.json — exclude test files
{ "exclude": ["dist", "src/**/*.svelte.test.ts"] }

// tsconfig.test.json — no astro/client types
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*.svelte.test.ts"],
  "compilerOptions": { "types": ["node", "svelte"] }
}

// vitest.config.ts — point to test tsconfig
// test.typecheck.tsconfig: './tsconfig.test.json'
```

### Error 7: Link Click Navigates Iframe Away

**Error:** `Cannot connect to the iframe. Did you change the location?`

**Cause:** Clicking an `<a href>` in a test navigates the browser iframe to that URL.

**Solution:** Don't click links. Test the surrounding state (radio inputs, ARIA attributes) instead.

### Error 8: Rune Outside Svelte (Melt UI, etc.)

**Error:** `The $derived rune is only available inside .svelte and .svelte.js/ts files`

**Cause:** Vite's `optimizeDeps` pre-bundles `.svelte.js` files with esbuild (which strips runes) instead of letting vite-plugin-svelte process them.

**Solution:** Exclude the library from optimizeDeps:

```ts
// vitest.config.ts — inside project object
optimizeDeps: { exclude: ['melt'] }
```

### Error 9: Locator `.focus()` Not a Function

**Error:** `input.focus is not a function`

**Cause:** Playwright locators don't have `.focus()`. Only DOM elements do.

**Solution:** Use `.click()` to focus, or use `page.getByRole('textbox').element().focus()` for direct DOM access.

---

## Quick Reference

### ✅ DO

- Use locators (`page.getBy*()`) - never containers
- Always `await expect.element()` for locator assertions
- Use `.first()`, `.nth()`, `.last()` for multiple elements
- Use `untrack()` for `$derived` values
- Use `force: true` for animated elements
- Test form validation lifecycle: initial (valid) → validate → invalid
  → fix
- Use real `FormData`/`Request` objects in server tests
- Test semantic structure and CSS classes
- Focus on user-visible behavior
- Plan with `.skip` blocks before implementing

### ❌ DON'T

- Never click SvelteKit form submit buttons
- Don't ignore strict mode violations
- Don't assume element roles - verify in DevTools
- Don't test implementation details (SVG paths, exact markup)
- Don't write brittle tests that break on library updates
- Don't mock browser APIs (FormData, Request, etc.)
- Don't expect forms to be invalid initially
- Avoid `children` props in vitest-browser-svelte

### Common Locator Methods

```typescript
// Semantic queries (preferred)
page.getByRole('button', { name: 'Submit' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('heading', { name: 'Title', level: 1 });
page.getByLabel('Email address');
page.getByText('Welcome');

// Fallback queries
page.getByTestId('custom-widget');
page.getByPlaceholder('Enter email');

// Multiple element handling
page.getByRole('link').first(); // First match
page.getByRole('link').nth(1); // Second match (0-indexed)
page.getByRole('link').last(); // Last match
```

### Test File Patterns

```typescript
// Client-side component test
// button.svelte.test.ts
import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';

test('component behavior', async () => {
 render(Component);
 await expect.element(page.getByRole('button')).toBeInTheDocument();
});

// Server-side API test
// api/users/server.test.ts
import { POST } from './+server';

test('API endpoint', async () => {
 const formData = new FormData();
 const request = new Request('http://localhost/api', {
  method: 'POST',
  body: formData,
 });
 const response = await POST({ request });
 expect(response.status).toBe(200);
});

// SSR test
// page.ssr.test.ts
import PageComponent from './+page.svelte';

test('SSR rendering', () => {
 const { html } = PageComponent.render({ data: {} });
 expect(html).toContain('expected content');
});
```

---
