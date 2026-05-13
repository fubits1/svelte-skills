## Critical Patterns

### Form Handling in SvelteKit

**NEVER click submit buttons** in SvelteKit forms - they trigger full
page navigation:

```typescript
// ❌ DON'T - Causes navigation/hangs
const submit = page.getByRole('button', { name: /submit/i });
await submit.click(); // ⚠️ Infinite hang

// ✅ DO - Test form state directly
render(MyForm, { props: { errors: { email: 'Required' } } });

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
// ✅ BEST - Semantic queries
page.getByRole('button', { name: 'Submit' });
page.getByRole('textbox', { name: 'Email' });
page.getByRole('heading', { name: 'Welcome', level: 1 });
page.getByLabel('Email address');
page.getByText('Welcome back');

// ⚠️ OK - Use when no role available
page.getByTestId('custom-widget');
page.getByPlaceholder('Enter your email');

// ❌ AVOID - Brittle, implementation-dependent
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
// ❌ BRITTLE - Tests exact SVG path
expect(html).toContain(
 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
);
// Breaks when icon library updates!

// ✅ ROBUST - Tests semantic structure
expect(html).toContain('text-success'); // CSS class
expect(html).toContain('<svg'); // Icon present

// ✅ BEST - Tests user experience
await expect
 .element(page.getByRole('img', { name: /success/i }))
 .toBeInTheDocument();
```

### Using `force: true` for Animations

```typescript
// Some elements require force: true due to animations
await button.click({ force: true });
await input.fill('text', { force: true });
```

### Conditional `{@attach}` to keep third-party-bridging wrappers test-mountable

When a wrapper uses `{@attach}` to bridge into a third-party DOM library (maplibre, leaflet, d3, tippy), the factory normally runs on mount — which boots the library, fails in vitest where no real library context exists, and crashes the test before it can assert anything.

Gate the attachment expression on the prerequisite. Falsy values are treated as no attachment per [Svelte `@attach` docs](https://svelte.dev/docs/svelte/@attach):

```svelte
<!-- Wrapper.svelte -->
<div {@attach appState.condition ? popupAttachment : undefined}>...</div>
```

In production `appState.condition` is truthy after the third-party context mounts, so the attachment fires. In vitest `appState.condition` is null by default, so the factory never runs — but the wrapper's inner markup (the popup body div) still renders, which is what most tests assert against.

### Seed module-level `$state` synchronously in the test harness

When a wrapper reads from a module-level `$state` controller (e.g. a `menuState` exported from `someController.svelte.ts`), the test harness must seed that state BEFORE the wrapper's first render. Use plain assignments in the harness `<script>` body, NOT in `$effect`:

```svelte
<!-- TestHarness.svelte — synchronous seed in script body -->
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
// ❌ DON'T — TypeError: Cannot set property clipboard of #<Navigator> (getter only)
Object.assign(navigator, { clipboard: { writeText: vi.fn() } })

// ✅ DO
const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
// …test body…
expect(writeText).toHaveBeenCalledWith('48.78, 9.18')
writeText.mockRestore()
```

`navigator.clipboard` is a getter in Chromium (which `vitest-browser-svelte` drives). Spy on the method, don't reassign the whole property.

---
