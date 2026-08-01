# Changelog

## [1.0.6-beta] — 2026-08-01

### Migration: `@dumbql/*` → `@quenetiq/*`

- All packages renamed: `@dumbql/client` → `@quenetiq/client`, `@dumbql/core` → `@quenetiq/core`, `@dumbql/cache` → `@quenetiq/cache`, `@dumbql/react` → `@quenetiq/react`, `@dumbql/vue` → `@quenetiq/vue`, `@dumbql/subscriptions` → `@quenetiq/subscriptions`, `@dumbql/observables` → `@quenetiq/observables`, `@dumbql/opentelemetry` → `@quenetiq/opentelemetry`, `@dumbql/dev-server` → `@quenetiq/dev-server`, `@dumbql/codegen` → `@quenetiq/codegen`
- New package **`@quenetiq/eslint-plugin-gql`** with `gql-parse` and `gql-named-operations` rules
- Build system reworked: unified `scripts/build-packages.mjs` (ng-packagr / tsc / plain-copy pipelines), `tsconfig.lint.json`, `scripts/tsconfig.ngpackagr.json`
- Generated inline `.js`/`.d.ts` artifacts purged after every package build; `.vue` SFCs and ambient shims copied into dist

### Added

- **Multi-endpoint** (`@quenetiq/core`):
  - `endpoints-config` — declarative multi-endpoint registry with per-endpoint middleware, policies and templates
  - `endpoint`, `endpoint-discovery`, `endpoint-mock`, `endpoints-providers`, `endpoints-resolver`, `endpoints-parser`, `endpoints-template`, `endpoints-validator`, `endpoints-config.types`
- **Reactive composables & loading components** (`@quenetiq/core`, `@quenetiq/vue`):
  - `abort-query` — imperative query abort helper
  - Unified `inject*` signatures with DI options (`inject-query`, `inject-mutation`, etc.)
  - Loading components: `spinner`, `skeleton`, `progress`, `dots` (Angular + Vue)
- **Cache** (`@quenetiq/cache`):
  - `watchQuery` — reactive cache updates
  - `normalizeResult()` — automatic entity extraction from query results
  - `readQuery` / `writeQuery` / `readFragment` / `writeFragment` helpers
  - `NormalizedCache.explain(typename, id)` — returns `EntityExplain` with full entity context: entity data, cache key, metadata (createdAt, updatedAt, source, mergeCount), ageMs, staleness, sizeBytes
  - `NormalizedCache.mergeDry(entity)` — dry-run merge that returns `DryMergeResult` (changedFields, previousValues, result) without applying changes
  - `CacheStore.graph()` — exports the bidirectional dependency graph: `{ forward: { queryHash → entityKeys[] }, reverse: { entityKey → queryHash[] } }`
  - `CacheStore.sizeEstimate()` — returns serialized cache size in bytes
  - `CacheStore.debug(enabled?)` — toggle structured debug logging via `CacheEvents.setLogging()`, returns unsubscribe function
  - `CrossTabSync` — BroadcastChannel-based sync between browser tabs
  - `CacheStoreConfig.crossTabSync` — enable via `{ crossTabSync: true }` or with config
  - `CacheStore.clear()` — clears cache + localState + persistence + emits `'clear'` event
  - Auto-invalidation: `write()`/`merge()`/`evict()` call `invalidateEntity()` — cached query results depending on the changed entity are cleared, triggering refetch on next read
  - `LocalEntityStorage` — per-entity localStorage with LRU eviction, metadata tracking, prefix isolation
  - `SmartPersistence` — auto-creates from `TypePolicy.ttl`, persists by entity key
- **Client** (`@quenetiq/client`):
  - `fetchPolicy` support (`cache-first`, `cache-and-network`, `network-only`, `no-cache`)
  - Type inference (`InferData`/`InferVars`), abort controller integration, middleware generics
  - `resetStore` / `clearStore`
  - Optimistic responses, `@defer`/`@stream` incremental delivery, APQ (`persisted-queries`), DevTools
  - `createSchemaMock(schema, typeMocks?)` — builds GraphQL schema from SDL, generates realistic mock data per type
  - `createSchemaFromIntrospection()` — converts introspection JSON to SDL
