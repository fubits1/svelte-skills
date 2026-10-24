# Client Component Test Examples

## Contents

- Example 1: client-side component test
- Example 2: testing Svelte 5 runes
- Example 3: server-side API test

## Complete Examples

### Example 1: Client-Side Component Test

Real browser testing with user interactions:

```typescript
// labeled-counter.svelte.test.ts
import { render } from 'vitest-browser-svelte';
import { test, expect, describe } from 'vitest';
import { page, userEvent } from 'vitest/browser';
// labeled-counter.svelte: <button onclick={() => count++}>{label}: {count}</button>
import LabeledCounter from './labeled-counter.svelte';
import ButtonGroup from './button-group.svelte';

describe('LabeledCounter', () => {
	test('increments counter on click', async () => {
		await render(LabeledCounter, { props: { label: 'Clicked' } });

		/**
		 * locators are lazy and re-query on every use: locate by something
		 * that survives the click (the role, or a RegExp on the stable part
		 * of the name)
		 */
		const button = page.getByRole('button', { name: /^clicked/i });

		await userEvent.click(button);
		// exact match, so assert the full text
		await expect.element(button).toHaveTextContent('Clicked: 1');

		await userEvent.click(button);
		await expect.element(button).toHaveTextContent('Clicked: 2');
	});

	test('supports keyboard interaction', async () => {
		await render(LabeledCounter, { props: { label: 'Pressed' } });

		const button = page.getByRole('button', { name: /^pressed/i });
		// locators have no .focus(); element() returns the DOM node
		button.element().focus();
		await userEvent.keyboard('{Enter}');

		await expect.element(button).toHaveTextContent('Pressed: 1');
	});

	test('handles multiple buttons with .first()', async () => {
		await render(ButtonGroup); // renders several buttons, each showing "Clicked: N"

		const firstButton = page.getByRole('button').first();
		const secondButton = page.getByRole('button').nth(1);

		// different click counts per button, so the assertions tell the buttons apart
		await firstButton.click();
		await firstButton.click();
		await secondButton.click();

		await expect.element(firstButton).toHaveTextContent('Clicked: 2');
		await expect.element(secondButton).toHaveTextContent('Clicked: 1');
	});
});
```

### Example 2: Testing Svelte 5 Runes

```typescript
// counter.svelte.test.ts
import { render } from 'vitest-browser-svelte';
import { test, expect } from 'vitest';
/**
 * the test reads what the components export:
 * counter.svelte: let count = $state(0); const doubled = $derived(count * 2);
 *   export function increment() { count++ }; export { count, doubled };
 * form-component.svelte: const email = $state({ value: '', error: '' });
 *   export function validateAllFields() and isFormValid(); export { email };
 * without the export { ... } line, component.count is undefined
 */
import Counter from './counter.svelte';
import FormComponent from './form-component.svelte';

test('$state and $derived reactivity', async () => {
	const { component } = await render(Counter);

	// access $state value directly
	expect(component.count).toBe(0);

	component.increment();

	// access $derived value directly: it recomputes on read, no flushSync needed
	expect(component.doubled).toBe(2);
});

test('form validation lifecycle', async () => {
	const { component } = await render(FormComponent);

	// initially valid (no validation run yet)
	expect(component.isFormValid()).toBe(true);

	component.validateAllFields();
	// now invalid (empty required fields)
	expect(component.isFormValid()).toBe(false);

	component.email.value = 'test@example.com';
	component.validateAllFields();
	expect(component.isFormValid()).toBe(true);
});
```

### Example 3: Server-Side API Test

Test with real FormData/Request objects:

```typescript
// src/routes/api/users/server.test.ts (`#lib/*` needs the `package.json` `imports` entry that `sv create` adds)
import { test, expect, describe, vi } from 'vitest';
import { POST } from './+server';
import * as database from '#lib/server/database.js';

vi.mock('#lib/server/database.js');

describe('POST /api/users', () => {
	test('creates user with valid data', async () => {
		// mock only external services
		vi.mocked(database.createUser).mockResolvedValue({
			id: '123',
			email: 'user@example.com',
		});

		// use real FormData
		const formData = new FormData();
		formData.append('email', 'user@example.com');
		formData.append('password', 'securepass123');

		// use real Request object
		const request = new Request('http://localhost/api/users', {
			method: 'POST',
			body: formData,
		});

		const response = await POST({ request } as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(response.status).toBe(201);
		expect(data.email).toBe('user@example.com');
		expect(database.createUser).toHaveBeenCalledWith({
			email: 'user@example.com',
			password: 'securepass123',
		});
	});

	test('rejects invalid email format', async () => {
		const formData = new FormData();
		formData.append('email', 'invalid-email');
		formData.append('password', 'pass123');

		const request = new Request('http://localhost/api/users', {
			method: 'POST',
			body: formData,
		});

		const response = await POST({ request } as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(response.status).toBe(400);
		// the exact message the endpoint returns, not just "some error exists"
		expect(data.errors.email).toBe('Invalid email format');
		expect(database.createUser).not.toHaveBeenCalled();
	});

	test('handles missing required fields', async () => {
		const formData = new FormData();
		// missing email and password

		const request = new Request('http://localhost/api/users', {
			method: 'POST',
			body: formData,
		});

		const response = await POST({ request } as Parameters<typeof POST>[0]);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.errors).toEqual({
			email: 'Email is required',
			password: 'Password is required',
		});
		expect(database.createUser).not.toHaveBeenCalled();
	});
});
```
