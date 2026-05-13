# Assertions

A presence-only assertion ships the bug. "Element exists", "value is non-empty", "callback was called" — every one of these passes for behavior that is wrong.

## The rule

Compute the expected value from the action you performed. Assert equality to that value. If you cannot compute the expected value, you do not understand what the action should do, and the test should not exist yet.

## Three patterns that fail

**Presence.** `toBeInTheDocument()`, `toBeTruthy()`, `not.toBeNull()`. Proves the element mounted. Says nothing about behavior.

**Non-empty.** `not.toBe('')`, `> 0`, `length > 0`. Any side effect from any code path will satisfy this.

**Callback count.** `expect(spy).toHaveBeenCalled()`, `spy.mock.calls.length > 0`. Passes when the callback fires with the wrong argument.

## The replacement pattern

```ts
// 1. Record the pre-action state.
const before = readProbe()

// 2. Perform the action.
await userInteraction()

// 3. Compute expected post-state from the action.
const expectedSeconds = Math.floor(new Date(year, monthIndex, 15).getTime() / 1000)

// 4. Assert equality to that computed value.
await expect.poll(() => readProbe()).toBe(String(expectedSeconds))
expect(Number(readProbe())).not.toBe(Number(before))
```

The `not.toBe(before)` guard is cheap insurance against a test that passes because nothing happened.

## Callback payloads

```ts
// Wrong: proves only that onChange fired.
expect(changeSpy).toHaveBeenCalled()

// Right: proves onChange fired with the value that was picked.
expect(changeSpy).toHaveBeenLastCalledWith(
  expect.arrayContaining([expect.any(Date)]),
  '2026-04-15',
  expect.anything()
)
```

## Diagnose the failure class before iterating

Test failures fall into two classes. Iterating on the wrong class wastes time.

**Harness / setup failure.** The assertion message shows `expected X to be Y`, received is `""`, `null`, `false`, or the default initial state. The action did not take effect. The test never reached the behavior under test. Fix the setup: inspect the DOM, read the library source, unmount prior renders, wait for open states, check the real event the library listens for, verify the selector resolves to a single element.

**Behavior failure.** The assertion reached. Received is a real value, just the wrong one. Now iterate on the production code or the assertion.

If received is empty and you change the expected value, you are in class 1 and editing the wrong file.

## Render-only tests

A test file with only `renders without error`, `shows input element`, `displays label` proves the component mounts. It does not prove any behavior. At least one test in the file must drive an interaction and compare the post-state against a computed expected value.

## Lesson — why presence assertions miss regressions

A real shape this fails in: a UI component (e.g. a datepicker) ships with a regression that swallows the first user click. Every existing test in the file passes: render, placeholder present, label present — because each one only checks presence. The bug stays in for weeks. A first regression test gets written using `not.toBe('')` and also passes on the broken path: any truthy value, including `0` or a wrong unix timestamp, satisfies that assertion.

A value-equality assertion against a computed expected value is the only kind that would have caught the bug and prevented regression.