- **React** (`@quenetiq/react`):
  - SSR support via `getDataFromTree`
  - `useLazyQuery` hook
  - `useInfiniteQuery` with `getNextPageParam` / `mergePages`
  - Schema-aware `<MockedProvider>` (`mocks`, `schema`, `typeMocks`, `strict`, `addTypename`) with `createSchemaMock()` fallback
  - Fragment masking: `useFragment` subscribes to cache events and masks data to fragment fields
- **Vue** (`@quenetiq/vue`):
  - `useInfiniteQuery` with `getNextPageParam` / `mergePages`
  - Schema-aware `<MockedProvider>` + fragment masking (as in React)
- **Subscriptions** (`@quenetiq/subscriptions`):
  - `WsClient` connection manager with `reconnect` / `maxReconnect`
- **Mutation** (`@quenetiq/core`):
  - `refetchQueries` option for `mutate` / `injectMutation`
- **Observables** (`@quenetiq/observables`) — 6+ RxJS operators:
  - `observeEntity(store, typename, id)` — emits entity on cache changes
  - `observeQuery(store, queryHash)` — emits cached query result when any of its entity dependencies change
  - `cacheFirst(store, queryHash, fetch)` — emit cached data if available, then fetch fresh
  - `staleWhileRevalidate(store, queryHash, fetch)` — emit stale data immediately, fetch in background, swallow fetch errors when cache exists
  - `invalidateOn(store, typename, id)` — re-subscribes source Observable when watched entity changes
  - `watchQuery(store, { queryHash, fetch })` — fetch + observe cached query + re-emit on entity change
  - Debug operators: `lastValueFromCache(store, queryHash)` (Promise), `asCache(store, queryHash)` (Observable), `readHash(store, typename, id?)` (entity reader), `watchEntity(store, typename, id)` (entity observer)
- **UI**: search dialog animations, heading anchor notification, home page guard
- **Docs**: new pages — cache helpers, cross-tab sync, endpoints, pagination, subscriptions, apollo-adapter and more

### Changed

- Unified `inject*` signatures and DI options (breaking for pre-1.0.6 consumers)
- `require()` eliminated — all dynamic requires replaced with proper ESM imports (`CrossTabSync`, `SmartPersistence`)
- `TypePolicy` now supports optional `ttl` number for automatic TTL-based expiry

### Fixed

- **Cross-tab sync echo-loop (OOM)** — infinite message loop between browser tabs; fixed with a sync guard, bounded dedup ring and incoming-message validation
- Lint: **0 errors** — fixed 44 `explicit-function-return-type` and 12 `require-await` warnings
- `useFragment` tests, mock-graphql `done()` deprecation, delay extraction
- CI/release: Node 24 + `checkout@v5` compat, `corepack enable`, npm 11 workspace resolution, regenerated lockfile
- Release action auto-detects the latest `beta/*` / `rc/*` / `alpha/*` branch; per-package version/tag/skip configuration
- Deploy script fetches branches and offers interactive selection

## [1.0.5] — 2026-07-06

### Added

- **Optimistic updates** for `useMutation` (React + Vue):
  - New `optimistic(cache: CacheStore) => string` option — called before mutation, receives `CacheStore`, returns an optimistic ID
  - On success: `cache.commitOptimistic(id)` — writes optimistic update to cache
  - On error: `cache.rollbackOptimistic(id)` — reverts optimistic update
  - React: uses `useRef` to track optimistic ID across renders; commit/rollback in `.then()`
  - Vue: uses closure variable; commit/rollback after mutation resolves
- **Subscription auto-reconnect** — exponential backoff with jitter:
  - React `useSubscription`: new `reconnect`, `reconnectInterval`, `maxReconnects` options
  - Vue `useSubscription`: identical options
  - Angular `GraphqlSubscriptionService`: respects `reconnect`, `reconnectInterval`, `maxReconnectAttempts` from `SubscriptionsConfig`
  - Backoff formula: `Math.pow(2, attempt) * baseInterval` + jitter `Math.random() * 1000`
  - Cleanup: timers cleared and WebSocket unsubscribed on component unmount/destroy
