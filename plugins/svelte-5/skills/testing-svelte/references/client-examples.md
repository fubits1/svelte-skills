# Client Component Test Examples

## Complete Examples

### Example 1: Client-Side Component Test

Real browser testing with user interactions:

```typescript
// button.svelte.test.ts
import { render } from 'vitest-browser-svelte';
import { test, expect, describe } from 'vitest';
import { page, userEvent } from 'vitest/browser';
// labeled-counter.svelte: <button onclick={() => count++}>{label}: {count}</button>
import Button from './labeled-counter.svelte';
import ButtonGroup from './button-group.svelte';

describe('Button Component', () => {
	test('increments counter on click', async () => {
		await render(Button, { props: { label: 'Clicked' } });

		/**
		 * locators are lazy and re-query on every use: locate by something
		 * that survives the click (the role, or a RegExp on the stable part
		 * of the name)
		 */
		const button = page.getByRole('button', { name: /^clicked/i });

		await userEvent.click(button);
		// exact match since Vitest 5, so assert the full text
		await expect.element(button).toHaveTextContent('Clicked: 1');

		await userEvent.click(button);
		await expect.element(button).toHaveTextContent('Clicked: 2');
	});

	test('supports keyboard interaction', async () => {
		await render(Button, { props: { label: 'Pressed' } });

		const button = page.getByRole('button', { name: /^pressed/i });
		// locators have no .focus(); element() returns the DOM node
		await button.element().focus();
		await userEvent.keyboard('{Enter}');

		await expect.element(button).toHaveTextContent('Pressed: 1');
	});

	test('handles multiple buttons with .first()', async () => {
		await render(ButtonGroup); // Renders multiple buttons

		// Handle multiple buttons explicitly
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
import { flushSync } from 'svelte';
import Counter from './counter.svelte';
import FormComponent from './form-component.svelte';

test('$state and $derived reactivity', async () => {
	const { component } = await render(Counter);

	// Access $state value directly
	expect(component.count).toBe(0);

	// Update state
	component.increment();

	// Force synchronous update
	flushSync(() => {});

	// Access $derived value directly
	expect(component.doubled).toBe(2);
});

test('form validation lifecycle', async () => {
	const { component } = await render(FormComponent);

	// Initially valid (no validation run yet)
	expect(component.isFormValid()).toBe(true);

	// Trigger validation
	component.validateAllFields();

	// Now invalid (empty required fields)
	expect(component.isFormValid()).toBe(false);

	// Fix validation errors
	component.email.value = 'test@example.com';
	component.validateAllFields();

	// Valid again
	expect(component.isFormValid()).toBe(true);
});
```

### Example 3: Server-Side API Test

Test with real FormData/Request objects:

```typescript
// api/users/server.test.ts
import { test, expect, describe, vi } from 'vitest';
import { POST } from './+server';
import * as database from '$lib/server/database';

vi.mock('$lib/server/database');

describe('POST /api/users', () => {
	/**
	 * no beforeEach(vi.clearAllMocks): Vitest 5 defaults to clearMocks: true
	 * and clears call history before every test, so the
	 * not.toHaveBeenCalled() assertions below stay isolated
	 */

	test('creates user with valid data', async () => {
		// Mock only external services
		vi.mocked(database.createUser).mockResolvedValue({
			id: '123',
			email: 'user@example.com',
		});

		// Use real FormData
		const formData = new FormData();
		formData.append('email', 'user@example.com');
		formData.append('password', 'securepass123');

		// Use real Request object
		const request = new Request('http://localhost/api/users', {
			method: 'POST',
			body: formData,
		});

		const response = await POST({ request });
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

		const response = await POST({ request });
		const data = await response.json();

		expect(response.status).toBe(400);
		// the exact message the endpoint returns, not just "some error exists"
		expect(data.errors.email).toBe('Invalid email format');
		expect(database.createUser).not.toHaveBeenCalled();
	});

	test('handles missing required fields', async () => {
		const formData = new FormData();
		// Missing email and password

		const request = new Request('http://localhost/api/users', {
			method: 'POST',
			body: formData,
		});

		const response = await POST({ request });
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
