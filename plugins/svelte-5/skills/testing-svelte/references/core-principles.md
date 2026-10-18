# Core Principles

## 1. Locators First, Raw DOM Only With a Reason

vitest-browser-svelte uses Playwright-style locators with automatic
retry logic. A raw `container.querySelector(...)` has no
retry and no accessibility check, so it is the exception: allowed only with
a one-line comment saying why no accessible locator works (a third-party
widget without roles, an overlay that intercepts clicks).

```typescript
// ❌ default to raw DOM: no retry logic, and no accessibility check
const { container } = await render(MyComponent);
const button = container.querySelector('button');
```

```typescript
// ✅ locator: retries until the element is there
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
page.getByRole('link', { name: 'Home' }); // desktop + mobile nav

// ✅ CORRECT: Handle multiple elements explicitly
page.getByRole('link', { name: 'Home' }).first();
page.getByRole('link', { name: 'Home' }).nth(1); // second element
page.getByRole('link', { name: 'Home' }).last();
```

## 3. Read `$derived` Values Directly

Access `$derived` values directly in tests; no `untrack()` needed. [sveltest](https://sveltest.dev/docs/runes-testing) wraps such reads in `untrack()` as a defensive convention, so they cannot leak into a reactive scope (troubleshooting Error 3).

```typescript
// ✅ a getter that returns a $derived value: read it
expect(component.derivedValue).toBe(42);

// ✅ an exported function: call it
expect(component.computeTotal()).toBe(42);
```

## 4. Real FormData/Request Objects

Use real web APIs instead of heavy mocking to catch client-server
mismatches:

```typescript
/**
 * fragment: `vi` from 'vitest', `database` from '#lib/server/database.js'
 * (mocked with a top-level `vi.mock('#lib/server/database.js')`)
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

// only mock external services
vi.mocked(database.createUser).mockResolvedValue({
	id: '123',
	email: 'test@example.com',
});
```
