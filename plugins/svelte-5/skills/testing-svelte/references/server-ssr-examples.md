# Server & SSR Test Examples

## SSR Test

Test server-side rendering output:

```typescript
// page.ssr.test.ts
import { test, expect, describe } from 'vitest';
import { render } from 'svelte/server';
import PageComponent from './+page.svelte';

describe('Page SSR', () => {
	test('renders without errors', () => {
		expect(() =>
			render(PageComponent, {
				props: { data: { title: 'Welcome' } },
			}),
		).not.toThrow();
	});

	// SSR output is a string: assert semantic elements with their text, not wrappers or classes
	test('renders correct HTML structure', () => {
		const { body } = render(PageComponent, {
			props: {
				data: {
					title: 'Welcome',
					items: ['Alpha', 'Beta', 'Gamma'],
				},
			},
		});

		expect(body).toContain('<h1>Welcome</h1>');
		expect(body).toContain('<li>Alpha</li>');
		expect(body).toContain('<li>Beta</li>');
		expect(body).toContain('<li>Gamma</li>');
	});

	test('renders the success state', () => {
		const { body } = render(PageComponent, {
			props: { data: { status: 'success' } },
		});

		/**
		 * assert what the user gets for this status (text, accessible name);
		 * a class name or `<svg` only proves markup exists (critical-patterns: WEAK)
		 */
		expect(body).toContain('aria-label="Payment succeeded"');
		expect(body).toContain('Payment received');
	});

	test('handles empty data gracefully', () => {
		const { body } = render(PageComponent, {
			props: { data: { items: [] } },
		});

		expect(body).toContain('No items found');
	});
});
```

---
