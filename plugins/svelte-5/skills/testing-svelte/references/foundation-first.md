# Foundation-First Test Coverage

## Foundation First Methodology

**Aim for 100% test coverage** by planning comprehensive test
structure before implementation.

### Step 1: Create Test Structure with `.skip`

```typescript
// form.svelte.test.ts
import { test, describe } from 'vitest';

describe('ContactForm', () => {
	describe('Initial Rendering', () => {
		test.skip('renders with default props', () => {});
		test.skip('renders all form fields', () => {});
		test.skip('has proper ARIA labels', () => {});
	});

	describe('Form Validation', () => {
		test.skip('validates email format', () => {});
		test.skip('requires all fields', () => {});
		test.skip('shows validation errors', () => {});
		test.skip('validates on blur', () => {});
	});

	describe('User Interactions', () => {
		test.skip('handles input changes', () => {});
		test.skip('clears form on reset', () => {});
		test.skip('disables submit when invalid', () => {});
	});

	describe('Edge Cases', () => {
		test.skip('handles empty submission', () => {});
		test.skip('handles server errors', () => {});
		test.skip('shows loading state', () => {});
	});

	describe('Accessibility', () => {
		test.skip('supports keyboard navigation', () => {});
		test.skip('announces errors to screen readers', () => {});
	});
});
```

### Step 2: Implement Tests Incrementally

Remove `.skip` as you implement each test:

```typescript
import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import ContactForm from './ContactForm.svelte';

describe('ContactForm', () => {
	describe('Initial Rendering', () => {
		test('renders with default props', async () => {
			await render(ContactForm);

			// exact accessible names: checks the labels, not just "something rendered"
			await expect
				.element(page.getByRole('textbox', { name: 'Email' }))
				.toBeInTheDocument();
			await expect
				.element(page.getByRole('textbox', { name: 'Message' }))
				.toBeInTheDocument();
			await expect
				.element(page.getByRole('button', { name: 'Send message' }))
				.toBeInTheDocument();
		});

		test.skip('renders all form fields', () => {});
		// Continue implementing...
	});

	// a file of render-only tests proves nothing: implement an interaction early
	describe('Form Validation', () => {
		test('validates email format on blur', async () => {
			await render(ContactForm);
			const email = page.getByRole('textbox', { name: 'Email' });

			await email.fill('not-an-email');
			await userEvent.tab(); // blur

			await expect.element(email).toHaveAttribute('aria-invalid', 'true');
			await expect
				.element(page.getByText('Enter a valid email address'))
				.toBeInTheDocument();
		});
	});
});
```

---