- **Vue directives** (`v-dql-mutate`, `v-dql-loading`):
  - `v-dql-mutate` triggers mutation on click — accepts `{ mutation, variables, options }` value
  - `v-dql-loading` adds/removes CSS class based on loading state — usage: `v-dql-loading="'my-loading-class'"`
  - Registered via `registerDirectives(app, client)` in `createQuenetiqPlugin.install()`
  - 6 unit tests
- **Vue `useFragment`** — cache-backed fragment reading:
  - `useFragment(fragmentDoc, typename, id)` — reads from cache by `__typename` + `id`
  - Returns `ref<TData | null>` — reactive: updates when cache changes
  - Mirrors React `useFragment` API
  - 8 unit tests
- **Vue `usePrefetch`** — returns `(vars?: TVariables) => Promise<GraphQLResult<TData>>` — mirrors React `usePrefetch`
- **Vue `RateLimitGate`** — countdown banner component:
  - `defineComponent` + `h()` render function
  - Props: `isLimited`, `retryAfter`, `onRetry`, `error`
  - Countdown timer via `setInterval`, auto-triggers `onRetry` when countdown reaches 0
  - Default UI: SVG icon, "Rate limit exceeded" message, countdown in seconds
  - Customizable via `fallback` slot (named) and `default` slot
- **Vue `QueryRef` + `useReadQuery`**:
  - `useBackgroundQuery(document, variables)` now returns `QueryRef<TData>` instead of `Promise<TData>`
  - `QueryRef` interface: `data`, `error`, `loading` (reactive refs), `refetch(vars?)`, `promise`
  - `useReadQuery(queryRef)` — unwraps `queryRef.data` into a standalone reactive `Ref<TData | null>`
  - Updated tests for new `QueryRef` API
- **Angular `injectLiveQuery`**:
  - Standalone function returning `Observable<T>`
  - Uses `GraphqlLiveQuery` (from `@quenetiq/subscriptions/angular`) — initial HTTP fetch + WebSocket subscribe
  - Deferred injection via `defer()` — safe to call outside injection context
  - Cleans up subscription on `Observable` unsubscribe
- **Angular `injectQuery` / `injectMutation`**:
  - `injectQuery(document, variables?, config?)` — alias for `query()`, returns `Observable<GraphQLResult<TData>>`
  - `injectMutation(document, variables?, config?)` — alias for `mutate()`, returns `Observable<GraphQLResult<TData>>`
- **Angular `injectFragment`**:
  - `injectFragment(fragmentDoc, typename, id)` — synchronous cache lookup via `CacheService`
  - Uses `CacheService.query()` directly (not `GraphqlCacheLike` token which lacks `query()`)
  - Returns `signal<TData | null>` (Angular reactive signal)
- **Angular `injectPrefetch`**:
  - `injectPrefetch(document)` — returns `(vars?: TVariables) => Observable<GraphQLResult<TData>>`
  - Uses `defer()` to allow calling returned function outside injection context
- **Reactive `useVal`** (React + Vue):
  - Renamed from `useSmthRef` — reactive value container with null-handling utilities
  - API: `nullify()`, `isNull()`, `isEmpty()`, `reset()`, `tap(fn)`, `swap(v)`, `orElse(fallback)`, `match(onSome, onNone)`, `toJSON()`
  - React: wraps `useRef` + `useState`
  - Vue: wraps `ref()` + `Val` class from `@quenetiq/client`
- **Client tests** — new test files:
  - `client.spec.ts` — 34 tests: construction, query, mutation, middleware pipeline, error handling, retry, cache integration, polling, WebSocket subscription
  - `middleware.spec.ts` — 21 tests: middleware registration, execution order, error propagation, retry middleware, auto-mock
- **React tests** — new test files:
  - `use-mutation.spec.tsx` — 4 optimistic update tests (commit, rollback, with error)
  - `use-subscription.spec.tsx` — 7 reconnect tests (exponential backoff, max reconnects, cleanup)
