# Go testing patterns

## Detection

- `go.mod` present. Runner: `go test ./...` (add `-race` whenever concurrency is in scope — it's cheap and finds real bugs).
- Check for `testify` (`stretchr/testify`) in `go.sum` — if present, use `assert`/`require` in the same style as existing tests. If absent, use plain `if got != want { t.Errorf(...) }` — don't introduce a new dependency for this.
- Check for existing test helpers in `*_test.go` files (builders, fake clocks, in-memory DB setup) — reuse them.

## Table-driven tests (default shape)

```go
func TestValidateToken(t *testing.T) {
    cases := []struct {
        name    string
        token   string
        wantErr error
    }{
        {"expired token", expiredToken(), ErrExpired},
        {"wrong signing key", wrongKeyToken(), ErrInvalidSignature},
        {"empty string", "", ErrMalformed},
    }
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            _, err := ValidateToken(tc.token)
            if !errors.Is(err, tc.wantErr) {
                t.Errorf("got %v, want %v", err, tc.wantErr)
            }
        })
    }
}
```

## Concurrency

- Always run suspect concurrent code under `go test -race`.
- Test context cancellation explicitly: pass a context that's already cancelled or has a near-zero timeout and assert the function returns promptly with the right error, not that it hangs or ignores cancellation.
- For goroutine leaks, consider `go.uber.org/goleak` if it's already a dependency; otherwise don't add it just for this.
- Test channel-based code for both the "receiver never reads" and "sender closes early" cases where relevant.

## gqlgen / GraphQL resolvers (relevant for this user's Quenetiq / Strix.dev work)

- Don't test generated resolver boilerplate itself. Test the hand-written business logic the resolver calls into.
- For resolvers that touch pgx/PostgreSQL, prefer testing the underlying repository/service function with a real or dockerized test DB (or `pgxmock`) rather than mocking pgx at a low level — pgx mocks tend to hide real query bugs.
- Cover partial-failure cases in batched/dataloader-style resolvers: some keys resolve, some error.

## pgx / database code

- Test the zero-rows case, the constraint-violation case (unique/fk), and context-cancelled-mid-query, not just the success case.
- If using `golang-migrate`, an integration test against a real (test) Postgres instance catches far more than mocking the driver.

## What to skip

- Generated protobuf/gqlgen types, plain DTOs/structs with no methods, trivial wrapper functions that just forward arguments.
