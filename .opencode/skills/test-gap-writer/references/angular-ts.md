# Angular / TypeScript testing patterns

## Detection

- `angular.json` + `package.json`. Check `package.json`/`angular.json` for the test runner: Karma+Jasmine (classic Angular default), Jest, or Vitest (newer setups). Match whichever is already configured — don't introduce a second runner.
- Check for Taiga UI, standalone components, and signals usage (this user's stack leans heavily on standalone components + signals over NgRx) — test signal state transitions directly rather than through the full component tree when possible.

## Components

- Use `TestBed` only when the test genuinely needs Angular's DI/change detection. For pure logic extracted into a signal-based service or a plain function, test it directly without `TestBed` — much faster and less brittle.
- Real edge cases to check, not just "component creates":
  - Empty/loading/error states actually render the right template branch (not just that the component instantiates)
  - Input signals/`@Input()` changing after init re-renders correctly
  - Two-way bound / CVA (ControlValueAccessor) components: writing a value, then having the user change it, then calling `writeValue` again — order-of-operations bugs are common here
  - Unsubscribing / `DestroyRef` cleanup — verify a subscription doesn't fire after the component is destroyed

## Services / Apollo Angular / Quenetiq-style GraphQL clients

- Don't just assert a query was called — assert the resulting signal/observable exposes the correct transformed data, including on the error path (query rejects, partial data with GraphQL errors array populated).
- Test cache normalization edge cases if applicable: same entity returned from two different queries should update both call sites (this is a known problem area in this user's own bug reports about Apollo Angular DI issues).
- Test race conditions between rapid successive queries (the second request completing before the first) if the client has any de-duplication or cancellation logic.

## Spies vs real dependencies

- Prefer a real lightweight implementation (e.g. an in-memory fake store) over a deep spy chain when feasible — deep spy chains tend to just test that you wired the spy correctly, not real behavior.
- When mocking HTTP, use `HttpTestingController` (Angular) rather than mocking the service layer, so the actual request shape is also verified.

## What to skip

- Testing Angular's own change detection or Taiga UI's internal components — only test your usage of them, not the library itself.
- Snapshot tests of template HTML with no behavioral assertion.
