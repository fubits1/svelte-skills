# Core Principles

## 1. Locators First, Raw DOM Only With a Reason

vitest-browser-svelte uses Playwright-style locators with automatic
retry logic. A raw `container.querySelector(...)` has no
retry and no accessibility check, so it is the exception: allowed only with
a one-line comment saying why no accessible locator works (a third-party
widget without roles, an overlay that intercepts clicks).

```typescript
// ❌ default to raw DOM: no retry logic, brittle tests
const { container } = await render(MyComponent);
const button = container.querySelector('button');

// ✅ locator: auto-retry, resilient tests
await render(MyComponent);
const button = page.getByRole('button', { name: 'Submit' });
await button.click();

/**
 * ✅ escape hatch, with its reason: the third-party date picker's day cells carry no
 * role or accessible name. `page.css` is a custom locator added with
 * `locators.extend` (frontend:vitest browser-mode reference)
 */
const day = page.css('.calendar-day[data-day="15"]');
```

## 2. Handle Strict Mode Violations

When multiple elements match a locator, use `.first()`, `.nth()`, or
`.last()`:

```typescript
// ❌ FAILS: "strict mode violation: resolved to 2 elements"
page.getByRole('link', { name: 'Home' }); // Desktop + mobile nav

// ✅ CORRECT: Handle multiple elements explicitly
page.getByRole('link', { name: 'Home' }).first();
page.getByRole('link', { name: 'Home' }).nth(1); // Second element
page.getByRole('link', { name: 'Home' }).last();
```

## 3. Read `$derived` Values Directly

Defensive convention: [sveltest](https://sveltest.dev/docs/runes-testing) wraps `$derived` reads in `untrack()` to avoid leaking test-time reads into reactive scopes.

Access `$derived` values directly in tests; no `untrack()` needed:

```typescript
// ✅ Access $derived values
const value = component.derivedValue;
expect(value).toBe(42);

// ✅ For getters: call the function directly
const derivedFn = component.computedValue;
expect(derivedFn()).toBe(expected);
```

## 4. Real FormData/Request Objects

Use real web APIs instead of heavy mocking to catch client-server
mismatches:

```typescript
/**
 * fragment: `vi` from 'vitest', `database` from '$lib/server/database'
 * (mocked with a top-level `vi.mock('$lib/server/database')`)
 */

// ❌ BRITTLE: Mocks hide API mismatches
const mockRequest = {
	formData: vi.fn().mockResolvedValue({
		get: vi.fn().mockReturnValue('test@example.com'),
	}),
};

// ✅ ROBUST: Real FormData catches mismatches
const formData = new FormData();
formData.append('email', 'test@example.com');
const request = new Request('http://localhost/api/users', {
	method: 'POST',
	body: formData,
});

// Only mock external services
vi.mocked(database.createUser).mockResolvedValue({
	id: '123',
	email: 'test@example.com',
});
```