- **Vue tests** — new test files:
  - `use-mutation.spec.ts` — 7 tests (optimistic, error rollback, cache update)
  - `use-subscription.spec.ts` — 9 tests (reconnect, backoff, max attempts, cleanup)
  - `use-fragment.spec.ts` — 8 tests (basic, missing, cache change)
- **Middleware docs** — 5 missing sections added:
  - `autoMock` — schema-driven mock data generation
  - `errorHandler` — custom error handling middleware
  - `rateLimit` — client-side rate limiting
  - `dedup` — in-flight request deduplication
  - `costEstimation` — query cost estimation
- **All docs update** — every framework/package doc page updated with:
  - API entries for all new composables, hooks, directives, components
  - Version label `v1.0.5` (was `v1.0.5-beta.3`)
  - Reactive `useVal` replaces `useSmthRef` references
  - Optimistic update and subscription reconnect option documentation

### Changed

- Branch renamed from `feature/opentelemetry-tracing` to `beta/v1.0.5`.
- `useSmthRef` renamed to `useVal` across React and Vue — all imports and re-exports updated.
- `useBackgroundQuery` (Vue) return type changed from `Promise<TData>` to `QueryRef<TData>` — existing callers must use `.promise` or destructure `data`/`error`/`loading` reactive refs.
- `GraphqlSubscriptionService` (Angular) — `subscribe()` now accepts `reconnect`, `reconnectInterval`, `maxReconnectAttempts` from `SubscriptionsConfig`. Without `reconnect: true`, behavior is unchanged.
- `npm_tag: auto` now derives dist-tag from version bump type (`rc`/`beta`/`alpha` → that tag, `patch`/`minor`/`major` → `latest`).
- **Build order**: `errors → cache → client → core → ...` — `cache` and `client` built before `core` to resolve ng-packagr dependency chain.
- **Circular dependency resolution**:
  - `GRAPHQL_CACHE` token moved from `@quenetiq/core` → `@quenetiq/cache` (new `tokens.ts`)
  - `Val`, `walkObject`, `extractOpName` inlined into `@quenetiq/core` (removed `core → @quenetiq/client` import)
  - `@quenetiq/core` re-exports `{ GRAPHQL_CACHE, GraphqlCacheLike }` from `@quenetiq/cache`
  - Peer deps: `@quenetiq/cache` removed `@quenetiq/core` peer dep; `@quenetiq/core` added `@quenetiq/cache` (optional) peer dep
- **CI/CD publishing**:
  - Release workflow triggers on `push` to `rc`, `beta`, `alpha` branches (in addition to `workflow_dispatch`)
  - Single `npm_tag` input replaces 19 per-package `tag_*` dropdowns — options: `auto`, `latest`, `rc`, `beta`, `alpha`, `skip`
  - `body_path: CHANGELOG.md` — full changelog in release body instead of extracted section
  - "Resolve workflow inputs" step derives version, npm tag, and branch from event type (push vs dispatch)

### Fixed

- **Build pipeline** — all 19 packages now build successfully:
  - `cache`, `client`, `core`, `dev-server`, `fragments`, `downloader`, `codegen`, `ssr`, `subscriptions`, `middlewares`, `pagination`, `persisted-queries`, `file-upload`, `debugging`, `testing`, `apollo-adapter`, `opentelemetry`, `react`, `vue`
  - Build order `cache → client → core` ensures cross-package symlinks exist before compilation
- **`@quenetiq/client` package.json** — reverted `main`/`types`/`exports` from `./public-api.js` back to `./src/public-api.ts` so that workspace symlink resolution works correctly in CI (no dist directory).
- **Build script** — new `fixDistPackageJson()` transforms source paths (`./src/X.ts` → `./X.js`/`.d.ts`) when copying `package.json` to dist, so published packages have correct compiled output paths.
- **`react/null-overlay.tsx`** — TS4111: bracket notation (`styles[key]`) for index-signature `Record` access
- **`react/use-query.ts`** — TS7006: explicit `GraphQLResult<TData>` type annotation for `res` parameter
- **`vue/rate-limit-gate.ts`** — TS4111: bracket notation (`this.$slots['default']`) for index-signature `Slots` access
- **`vue/use-val.ts`** — TS2352: double cast `as unknown as VueVal<T>` for incompatible ref types
- **`client/package.json`** — build script now correctly transforms source `./src/public-api.ts` paths to dist `./public-api.js`/`.d.ts` paths for all TSC packages

