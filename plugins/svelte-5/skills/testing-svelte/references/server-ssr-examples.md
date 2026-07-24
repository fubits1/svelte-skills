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

	test('applies correct CSS classes', () => {
		const { body } = render(PageComponent, {
			props: { data: { status: 'success' } },
		});

		// Test semantic CSS classes, not implementation details
		expect(body).toContain('text-success');
		expect(body).toContain('<svg'); // Icon present
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
