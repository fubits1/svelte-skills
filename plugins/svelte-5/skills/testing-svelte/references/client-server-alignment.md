# Client-Server Test Alignment

## Client-Server Alignment

### The Problem

Heavy mocking in server tests can hide client-server mismatches that
only appear in production.

### The Solution

Use real `FormData` and `Request` objects. Only mock external services
(database, APIs).

```typescript
/**
 * src/routes/api/register/server.test.ts (fragment): `vi`, `database` and `POST` come from
 * `import { vi } from 'vitest'`, `import * as database from '#lib/server/database.js'`,
 * `import { POST } from './+server'`, with `vi.mock('#lib/server/database.js')` at the top level
 */

// ❌ BRITTLE APPROACH
const mockRequest = {
	formData: vi.fn().mockResolvedValue({
		get: vi.fn((key) => {
			if (key === 'email') return 'test@example.com';
			if (key === 'password') return 'pass123';
		}),
	}),
};
// this passes even if real FormData API differs!

// ✅ ROBUST APPROACH
const formData = new FormData();
formData.append('email', 'test@example.com');
formData.append('password', 'pass123');

const request = new Request('http://localhost/api/register', {
	method: 'POST',
	body: formData,
});

// only mock external services
vi.mocked(database.createUser).mockResolvedValue({
	id: '123',
	email: 'test@example.com',
});

const response = await POST({ request } as Parameters<typeof POST>[0]);
```

### Shared Validation Logic

Use the same validation on client and server:

```typescript
// src/lib/validation.ts
export function validateEmail(email: string) {
	if (!email) return 'Email is required';
	if (!email.includes('@')) return 'Invalid email format';
	return null;
}
```

```typescript
// src/lib/validation.test.ts: unit test for the shared rule
import { expect, test } from 'vitest';
import { validateEmail } from '#lib/validation.js';
test('validates email', () => {
	expect(validateEmail('')).toBe('Email is required');
	expect(validateEmail('invalid')).toBe('Invalid email format');
	expect(validateEmail('test@example.com')).toBe(null);
});
```

```typescript
// src/routes/api/register/+server.ts: the endpoint uses the same validation
import type { RequestHandler } from './$types';
import { validateEmail } from '#lib/validation.js';
import { createUser } from '#lib/server/database.js';

export const POST: RequestHandler = async ({ request }) => {
	const formData = await request.formData();
	// `FormData.get()` returns string | File | null: coerce to a string before validating
	const email = String(formData.get('email') ?? '');
	const password = String(formData.get('password') ?? '');
	const errors: Record<string, string> = {};
	const emailError = validateEmail(email);
	if (emailError) errors.email = emailError;
	if (!password) errors.password = 'Password is required';
	if (Object.keys(errors).length > 0) {
		return Response.json({ errors }, { status: 400 });
	}
	await createUser({ email, password });
	return Response.json({ ok: true }, { status: 201 });
};
```

---