## [1.1.6] — 2026-07-01

### Added

- **`@quenetiq/dev-server` `--static` flag** — serve pre-built static files instead of proxying to a dev server.
  - Usage: `quenetiq-dev --port 4200 --static dist/browser`
  - All PNA/CORS headers are applied to static responses

### Changed

- **StackBlitz starters** — `quenetiq-dev` starts immediately, loads loading page while `ng build` / `vite build` runs in background via `spawn.cmd` config. When build completes, static files are served automatically.
  - `package.json` start: just `quenetiq-dev --port 4200`
  - `quenetiq.config.json`: `{ spawn: { cmd: "ng build" }, staticDir: "dist/browser" }`
  - No dev server (ng serve/vite) involved — prevents the "port answers before build ready" race condition
  - No hardcoded localhost URLs — all traffic through StackBlitz public HTTPS URL, no PNA block

### Fixed

- **StackBlitz preview white page** — credentialless iframe blocks all `localhost:*` requests at the browser level (PNA). Build + static approach keeps all traffic on a single container port through StackBlitz's HTTPS proxy. quenetiq-dev starts immediately so the port is always open, serving loading page until build finishes.

## [1.1.7] — 2026-07-01

### Changed

- **`staticDir` auto-detection** — when `staticDir` is set, the server now checks both `index.html` and `browser/index.html` inside the directory. Handles both Angular output structures (`dist/` or `dist/browser/`).

## [1.1.5] — 2026-07-01

### Added

- **Proxy content-aware buffering** — proxy now buffers HTML responses and checks for meaningful content before forwarding. If `ng serve`/Vite returns an empty stub page (as happens during initial build), the proxy shows the loading page instead.

## [1.1.4] — 2026-07-01

### Added

- **`@quenetiq/dev-server` `--static` flag** — initial implementation.

## [1.1.3] — 2026-07-01

### Added

- **`@quenetiq/dev-server`** — unified development server with mock GraphQL backend + proxy to any frontend dev server:
  - CLI — `npx quenetiq-dev --proxy http://localhost:4200`
  - Configuration via `quenetiq.config.json` with inline schema support
  - `createDevServer()` / `startDevServer()` programmatic API
  - `--rewrite` flag for URL rewriting in StackBlitz/Codespaces/WebContainers (PNA fix)
  - Auto-detection of StackBlitz, Codespaces, and local environments via `env-analyzer.ts`
- **`@quenetiq/dev-server` docs page** — `/docs/dev-server` with CLI options, config example, and API reference
- **Per-package "since" badge** — each package page now shows the version it was introduced (e.g., `since v0.0.1` or `since v1.1.0`)
- **Zoneless Angular starter** — switched from `provideZoneChangeDetection` to `provideZonelessChangeDetection()`, removed `zone.js` dependency
- **Improved starters** — `start` command simplified to just `quenetiq-dev` (spawn.cmd handles frontend server), version ranges bumped to latest

### Changed

- File-based starters (angular/react/vue) now use `quenetiq-dev` as the sole start command instead of separate terminals
- Version dropdown migrated to `tuiComboBox` with read-only input, docs-themed styling
- Non-existent versions removed from version selector (0.0.9, 0.0.11, 0.0.12, 0.0.2-rc.1, 0.0.2-rc.2)
- `@quenetiq/dev-server` version bumped `^1.0.0` → `^1.1.3` in all starters

### Fixed

- **CI `package-lock.json`** — regenerated lock file to remove stale workspace symlink entries that caused `npm ci` to fail with "Missing: @quenetiq/cache@1.0.3 from lock file"
- **StackBlitz preview fix** — all three StackBlitz starters (Angular, React, Vue) now start with just `quenetiq-dev` and spawn the frontend dev server internally via `spawn.cmd`. StackBlitz auto-detects port 4000 first, so the preview opens through the proxy with URL rewriting enabled (`proxy.rewrite: true`), avoiding PNA/CORS blocks from `credentialless` iframes
- **URL rewriting** — proxy now uses `ProxyConfig.target` dynamically instead of hardcoded `localhost:4200`, works for any frontend framework (React/Vue/Angular)
- **Version service** — `allVersions` list updated to include `1.1.x` releases

