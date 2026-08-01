# Quenetiq — The GraphQL Client That Actually Understands Your Framework

> **Framework-native GraphQL client. ~10KB core, 12 modular packages. Built for Angular, React, and Vue — not ported from another framework. Zero-boilerplate. Signals-ready.**

<p align="center">
  <a href="https://github.com/Quenetiq/quenetiq/actions/workflows/release.yml">
    <img src="https://github.com/Quenetiq/quenetiq/actions/workflows/release.yml/badge.svg?branch=beta%2F1.0.6" alt="Release"/>
  </a>
  <a href="https://codecov.io/gh/Quenetiq/quenetiq">
    <img src="https://img.shields.io/codecov/c/github/Quenetiq/quenetiq" alt="codecov"/>
  </a>
  <a href="https://www.npmjs.com/package/@quenetiq/core">
    <img src="https://badge.fury.io/js/@quenetiq%2Fcore.svg" alt="npm version"/>
  </a>
</p>

**If you're tired of:**

> - Framework bindings that lag 6 months behind every major release
> - Fighting React idioms (`MockedProvider`, render props) in Angular tests
> - Installing 3 third-party packages just to upload a file
> - Writing 50 lines of `typePolicies` to make normalized cache work
> - Hearing "it works in React, we'll port it later"

**Quenetiq fixes all of this. One `npm install` and you're done.**

<p align="center">
  <img src="./public/logos/logo.png" alt="Quenetiq" width="120"/>
  <br/>
  <a href="#quick-start">Quick Start</a> •
  <a href="#why-choose-quenetiq">Why Quenetiq?</a> •
  <a href="#comparison">Comparison</a> •
  <a href="#package-architecture">Packages</a> •
  <a href="#configuration">Configuration</a>
</p>

---

## Quick Start

**Angular:**

```bash
ng new my-app --standalone
ng add @quenetiq/core
npm start
```

**React:**

```bash
git clone https://github.com/Quenetiq/quenetiq
cd quenetiq/starters/react
npm install && npm start
```

**Vue:**

```bash
git clone https://github.com/Quenetiq/quenetiq
cd quenetiq/starters/vue
npm install && npm start
```

**Or open in StackBlitz:**

