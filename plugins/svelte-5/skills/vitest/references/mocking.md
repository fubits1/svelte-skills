# Mocking

## Placement and hoisting

- `vi.mock`, `vi.hoisted`, `vi.unmock` go at the top level. Inside `describe`, `test`, or a function they throw in Vitest 5 (`was defined outside of the module's top level scope`). `vi.doMock` may go anywhere
- Vitest hoists `vi.mock` above the static imports, so its factory runs before any `const` in the file exists. A factory that references a module-level `const` fails with a static import:

  ```text
  Error: [vitest] There was an error when mocking a module. If you are using "vi.mock" factory,
  make sure there are no top level variables inside, since this call is hoisted to top of the file.
  Caused by: ReferenceError: Cannot access 'fakeAdd' before initialization
  ```

Two fixes, both measured:

```ts
// a) vi.hoisted: create the value in the hoisted scope
import { expect, test, vi } from "vitest";
import { add } from "./math";

const { fakeAdd } = vi.hoisted(() => ({ fakeAdd: vi.fn(() => 42) }));
vi.mock("./math", () => ({ add: fakeAdd }));

test("hoisted", () => {
  expect(add(1, 2)).toBe(42);
});
```

```ts
// b) dynamic import: the mocked module loads after the const exists
import { expect, test, vi } from "vitest";

const fakeAdd = vi.fn(() => 42);
vi.mock("./math", () => ({ add: fakeAdd }));

const { add } = await import("./math");

test("dynamic import", () => {
  expect(add(1, 2)).toBe(42);
});
```

Use (b) when the factory needs several module-level fakes or stores; use (a) when the module must be a static import.

## Svelte and SvelteKit seams

- SvelteKit's client router does not start in a Vitest browser run (observed in a SvelteKit app; not part of the measured set), so components that call `$app/navigation` or read `$app/state` need those modules mocked. Capture callbacks through `vi.hoisted` to drive them by hand:

  ```ts
  const nav = vi.hoisted(() => ({ afterNavigate: [] as Array<() => void> }));
  vi.mock("$app/navigation", () => ({
    goto: vi.fn(),
    afterNavigate: (fn: () => void) => nav.afterNavigate.push(fn),
  }));
  // later: nav.afterNavigate.forEach((fn) => fn())
  ```

- Replace a heavy child component with a fixture: `vi.mock("./Chart.svelte", () => import("./fixtures/ChartStub.svelte"))`. The fixture can count mounts or render its props for assertions

## Mock state between tests

- Vitest 5 defaults to `clearMocks: true`: call history is cleared before every test. `beforeEach(() => vi.clearAllMocks())` is redundant unless the config sets `clearMocks: false`. Calls recorded in a setup file, at module scope, or in `beforeAll` are gone by the time a test asserts; read them at module scope or trigger them inside the test
- `vi.restoreAllMocks()` restores `vi.spyOn` originals. It does not touch `vi.fn()` mocks created in `vi.mock` factories; their history is reset by `clearMocks` (or `vi.clearAllMocks()` when that default is off)