## [0.0.3-rc.1] — 2026-06-30

### Added

- **FieldPolicy (typePolicies) support** in `@quenetiq/cache`:
  - `TypePolicy` interface with `keyFields` (composite keys via dot-separated values) and custom `merge` functions
  - `NormalizedCache.setTypePolicies()` — configure policies at runtime
  - `CacheStore.setTypePolicies()` / `CacheService.setTypePolicies()` — wired through the stack
  - Angular `cacheMiddleware` wires `typePolicies` from `QuenetiqConfig.cache.typePolicies` on first request (guarded by `WeakSet<Injector>`)
  - Client `cacheMiddleware` wires `typePolicies` from `CacheConfig.typePolicies` eagerly
  - 8 FieldPolicy tests in `src/app/cache/field-policy.spec.ts`
- **`@quenetiq/codegen` CLI** — `npx quenetiq-codegen` with flags:
  - `--watch` / `-w` — watches `schema.json` and `.graphql` files, regenerates on change with 300ms debounce
  - `--schema-only` — only generate schema types from `schema.json`
  - `--documents-only` — only generate typed documents from `.graphql` files
  - `--config, -c <path>` / `--output, -o <dir>` / `--help`
- **Typed documents from `.graphql` files** — `findGraphqlFiles()`, `parseGraphqlFile()`, `generateTypedDocumentsCode()`, `generateIndexCode()` API
- **`generateTypedDocumentsCode`** now accepts `string` (full TS source, auto-extracts type names) in addition to `string[]`
- **`tools/generate-types.mjs`** refactored to use `@quenetiq/codegen` library instead of duplicating schema generation / merge logic; now generates typed documents from `.graphql` files

### Changed

- Version bumped from `0.0.2-rc.4` → `0.0.3-rc.1` across all 18 packages

## [0.0.2-rc.4] — 2026-06-29

### Added

- **React/Vue hooks v2** — all three hooks (`useQuery`, `useMutation`, `useSubscription`) now accept an options object with:
  - `onCompleted` / `onError` callbacks for side effects
  - `errorCode` in return value for typed error handling
  - `useQuery`: `networkStatus`, `called`, `fetchMore`, `pollInterval`, `skip` options
  - `useMutation`: `called`, `update` callback (writes to cache after mutation), `errorCode`
  - `useSubscription`: `onNext`, `onComplete` callbacks, `errorCode`
- **`useLiveQuery`** — new hook for React and Vue that executes an initial HTTP query then opens a WebSocket subscription for real-time updates. Accepts `onCompleted`/`onError` callbacks, `wsEndpoint`, `shouldSubscribe` options.
- **`GraphqlLiveQuery`** — framework-agnostic class in `@quenetiq/subscriptions` that does initial fetch + WebSocket subscription for live queries
- **DevTools Panel** — in-app overlay for debugging (`@quenetiq/debugging`):
  - Toggle with `Ctrl+Shift+D`
  - **Queries tab** — history with timing, type, status, fields, operation name
  - **Cache tab** — normalized cache snapshot with typename, id, fields
  - **Errors tab** — filtered error entries
  - `provideDevToolsPanel()` provider, `<quenetiq-devtools-panel>` component
- **`getCacheService()`** — public method on `QuenetiqClient` to access the underlying `CacheStore` (needed for mutation `update` callbacks)
- **`@quenetiq/apollo-adapter`** — migration helper package:
  - `fromApolloCache()` — wraps Apollo InMemoryCache into a CacheStore-compatible interface
  - `createMigrationGuide()` — returns a map of Apollo→Quenetiq API equivalents
- **Apollo adapter** added to build order in `scripts/build-packages.mjs`

### Changed