- [Angular](https://stackblitz.com/~/github.com/Quenetiq/quenetiq/tree/main/starters/angular)
- [React](https://stackblitz.com/~/github.com/Quenetiq/quenetiq/tree/main/starters/react)
- [Vue](https://stackblitz.com/~/github.com/Quenetiq/quenetiq/tree/main/starters/vue)

```typescript
// app.config.ts
import { provideQuenetiq } from '@quenetiq/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig = {
	providers: [provideHttpClient(), provideQuenetiq({ endpoint: '/graphql' })],
};
```

```typescript
// user.component.ts
import { GraphqlService, gql, isSuccess } from '@quenetiq/core';

const GET_USER = gql`
	{
		getUser {
			id
			name
			email
		}
	}
`;

@Component({
	selector: 'app-user',
	template: `{{ (gql.query(GET_USER) | async)?.data?.getUser?.name }}`,
	standalone: true,
})
export class UserComponent {
	gql = inject(GraphqlService);
}
```

> **That's it.** No `ApolloModule.forRoot()`. No `graphql-tag` dependency. No framework wrappers. Just your framework.

**Why developers add Quenetiq:**

> - **Auto mock** — prototype without a backend. `autoMockMiddleware()` generates realistic data from your schema
> - **Prefetch** — `prefetchedRoute()` resolves GraphQL data **before** Angular activates the route
> - **Playground** — built-in GraphQL query editor at `/playground` in the docs site
> - **No lock-in** — React, Vue, and Angular with the same core. Starters ready in one click

---

## Why Choose Quenetiq?

Most GraphQL clients are built for one framework and awkwardly ported to others. Quenetiq started as a framework-native library from day one — Angular-first, then React and Vue.

**You should choose Quenetiq if you value:**

- **Zero boilerplate normalized cache** — no `typePolicies`, no `keyFields`, no `merge` functions. Just `__typename` + `id` and it works.
- **Built-in middleware ecosystem** — auth refresh, retry, offline queue, auto mock, APQ, batching. No third-party packages needed.
- **Framework-native design** — Angular Signals, React hooks v2 with options object, Vue composables. Not wrappers around a core — each framework gets its own ergonomic API.
- **Offline-first mindset** — mutation queue with localStorage persistence, auto-replay on reconnect, optimistic update rollback.
- **Debugging without extensions** — built-in DevTools panel for query inspection, cache snapshot, error timeline. Ship it to staging, not just local dev.
- **Type safety without a build step** — phantom-typed `DocumentNode` with result + variables inference. Optional codegen for the full schema.
- **Live Queries** — `useLiveQuery` for real-time data with WebSocket fallback. First-class support across all frameworks.

**And you should NOT choose Quenetiq if:**

- You need a mature ecosystem with 1000+ community packages (Apollo has this)
- You're tied to Relay's compiler-based data masking
- You prefer one massive all-in-one package over modular composition

---

## What Quenetiq Does That Others Can't

| Feature                                       | Apollo Angular                                           | `graphql-request`                        | URQL                                             | Relay                                            | **Quenetiq**                              | Why it matters                                                           |
| --------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------ |
| **Angular-native (not a React port)**         | ❌ Port of `@apollo/client` — lags behind React releases | ❌ Fetch-based, no framework integration | ❌ React-first — Angular is community-maintained | ❌ React-only — no Angular support at all        | **✅ Built for Angular from day one**     | Same-day Angular 22+ support. No waiting for React compatibility fixes   |
| **Signals support**                           | ❌ RxJS only — no Signals integration                    | ❌ Not applicable                        | ❌ Wonka streams only                            | ❌ No reactive primitives                        | **✅ `query()` returns `Signal<T>`**      | Zone-less Angular. Fine-grained reactivity. Less boilerplate             |
| **File uploads**                              | ❌ Requires `apollo-upload-client` (unmaintained)        | ❌ Manual FormData                       | ❌ Requires `@urql/exchange-multipart`           | ❌ Not supported                                 | **✅ `@quenetiq/file-upload`**            | One `npm install`. Auto `File`/`Blob` detection                          |
| **Offline mutation queue**                    | ❌ Not built-in                                          | ❌ Not built-in                          | ❌ Not built-in                                  | ❌ Not built-in                                  | **✅ `offlineQueueMiddleware`**           | Queue to localStorage. Auto-replay on reconnect                          |
| **Auth refresh middleware**                   | ❌ Manual custom Link                                    | ❌ Not built-in                          | ⚠️ `@urql/exchange-auth`                         | ❌ Custom network layer                          | **✅ `authRefreshMiddleware`**            | Queues pending requests during refresh. Retry support                    |
| **Testing utilities**                         | ❌ `MockedProvider` (React wrapper in Angular tests)     | ❌ Manual mock                           | ❌ No Angular test utils                         | ❌ No Angular test utils                         | **✅ `@quenetiq/testing`**                | `MockGraphqlService` plugs into `TestBed`. FIFO queue                    |
| **Built-in debugging (no browser extension)** | ❌ Requires Chrome Apollo DevTools                       | ❌ Not built-in                          | ❌ Requires URQL DevTools                        | ❌ Requires Relay DevTools                       | **✅ `@quenetiq/debugging`**              | Query tree, timing chart, entity inspector — in-app. No extension needed |
| **Schema downloader CLI**                     | ❌ Not built-in                                          | ❌ Not built-in                          | ❌ Not built-in                                  | ❌ Not built-in                                  | **✅ `@quenetiq/downloader`**             | `npm run schema:download` — one command                                  |
| **Persisted queries (SHA-256 APQ)**           | ❌ Requires `apollo-link-persisted-queries`              | ❌ Not built-in                          | ⚠️ Built-in                                      | ✅ Built-in                                      | **✅ Built-in**                           | Smaller network payloads. Automatic fallback on hash miss                |
| **Zero-config normalized cache**              | ❌ Complex `typePolicies` setup needed                   | ❌ No cache                              | ❌ Document cache by default                     | ❌ Requires `Node` interface + `Connection` spec | **✅ Auto `__typename:id` normalization** | Works out of the box. No schema changes required                         |
| **Request batching**                          | ❌ Requires separate link                                | ❌ Not built-in                          | ❌ Not built-in                                  | ❌ Not built-in                                  | **✅ Built-in (configurable window)**     | Fewer HTTP requests. 50ms default batch window                           |
| **Optimistic updates with snapshot rollback** | ❌ Complex with cache.evict                              | ❌ Not built-in                          | ❌ Not built-in                                  | ✅ Built-in                                      | **✅ Cache snapshot/commit/rollback**     | Safe optimistic UI. One method to roll back all changes                  |
| **CLI setup (`ng add`)**                      | ✅ Since Apollo Angular v9                               | ❌ Not applicable                        | ❌ Not applicable                                | ❌ Not applicable                                | **✅ `ng add @quenetiq/core`**            | Interactive prompts. Auto-generates config file                          |
| **Auto mock (no backend needed)**             | ❌ Not built-in. Manual mocking per test                 | ❌ Not built-in                          | ❌ Not built-in                                  | ❌ Not built-in                                  | **✅ `autoMockMiddleware`**               | Schema → mock data. Zero-config prototyping. Optional passthrough        |
| **Router data prefetch**                      | ❌ Complex custom resolvers                              | ❌ Not built-in                          | ❌ Not built-in                                  | ✅ Relay compiler handles this                   | **✅ `prefetchedRoute()`**                | Angular Router resolver. Data ready before component renders             |
| **GraphQL Playground (in-app)**               | ❌ Separate Apollo Studio                                | ❌ Not built-in                          | ❌ Separate GraphQL playground                   | ❌ Requires separate tools                       | **✅ `/playground` route**                | Interactive query editor with history. Built into docs site              |
| **React + Vue + Angular**                     | ⚠️ Angular port lags behind React                        | ❌ Fetch API only (no framework binding) | ❌ React-first, Angular community-maintained     | ❌ React-only                                    | **✅ First-class bindings**               | Same core, same DX across all frameworks. One StackBlitz per framework   |

---

## Comparison: Why Not Apollo, URQL, or Relay?

| Problem                         | Apollo Client                                                                                      | `graphql-request`                                 | URQL                                                                                                             | Relay                                                                                      | **Quenetiq**                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bundle Size**                 | ~50KB+ gzipped — heavy default with `graphql-tag` re-exports preventing tree-shaking               | **~5KB** — minimal, fetch-only                    | ~10KB base, but normalized cache is separate (+8KB)                                                              | ~45KB (66KB with React bindings)                                                           | **~10KB core**. Modular packages — only load what you use. No tree-shaking issues                                                                         |
| **Cache Update After Mutation** | Manual `cache.modify`/`update`/`refetchQueries` on every mutation. Easy to forget, causes stale UI | ❌ No cache — manual refetch after every mutation | Auto-invalidates queries with same types — but can over-invalidate (v7 bug) causing unnecessary network requests | Automatic via updaters + compiler — but requires strict Connection/Node schema conventions | **Dual strategy**: cache middleware auto-extracts entities and merges them. Mutations evict related cache keys forcing refetch. No manual `update` needed |
| **Normalized Cache Setup**      | Complex `typePolicies` with `keyFields`, `merge` functions for every type                          | ❌ No cache                                       | Document cache default is too simple. Graphcache requires separate package + schema config                       | Built-in but requires global ID (Node interface) + Connection spec                         | **Zero-config**: `__typename` + `id`/`_id` auto-detection. Automatic entity normalization and merge. Optional `typePolicies` for advanced cases           |
| **Pagination**                  | Manual `relayStylePagination()` + custom merge logic per field                                     | ❌ Not built-in                                   | No built-in pagination — custom logic required                                                                   | Connection spec only — rigid, non-negotiable                                               | **Built-in cursor + offset pagination** helpers with merge functions. Configurable limit, debounce                                                        |
| **Offline Support**             | Requires `apollo-cache-persist` (third-party). No mutation queue                                   | ❌ Not built-in                                   | Requires `@urql/exchange-graphcache` + storage layer. Mutation queue needs custom logic                          | `react-relay-offline` adds 16KB. Best offline mutations                                    | **Built-in offline queue middleware**. Queue persistence to localStorage. Auto-replay on reconnect. Configurable max queue size                           |
| **Auth Token Refresh**          | No built-in refresh flow. Requires custom `Link`                                                   | ❌ Not built-in                                   | `@urql/exchange-auth`                                                                                            | Custom network layer                                                                       | **Built-in `authRefreshMiddleware`**. Queues pending requests during refresh. Customizable trigger statuses, retry attempts, header name                  |
| **DevTools**                    | Apollo DevTools (Google Chrome extension). Requires GraphOS for advanced features                  | ❌ Not built-in                                   | URQL DevTools (basic)                                                                                            | Relay DevTools (basic)                                                                     | **Built-in browser extension** (Chrome + Firefox). Schema visualization, request timeline, entity inspection, field tree parsing                          |
| **File Uploads**                | Requires `apollo-upload-client` (third-party)                                                      | ❌ Manual FormData                                | Built-in via `@urql/exchange-multipart`                                                                          | Not supported                                                                              | **Built-in `UploadService`**. Full GraphQL multipart request spec. Auto-detection of `File`/`Blob` in variables                                           |
| **Type Safety**                 | Optional codegen. Runtime type inference                                                           | ❌ Manual typing                                  | Optional codegen. Simple generics                                                                                | Compiler-generated (best-in-class but requires build step)                                 | **Typed `DocumentNode`**. Phantom types for result + variables. Custom codegen CLI. Generated types from introspection JSON                               |
| **SSR**                         | Full support but manual transfer state setup                                                       | ❌ Not built-in                                   | Good support                                                                                                     | Built-in but React-only                                                                    | **SSR streaming + `TransferState` integration**. Server-to-browser cache transfer. Platform-aware save/restore                                            |
| **Subscriptions**               | Supported via WebSocket (`subscriptions-transport-ws`/`graphql-ws`)                                | ❌ Not built-in                                   | Separate `@urql/exchange-subscriptions`                                                                          | Limited                                                                                    | **Built-in `GraphqlSubscriptionService`**. `graphql-transport-ws` protocol. Standalone `subscribe()` function. DevTools integration                       |
| **Error Handling**              | `errorPolicy` (`none`/`all`/`ignore`) — but type narrowing is tricky (`data` can be `undefined`)   | ❌ Manual try/catch                               | Error policy via exchanges. `data: null` on schema mismatch                                                      | Error boundaries + Suspense                                                                | **Three error policies**. Optional notification service integration (Taiga UI, Material, etc.). Type-safe `GraphQLResult<T>` discriminated union          |
| **Reactive Local State**        | Reactive variables (since v3)                                                                      | ❌ Not built-in                                   | No built-in. Must use external state                                                                             | `RelayStore` but server-data only                                                          | **`ReactiveVar` / `makeVar()`** — wraps `BehaviorSubject`. Client directive middleware for `@client` fields. Local resolver support                       |
| **Persisted Queries (APQ)**     | `apollo-link-persisted-queries` (third-party)                                                      | ❌ Not built-in                                   | `@urql/exchange-persisted`                                                                                       | Built-in (auto-generated by compiler)                                                      | **Built-in `apqMiddleware`**. SHA-256 hashing with fallback. Automatic hash registration on `PersistedQueryNotFound`                                      |
| **Retry Logic**                 | Built-in `RetryLink` (exponential backoff)                                                         | ❌ Not built-in                                   | `@urql/exchange-retry`                                                                                           | Built-in                                                                                   | **Built-in `retryExchange`** with exponential backoff + jitter. Custom `shouldRetry` callback. Configurable exponent, max delay                           |
| **Focus Refetch**               | Not built-in. Requires custom implementation                                                       | ❌ Not built-in                                   | `@urql/exchange-refocus`                                                                                         | Not built-in                                                                               | **Built-in `focusRefetchMiddleware`**. `visibilitychange` + `window.focus` support. Configurable stale time                                               |
| **Request Batching**            | `apollo-link-batch-http`                                                                           | ❌ Not built-in                                   | Not built-in                                                                                                     | Third-party                                                                                | **Built-in batching**. Configurable `batchWindow` (default 50ms). Automatic batch flush                                                                   |
| **Request Deduplication**       | Built-in                                                                                           | ❌ Not built-in                                   | Not built-in                                                                                                     | Not needed (compiler)                                                                      | **Built-in dedup**. `shareReplay(1)`-based. Automatic cache key management                                                                                |
| **Testing**                     | `MockedProvider` + `MockLink` — complex setup                                                      | ❌ Manual mocking                                 | `mockExchange`                                                                                                   | `RelayMockEnvironment` — steep learning curve                                              | **`MockGraphqlService`**. Simple `when(query, result)` API. FIFO response queue. Optional simulated delay                                                 |
| **Angular Integration**         | React-first port (Apollo Angular is a wrapper). Lags behind React version                          | ❌ Not applicable (fetch-only)                    | React-only                                                                                                       | React-only                                                                                 | **Angular-native**. Standalone components, Signals-compatible, SSR with `TransferState`, `@Injectable` services, pipes, `ng add` schematics               |
| **CLI Setup**                   | Create client manually (ng-add added in v9)                                                        | ❌ Not applicable                                 | Create client manually                                                                                           | Requires compiler setup                                                                    | **`ng add @quenetiq/core`**. Interactive prompts. Auto-generates `quenetiq.config.ts`                                                                     |
| **Learning Curve**              | Moderate (basic) → Steep (advanced cache)                                                          | **Lowest** — just fetch() calls                   | Low — most approachable                                                                                          | Very steep (3-5x Apollo)                                                                   | **Low**. Familiar `HttpClient`-based. Intuitive discriminated union results                                                                               |

---

## Package Architecture

Quenetiq is organized as a set of scoped npm packages under `@quenetiq/*`. Each package lives in `projects/quenetiq/<name>` and has its own README.

| Package                       | Description                                                                   | README                                                  |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| `@quenetiq/core`              | Central GraphQL client — query, mutate, middleware, pipes, directives, config | [README](projects/quenetiq/core/README.md)              |
| `@quenetiq/client`            | Framework-agnostic core — `createClient`, `gql`, middleware, helpers, `Val`   | [README](projects/quenetiq/client/README.md)            |
| `@quenetiq/cache`             | Normalized entity cache with GC, persistence, optimistic updates              | [README](projects/quenetiq/cache/README.md)             |
| `@quenetiq/ssr`               | Server-Side Rendering — TransferState cache transfer + streaming              | [README](projects/quenetiq/ssr/README.md)               |
| `@quenetiq/subscriptions`     | WebSocket GraphQL subscriptions (graphql-transport-ws)                        | [README](projects/quenetiq/subscriptions/README.md)     |
| `@quenetiq/fragments`         | Type-safe fragment definitions, composition, data access                      | [README](projects/quenetiq/fragments/README.md)         |
| `@quenetiq/middlewares`       | Auth refresh, retry, focus refetch, offline queue, auto mock                  | [README](projects/quenetiq/middlewares/README.md)       |
| `@quenetiq/pagination`        | Cursor + offset pagination helpers with merge functions                       | [README](projects/quenetiq/pagination/README.md)        |
| `@quenetiq/persisted-queries` | Automatic Persisted Queries (APQ) with SHA-256 hashing                        | [README](projects/quenetiq/persisted-queries/README.md) |
| `@quenetiq/file-upload`       | Multipart file upload (graphql-multipart-request-spec)                        | [README](projects/quenetiq/file-upload/README.md)       |
| `@quenetiq/debugging`         | Operation recording, field tree parsing, timing charts                        | [README](projects/quenetiq/debugging/README.md)         |
| `@quenetiq/testing`           | Mock GraphQL backend for unit tests                                           | [README](projects/quenetiq/testing/README.md)           |
| `@quenetiq/errors`            | Typed error hierarchy — `GraphQLError`, `NetworkError`, `CacheError`, handler | [README](projects/quenetiq/errors/README.md)            |
| `@quenetiq/downloader`        | Schema introspection downloader (Node.js CLI)                                 | [README](projects/quenetiq/downloader/README.md)        |
| `@quenetiq/codegen`           | TypeScript codegen from GraphQL schema + `.graphql` files                     | [README](projects/quenetiq/codegen/README.md)           |
| `@quenetiq/dev-server`        | Unified mock GraphQL + proxy dev server (CLI + API)                           | [README](projects/quenetiq/dev-server/README.md)        |
| `@quenetiq/react`             | React bindings — `useQuery`, `QuenetiqProvider`                               | [README](projects/quenetiq/react/README.md)             |
| `@quenetiq/vue`               | Vue 3 bindings — `useQuery`, `createQuenetiqPlugin`                           | [README](projects/quenetiq/vue/README.md)               |
| `@quenetiq/apollo-adapter`    | Apollo Cache migration — `fromApolloCache`, `FromApolloCacheOptions`          | [README](projects/quenetiq/apollo-adapter/README.md)    |
| `@quenetiq/opentelemetry`     | OpenTelemetry tracing — W3C Trace Context, middleware, exporters, Angular     | [README](projects/quenetiq/opentelemetry/README.md)     |

---

## Features Overview

### `@quenetiq/core` — Core (~10KB)

- `GraphqlService` — query, mutate, refetch, poll, setEndpoint
- Middleware pipeline — auth, logging, devtools, cache
- Standalone functions — `query()`, `mutate()`, `refetch()`, `poll()` (inject-free)
- Result helpers — `isSuccess`, `isError`, `unwrap`, `unwrapOrThrow`, `mapResult`
- `gql` tag — `parse()`-based DocumentNode creation
- `TypedDocumentNode<TResult, TVars>` — phantom-typed documents
- Config system — `QuenetiqConfig` with typed sub-configs
- Angular pipes — `GqlPipe`, `GraphqlDataPipe`, `GraphqlErrorPipe`
- Reactive variables — `makeVar<T>()`, `ReactiveVar<T>`
- Client directive middleware — `@client` field resolution
- Router integration — `guardedRoute()`, `provideQuenetiqRouter()`, `prefetchedRoute()`, `fromPrefetched()`
- Auto-refetch — `mutationCachePolicy()`, `provideAutoRefetch()`
- DevTools integration — `DevtoolsService`, `devtoolsMiddleware`, `provideDevtools()`
- Schema service — `SchemaService`, `provideSchemaFetch()`
- Quenetiq plugin system — `QuenetiqPlugin` with `onInit` + `getMiddleware`
- Request batching, deduplication, retry with configurable policy
- Error notification integration (callback or service-based via DI)
- `ng add` schematics — interactive setup

### `@quenetiq/cache` — Normalized Cache

- `NormalizedCache` — in-memory entity store keyed by `__typename:id`
- `CacheService` — Angular service with CRUD + local reactive state
- Entity auto-extraction — `extractEntities()` recursively walks response data
- Cache middleware — query caching, mutation eviction, entity merging
- Garbage collector — reference-counting with configurable TTL
- Persistence — `localStorage` with throttling, versioning, max age
- Optimistic updates — snapshot/rollback/commit

### `@quenetiq/subscriptions` — WebSocket Subscriptions

- `GraphqlSubscriptionService` — `graphql-transport-ws` protocol
- Standalone `subscribe()` function
- Auto WebSocket URL derivation from HTTP endpoint
- Connection init/ack handshake, 10s timeout
- DevTools messaging integration
- Lazy connect, reconnect support

### `@quenetiq/file-upload` — Multipart File Uploads

- `UploadService` — GraphQL multipart request spec
- Auto-detection of `File`/`Blob` in nested variables
- FormData construction with operations + map
- Configurable max file count and size

### `@quenetiq/middlewares` — Middleware Plugins

- `authRefreshMiddleware` — 401 intercept + token refresh + request queue
- `retryExchange` — exponential backoff with jitter
- `focusRefetchMiddleware` — refetch on tab focus
- `offlineQueueMiddleware` + `OfflineQueueService` — offline mutation buffering + auto-replay
- `autoMockMiddleware` — schema-based mock data generation for rapid prototyping (no backend needed)

### `@quenetiq/pagination` — Pagination Helpers

- `offsetPagination()` — stateful offset-based pagination with loadMore/refresh
- `cursorPagination()` — relay-style cursor pagination
- Merge functions — `offsetMerge()`, `cursorMerge()` for type policies

### `@quenetiq/persisted-queries` — Automatic Persisted Queries

- `apqMiddleware` — SHA-256 hash, automatic registration
- Simple hash fallback when `crypto.subtle` unavailable

### `@quenetiq/fragments` — Fragment Utilities

- `fragment()` template tag — typed FragmentDefinition
- `spread()` / `compose()` — fragment composition
- `useFragment()` — type-safe data accessor

### `@quenetiq/ssr` — Server-Side Rendering

- `SsrStreamService` — chunked TransferState with configurable prefix
- `TransferCacheService` — server-to-browser cache transfer
- Platform-aware save/restore

### `@quenetiq/debugging` — Debug & Inspection

- `GraphqlDebugService` — automatic operation recording (500 entry ring buffer)
- `parseFieldTree()` — query string → field tree
- `buildMutationChart()` — timing visualization data
- `normalizeData()` / `groupEntities()` — entity inspection

### `@quenetiq/downloader` — Schema Download

- `downloadAndStoreSchema()` — introspection → JSON + SDL files
- CLI integration via `tools/download-schema.mjs`
- Custom headers support

### `@quenetiq/testing` — Testing Mock Backend

- `MockGraphqlService` — register responses with `when(request, result)`
- FIFO response queue, optional simulated delay
- `provideQuenetiqTesting()` — test provider setup

---

## Starters & Playground

Jumpstart development with one-click StackBlitz starters for each framework (opens in a new tab):

| Framework   | StackBlitz                                                 |
| ----------- | ---------------------------------------------------------- |
| Angular 22+ | [Open in StackBlitz](https://quenetiq.github.io/quenetiq/) |
| React 18+   | [Open in StackBlitz](https://quenetiq.github.io/quenetiq/) |
| Vue 3+      | [Open in StackBlitz](https://quenetiq.github.io/quenetiq/) |

Each starter uses `@quenetiq/client` + `@quenetiq/dev-server` for the mock backend. Run locally with `npm start` from `starters/<framework>/`.

The **GraphQL Playground** is available at `/playground` in the docs site — interactive query editor with variables, headers, JSON response viewer, and execution history.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  @quenetiq/core                                           │
│  ┌─────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ GraphqlSvc  │─▶│ Middleware Pipe │─▶│ executeHttp  │ │
│  │ query()     │  │ auth / logging  │  │ HttpClient   │ │
│  │ mutate()    │  │ cache / devtools│  │ POST /gql    │ │
│  │ refetch()   │  │ retry / offline │  │              │ │
│  │ poll()      │  └────────────────┘  └──────────────┘ │
│  └─────────────┘                                        │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │ Standalone   │ │ Helpers  │ │ Config System        ││
│  │ query/mutate │ │ isSuccess│ │ QuenetiqConfig +        ││
│  │ refetch/poll │ │ unwrap   │ │ typed sub-configs    ││
│  └──────────────┘ └──────────┘ └──────────────────────┘│
└─────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬─────────────┬─────────────┐
│ @quenetiq/     │ @quenetiq/     │ @quenetiq/    │ @quenetiq/    │
│ cache        │ subscriptions│ middlewares │ pagination  │
│ Normalized   │ WebSocket    │ Auth refresh│ Offset/Cursor│
│ Persistence  │ graphql-     │ Retry       │ Merge fns   │
│ GC           │ transport-ws │ Offline q    │             │
│ Optimistic   │              │ Focus refetch│             │
├──────────────┼──────────────┼─────────────┼─────────────┤
│ @quenetiq/     │ @quenetiq/     │ @quenetiq/    │ @quenetiq/    │
│ file-upload  │ debugging    │ ssr         │ testing     │
│ Multipart    │ Inspection   │ TransferState│ MockService │
│ FormData     │ Field tree   │ Chunked SSR │ when/respond│
└──────────────┴──────────────┴─────────────┴─────────────┘
```

---

## Packages

| Package                       | Size  | Description                                       |
| ----------------------------- | ----- | ------------------------------------------------- |
| `@quenetiq/core`              | ~10KB | Core client, middleware, pipes, config            |
| `@quenetiq/cache`             | ~3KB  | Normalized cache, persistence, GC                 |
| `@quenetiq/subscriptions`     | ~2KB  | WebSocket subscriptions                           |
| `@quenetiq/file-upload`       | ~1KB  | Multipart file uploads                            |
| `@quenetiq/middlewares`       | ~3KB  | Auth refresh, retry, offline queue, focus refetch |
| `@quenetiq/pagination`        | ~2KB  | Cursor + offset pagination                        |
| `@quenetiq/persisted-queries` | ~1KB  | APQ support                                       |
| `@quenetiq/fragments`         | ~1KB  | Fragment utilities                                |
| `@quenetiq/ssr`               | ~1KB  | SSR streaming + transfer cache                    |
| `@quenetiq/debugging`         | ~2KB  | Debug service + deep inspection                   |
| `@quenetiq/downloader`        | ~1KB  | Schema introspection downloader                   |
| `@quenetiq/testing`           | ~1KB  | Mock GraphQL backend                              |

---

## Configuration Reference

```typescript
// quenetiq.config.ts
import type { QuenetiqConfig } from '@quenetiq/core';

const config: QuenetiqConfig = {
	// ── Core ──
	endpoint: 'http://localhost:4000/graphql',
	errorPolicy: 'none', // 'none' | 'all' | 'ignore'
	retryCount: 3,
	retryDelay: 1000, // ms (exponential: 1s, 2s, 4s...)
	dedup: true, // Deduplicate in-flight queries
	batchWindow: 50, // Batch window in ms (0 = disabled)
	headers: { Authorization: 'Bearer ...' },
	middleware: [], // Custom middleware array
	plugins: [], // QuenetiqPlugin array
	devAuth: { enabled: false },

	// ── Subscriptions ──
	subscriptions: {
		wsEndpoint: 'ws://localhost:4000/graphql',
		reconnect: true,
		reconnectInterval: 2000,
		lazy: true,
	},

	// ── Cache ──
	cache: {
		enabled: true,
		maxAge: 300_000,
		serialize: true,
		typePolicies: {
			User: { keyFields: ['id'] },
			PaginatedResult: { merge: 'append' },
		},
	},

	// ── Persisted Queries ──
	persistedQueries: {
		enabled: false,
		hash: 'simple', // 'sha256' | 'simple'
		autoPersist: false,
	},

	// ── File Upload ──
	upload: {
		maxFiles: 10,
		maxFileSize: 10_485_760, // 10MB
	},

	// ── Debug ──
	debug: {
		logOperations: true,
		logTiming: true,
		logCache: false,
	},

	// ── Pagination ──
	pagination: {
		defaultLimit: 20,
		debounceMs: 300,
	},

	// ── SSR ──
	ssr: {
		transferState: true,
		cacheTtl: 60_000,
	},

	// ── DevTools ──
	devtools: {
		autoConnect: true,
		maxRequests: 500,
		captureSchema: true,
	},

	// ── Codegen (CLI-only) ──
	codegen: {
		schema: {
			endpoint: 'http://localhost:4000/graphql',
			dir: './graphql',
			autoDownload: true,
		},
		types: {
			dir: './graphql/types',
			scalars: { DateTime: 'string', UUID: 'string', Upload: 'File' },
			enumsAsTypes: false,
		},
	},
};

export default config;
```

---

## Commands

| Command                     | Description                      |
| --------------------------- | -------------------------------- |
| `npm start`                 | Start dev server                 |
| `npm run build`             | Production build                 |
| `npm test`                  | Run unit tests (Vitest)          |
| `npm run lint`              | Run ESLint                       |
| `npm run schema:download`   | Download GraphQL schema          |
| `npm run codegen`           | Generate TypeScript types        |
| `npm run ext:build:chrome`  | Build Chrome DevTools extension  |
| `npm run ext:build:firefox` | Build Firefox DevTools extension |

---

## Schema Download & Codegen

```bash
# Download schema via introspection
npm run schema:download

# Generate TypeScript types from schema
npm run codegen
```

Generated types:

```typescript
// graphql/types/index.ts
export const enum NoteType { NOTE = 'NOTE', PASSWORD = 'PASSWORD' }
export interface User { id: string; username: string; ... }
export interface Note { id: string; title: string; ... }
export interface Query { getCurrentUser: User; getNotes: Note[]; ... }
```

---

## Browser Extension

Quenetiq includes a full DevTools browser extension:

- **Chrome**: `browser-extension/manifest.chrome.json`
- **Firefox**: `browser-extension/manifest.firefox.json`

Build with `npm run ext:build` or individually. The extension connects to the DevTools middleware, displaying:

- Real-time request log
- Schema visualization (SDL tree)
- Field tree inspector
- Entity cache browser
- Timing/mutation charts

---

## Error Handling Pattern

```typescript
import { isSuccess, isError, unwrap, unwrapOrThrow } from '@quenetiq/core';

service.query<{ user: User }>(GET_USER).subscribe((result) => {
	if (isSuccess(result)) {
		// result.data is typed
		console.log(unwrapOrThrow(result).user);
	} else if (isError(result)) {
		// result.error is string
		console.error(result.error);
	}
});
```

Or with pipes:

```html
<!-- graphql-data pipe extracts data, null on error -->
<div>{{ result | graphqlData | json }}</div>

<!-- graphql-error pipe extracts error string, null on success -->
<div *ngIf="result | graphqlError as err">{{ err }}</div>
```

---

## Testing

```typescript
import { MockGraphqlService, provideQuenetiqTesting } from '@quenetiq/testing';
import { GET_USER } from './queries';

TestBed.configureTestingModule({
	providers: [provideHttpClientTesting(), provideQuenetiqTesting(), MockGraphqlService],
});

const mock = TestBed.inject(MockGraphqlService);
mock.when(GET_USER, { status: 'success', data: { user: { id: '1', name: 'Test' } } });
```

---

## Project Structure

```
src/
├── app/
│   ├── graphql/
│   │   ├── queries/          # Typed gql queries
│   │   ├── graphql.service.spec.ts
│   │   └── debug-panel/      # Built-in debug component
│   └── features/
├── projects/
│   └── quenetiq/               # Quenetiq monorepo (13 packages)
│       ├── core/             #   → README
│       ├── cache/            #   → README
│       ├── subscriptions/    #   → README
│       ├── file-upload/      #   → README
│       ├── middlewares/      #   → README
│       ├── pagination/       #   → README
│       ├── persisted-queries/#   → README
│       ├── fragments/        #   → README
│       ├── ssr/              #   → README
│       ├── debugging/        #   → README
│       ├── downloader/       #   → README
│       ├── testing/          #   → README
│       └── codegen/          #   → README
├── tools/                    # CLI tools
│   ├── download-schema.mjs
│   ├── generate-types.mjs
│   └── load-config.mjs
├── graphql/                  # Downloaded schema + generated types
│   ├── schema.graphql
│   ├── schema.json
│   └── types/
└── quenetiq.config.ts          # Central Quenetiq configuration
```

## Bugs Fixed in Other Clients

Real GitHub issues from Apollo, URQL, and Relay that Quenetiq addresses by design.

| Project        | Issue                                                                 | Problem                                                                                            | Quenetiq Fix                                                                           |
| -------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Apollo         | [#9319](https://github.com/apollographql/apollo-client/issues/9319)   | `INVALIDATE` in `cache.modify` does not evict data — stale data persists with no refetch           | Cache middleware auto-evicts entities on mutation. No manual `modify`/`evict` needed   |
| Apollo         | [#10289](https://github.com/apollographql/apollo-client/issues/10289) | `cache.evict` silently no-ops inside optimistic UI — open since 2022                               | Optimistic updates are snapshots with explicit commit/rollback — eviction always works |
| Apollo         | [#11804](https://github.com/apollographql/apollo-client/issues/11804) | Skipped query returns outdated data after `clearStore()` — cache reset is ignored by skipped hooks | No skip concept. Queries are imperative — reset always returns fresh state             |
| Apollo         | [#9735](https://github.com/apollographql/apollo-client/issues/9735)   | Production-only bug: internal results cache merges stale data into `readFromStore` output          | No internal result cache — every read goes directly to the normalized store            |
| Apollo         | [#8958](https://github.com/apollographql/apollo-client/issues/8958)   | `@apollo/client` requires `react` as dependency even in non-React projects                         | Framework-agnostic core (`@quenetiq/client`) has zero framework dependencies           |
| Apollo Angular | [#2371](https://github.com/the-guild-org/apollo-angular/issues/2371)  | apollo-angular incompatible with `@apollo/client` v4.0 — Angular version lags behind React         | Angular packages track core in lockstep — no React version to wait for                 |
| URQL           | [#2414](https://github.com/urql-graphql/urql/issues/2414)             | `relayPagination` does not reset data when non-relay params change — shows stale results           | Pagination helpers are stateless — variable changes always produce a clean slate       |
| URQL           | [#668](https://github.com/urql-graphql/urql/issues/668)               | Query with `relayPagination` does not refetch when variables change — returns stale data           | Query refetch on variable change is guaranteed — no stale data regression              |
| URQL           | [#3877](https://github.com/urql-graphql/urql/pull/3877)               | `relayPagination` concatenates pages in cache-write order, causing flickering mis-ordered items    | Cursor merge functions use explicit ordering — no dependency on write timing           |
| Relay          | [#3406](https://github.com/facebook/relay/issues/3406)                | Relay is React-only. No Angular, Vue, or Svelte support — framework lock-in                        | Quenetiq ships first-class bindings for Angular, React, and Vue from day one           |
| Relay          | [#183](https://github.com/facebook/relay/issues/183)                  | Relay mandates `Node` interface + `Connection` spec — backend must conform                         | Supports offset, cursor, and relay-style pagination — no backend changes required      |

---

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./public/logos/logo.png">
  <img alt="Quenetiq" src="./public/logos/logo.png" width="120" align="center">
</picture>

**Built for Angular · Modular · Zero‑boilerplate**

## License

MIT
