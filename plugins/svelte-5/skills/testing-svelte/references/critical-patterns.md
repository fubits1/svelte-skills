# Critical Testing Patterns

## Critical Patterns

### Form Handling in SvelteKit

**Never click submit on a form that posts natively** (no `preventDefault` in its submit
handler): the browser navigates the test iframe and the whole file fails with
`Cannot connect to the iframe. Did you change the location or submitted a form?` (measured).
A form whose submit handler calls `event.preventDefault()` can be submitted by clicking and
its outcome asserted (measured; see troubleshooting Error 4).

```typescript
// ❌ DON'T - natively posting form: navigates the iframe, the file fails
const submit = page.getByRole('button', { name: /submit/i });
await submit.click();

// ✅ DO - test the native form's states directly
await render(MyForm, { props: { errors: { email: 'Required' } } });

const emailInput = page.getByRole('textbox', { name: /email/i });
await emailInput.fill('test@example.com');

// Verify form state
await expect.element(emailInput).toHaveValue('test@example.com');

// Test error display
await expect.element(page.getByText('Required')).toBeInTheDocument();
```

### Semantic Queries (Preferred)

Use semantic role-based queries for better accessibility and
maintainability:

```typescript
// ✅ BEST - semantic queries (exact, case-sensitive; RegExp or { exact: false } for partial)
page.getByRole('button', { name: 'Submit' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('heading', { name: 'Welcome', level: 1 });
page.getByLabelText('Email address');
page.getByText('Welcome back');
page.getByPlaceholder('Enter your email');

// ⚠️ LAST RESORT, with its reason: the third-party chart canvas exposes no role or accessible name
page.getByTestId('custom-widget');

// ❌ AVOID without a reason - brittle, implementation-dependent, no retry
container.querySelector('.submit-button');
```

### Common Role Mistakes

```typescript
// ❌ WRONG: "input" is not a role
page.getByRole('input', { name: 'Email' });

// ✅ CORRECT: Use "textbox" for input fields
page.getByRole('textbox', { name: 'Email' });

// ❌ WRONG: Using link role when element has role="button"
page.getByRole('link', { name: 'Submit' }); // <a role="button">

// ✅ CORRECT: Use the actual role attribute
page.getByRole('button', { name: 'Submit' });

// ✅ Check actual roles in browser DevTools
// Right-click element → Inspect → Accessibility tab
```

### Avoid Testing Implementation Details

Test user-visible behavior, not internal implementation:

```typescript
/**
 * fragment: `html` is SSR output (`render(Page).body` from svelte/server);
 * the BEST case is a browser test (`page` from vitest/browser)
 */

// ❌ BRITTLE - Tests exact SVG path
expect(html).toContain(
 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
);
// Breaks when icon library updates!

// ⚠️ WEAK - a CSS class is an implementation detail and `<svg` only proves an icon exists
expect(html).toContain('text-success'); // CSS class
expect(html).toContain('<svg'); // Icon present

/**
 * ✅ BEST - tests user experience: the success state, by its exact accessible name
 * (in an SSR test: expect(html).toContain('aria-label="Payment succeeded"'))
 */
await expect
 .element(page.getByRole('img', { name: 'Payment succeeded' }))
 .toBeInTheDocument();
```

### Don't use `force: true` to get past animations or overlays

`force: true` skips the actionability checks (visible, stable, receives events). On a button
covered by an overlay a normal `click()` times out, which is the bug a real user would hit;
`click({ force: true })` reports success while the button's handler never runs (measured:
click counter stayed at 0).

```typescript
// ❌ DON'T - hides "a user cannot click this"
await button.click({ force: true });

// ✅ DO - if it times out, the UI is blocked: fix that, not the test
await button.click();
```

### Conditional `{@attach}` to keep third-party-bridging wrappers test-mountable

When a wrapper uses `{@attach}` to bridge into a third-party DOM library (maplibre, leaflet, d3, tippy), the factory normally runs on mount, which boots the library, fails in vitest where no real library context exists, and crashes the test before it can assert anything.

Gate the attachment expression on the prerequisite. Falsy values are treated as no attachment per [Svelte `@attach` docs](https://svelte.dev/docs/svelte/@attach):

```svelte
<!-- Wrapper.svelte -->
<div {@attach appState.condition ? popupAttachment : undefined}>...</div>
```

In production `appState.condition` is truthy after the third-party context mounts, so the attachment fires. In vitest `appState.condition` is null by default, so the factory never runs, but the wrapper's inner markup (the popup body div) still renders, which is what most tests assert against.

### Seed module-level `$state` synchronously in the test harness

When a wrapper reads from a module-level `$state` controller (e.g. a `menuState` exported from `someController.svelte.ts`), the test harness must seed that state BEFORE the wrapper's first render. Use plain assignments in the harness `<script>` body, NOT in `$effect`:

```svelte
<!-- TestHarness.svelte: synchronous seed in script body -->
<script lang="ts">
  import { menuState } from '$lib/.../someController.svelte'

  type Props = { lat: number; lon: number; open?: boolean }
  let { lat, lon, open = true }: Props = $props()

  // synchronous: runs BEFORE the wrapper's first render
  menuState.lat = lat
  menuState.lon = lon
  menuState.open = open
</script>

<Wrapper>…</Wrapper>
```

If you write the same assignments in `$effect`, they fire AFTER the first render and the wrapper renders against stale `{ lat: 0, lon: 0 }` defaults. Tests that read the data-payload off the first frame see zeros and fail.

### Mock `navigator.clipboard.writeText` with `vi.spyOn`, not `Object.assign`

```typescript
import { expect, vi } from 'vitest'

// ❌ DON'T: TypeError: Cannot set property clipboard of #<Navigator> which has only a getter
Object.assign(navigator, { clipboard: { writeText: vi.fn() } })

// ✅ DO
const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
// …test body…
expect(writeText).toHaveBeenCalledWith('48.78, 9.18')
writeText.mockRestore()
```

`navigator.clipboard` is a getter in Chromium (the browser `@vitest/browser-playwright` drives), so reassigning it throws (measured). Spy on the method instead. The spy is needed because the real `writeText` rejects in a headless test run with `NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused.` (measured).

---