- **Backward-incompatible**: `useQuery`, `useMutation`, `useSubscription` in `@quenetiq/react` and `@quenetiq/vue` now accept an options object as second argument instead of positional `variables`. Update: `useQuery(doc, { variables })` instead of `useQuery(doc, variables)`.
- Version bumped from `0.0.2-rc.2` → `0.0.2-rc.4` across all 19 packages

## [0.0.2-alpha.1] — 2026-06-29

### Added

- **`@quenetiq/errors`** — typed error classes for GraphQL, network, cache, validation errors with `ErrorHandler` (#542e556)
  - `QuenetiqError` — base class with `code`, `timestamp`, `context`, `toJSON()`
  - `GraphQLError` — server-side GraphQL errors (locations, path, extensions)
  - `NetworkError` — network failures (timeout, offline, HTTP, DNS, abort)
  - `CacheError` — cache issues (miss, serialization, GC, persistence)
  - `ValidationError` — client validation (missing variables, invalid query, type mismatch)
  - `ErrorHandler` — middleware-style handler: `on(code, fn)` with async `handle(error)`
- **`errorCode` on results** — `GraphQLResult` error variant now has `errorCode?: ErrorCode` field (`'NO_DATA' | 'GRAPHQL_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN'`) for easy switching on error type (#542e556)
- **`errorHandler` config option** — `errorHandler?: { handle(error: unknown): boolean | Promise<boolean> }` in both `@quenetiq/core` (`GraphqlCoreConfig`) and `@quenetiq/client` (`ClientConfig`), called before `onError` callback (#542e556)
- **`errorHandlerMiddleware()`** — new middleware in `@quenetiq/middlewares` that catches pipeline errors and routes through custom handler (#542e556)

### Fixed

- **CI release workflow** — two bugs fixed (#a10da8d):
  - `scripts/build-packages.mjs`: `linkPackage()` now creates `node_modules/@quenetiq/` parent directory before symlink (crashed on fresh CI)
  - `.github/workflows/release.yml`: `require()` paths prefixed with `./` — without it Node.js resolves them as module names, not relative paths
- **`scripts/version.mjs`** — dry-run no longer writes files (previous behavior wrote to dist even with `--dry-run`)
- **GraphQLResult type** — error variant no longer includes nullable `data` field when server returns `{"data": null, "errors": [...]}` (already worked correctly, confirmed by review)

### Changed

- Version bumped from `0.0.2-rc.2` → `0.0.2-alpha.1` across all 17 packages
- README updated with auto-mock, prefetch, playground, starters as adoption reasons

### Starters

- **React StackBlitz starter** at `starters/react/` — Vite + React 18 + `@quenetiq/react` + mock backend
- **Vue StackBlitz starter** at `starters/vue/` — Vite + Vue 3 + `@quenetiq/vue` + mock backend
- Docs getting-started replaced "coming soon" placeholders with live StackBlitz links

## [0.0.2-rc.2] — 2026-06-29

### Added

- **Auto-mock middleware** — `autoMockMiddleware(config)` in `@quenetiq/middlewares` — schema-driven or heuristic mock data generation with custom resolvers, simulated delay, and passthrough mode
- **Prefetch resolver** — `prefetchedRoute(route, prefetch)` and `fromPrefeched(route, key)` in `@quenetiq/core` — Angular Router `ResolveFn` that executes queries before route activation, resolves data into `ActivatedRoute.data`
- **GraphQL Playground** at `/playground` — standalone component with query/variables/headers editors, execute button, JSON response viewer, execution history
- NPM_TOKEN added to GitHub repo secrets

### Changed

- Version bumped from `0.0.2-rc.1` → `0.0.2-rc.2` across all 16 packages

## [0.0.2-rc.1] — 2026-06-28

### Added

- Initial public release candidate
- `@quenetiq/cache` — normalized in-memory entity cache with GC, persistence, optimistic updates
- `@quenetiq/core` — Angular GraphQL service with middleware pipeline, directives, pipes
- `@quenetiq/client` — framework-agnostic GraphQL client
- `@quenetiq/react` — React bindings
- `@quenetiq/vue` — Vue bindings
- 12 additional packages: codegen, debugging, downloader, file-upload, fragments, middlewares, pagination, persisted-queries, ssr, subscriptions, testing
