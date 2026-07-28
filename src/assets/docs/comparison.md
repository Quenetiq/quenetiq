---
title: "Quenetiq vs Other Solutions"
slug: comparison
group: Reference
order: 2
since: "0.0.1"
tags: [comparison, apollo, relay, urql]
description: "A comprehensive feature comparison between Quenetiq and established GraphQL clients"
---

A comprehensive feature comparison between Quenetiq and established GraphQL clients for Angular, plus an analysis of pain points in existing solutions that Quenetiq addresses.

## Comparison Table

| Feature | Quenetiq | Apollo Angular | URQL | Relay |
|---------|----------|----------------|------|-------|
| Angular DI native | ✅ Yes | ❌ No (port of React) | ❌ No (React-first) | ❌ No (React-only) |
| Signals / reactive | ✅ Yes (signals) | ❌ No (rxjs) | ❌ No (wonka) | ❌ No |
| Tree-shakeable | ✅ Yes (12 packages) | ❌ No (monolithic) | ~ (exchanges) | ❌ No |
| Bundle size (core) | ~3.2 kB | ~45 kB | ~12 kB | ~100+ kB |
| Normalized cache | ✅ Yes | ✅ Yes | ~ (document) | ✅ Yes |
| Subscriptions | ✅ Yes (graphql-transport-ws) | ✅ Yes | ✅ Yes | ❌ No |
| File uploads | ✅ Yes (multipart spec) | ❌ No | ❌ No | ❌ No |
| Persisted queries | ✅ Yes (SHA-256 APQ) | ❌ No | ✅ Yes | ❌ No (custom) |
| Middleware pipeline | ✅ Yes (composable) | ❌ No (links) | ✅ Yes (exchanges) | ❌ No |
| Offline queue | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Auth refresh | ✅ Yes | ❌ No (manual) | ~ (custom) | ❌ No |
| Fragments system | ✅ Yes (composable) | ❌ No (raw strings) | ❌ No (raw strings) | ✅ Yes (useFragment) |
| SSR hydration | ✅ Yes (chunked transfer) | ❌ No (getDataFromTree) | ✅ Yes | ✅ Yes |
| Pagination helpers | ✅ Yes (offset + cursor) | ✅ Yes (fetchMore) | ✅ Yes | ✅ Yes (connections) |
| Testing utilities | ✅ Yes (MockGraphqlService) | ❌ No | ❌ No | ❌ No |
| Schema downloader | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Debugging tools | ✅ Yes (query tree, mutation chart) | ❌ No (browser devtools) | ❌ No (browser devtools) | ✅ Yes (Relay DevTools) |
| Client directives | ✅ Yes (*dqlClient) | ❌ No | ❌ No | ✅ Yes |

## Fixed Bugs & Issues

Real GitHub issues from other GraphQL clients that Quenetiq addresses by design. Each link points to a confirmed bug or architectural limitation in the respective project.

| Project | Issue | Problem | Quenetiq Fix |
|---------|-------|---------|-------------|
| Apollo | [#9319](https://github.com/apollographql/apollo-client/issues/9319) | `INVALIDATE` in `cache.modify` does not evict data — stale data persists with no refetch | Cache middleware auto-evicts entities on mutation. No manual `modify` / `evict` needed |
| Apollo | [#10289](https://github.com/apollographql/apollo-client/issues/10289) | `cache.evict` silently no-ops inside optimistic UI — open since 2022 | Optimistic updates are snapshots with explicit commit/rollback — eviction always works |
| Apollo | [#11804](https://github.com/apollographql/apollo-client/issues/11804) | Skipped query returns outdated data after `clearStore()` — cache reset is ignored by skipped hooks | No skip concept. Queries are imperative — reset always returns fresh state |
| Apollo | [#9735](https://github.com/apollographql/apollo-client/issues/9735) | Production-only bug: internal results cache merges stale data into `readFromStore` output | No internal result cache — every read goes directly to the normalized store |
| Apollo | [#8958](https://github.com/apollographql/apollo-client/issues/8958) | `@apollo/client` requires `react` as dependency even in non-React projects | Framework-agnostic core (`@quenetiq/client`) has zero framework dependencies |
| Apollo Angular | [#2371](https://github.com/the-guild-org/apollo-angular/issues/2371) | apollo-angular incompatible with `@apollo/client` v4.0 — Angular version lags behind React | Angular packages track core in lockstep — no React version to wait for |
| URQL | [#2414](https://github.com/urql-graphql/urql/issues/2414) | `relayPagination` does not reset data when non-relay params change — shows stale results | Pagination helpers are stateless — variable changes always produce a clean slate |
| URQL | [#668](https://github.com/urql-graphql/urql/issues/668) | Query with `relayPagination` does not refetch when variables change — returns stale data | Query refetch on variable change is guaranteed — no stale data regression |
| URQL | [#3877](https://github.com/urql-graphql/urql/pull/3877) | `relayPagination` concatenates pages in cache-write order, causing flickering mis-ordered items | Cursor merge functions use explicit ordering — no dependency on write timing |
| Relay | [#3406](https://github.com/facebook/relay/issues/3406) | Relay is React-only. No Angular, Vue, or Svelte support — framework lock-in | Quenetiq ships first-class bindings for Angular, React, and Vue from day one |
| Relay | [#183](https://github.com/facebook/relay/issues/183) | Relay mandates `Node` interface + `Connection` spec — backend must conform | Supports offset, cursor, and relay-style pagination — no backend changes required |

## Apollo Pain Points

Apollo Client is the most widely used GraphQL client, but it comes with significant baggage when used outside React.

### React legacy architecture

Apollo Angular is a port of `@apollo/client`. The core is framework-agnostic, but every Angular-specific integration is bolted on top. You get React idioms (render props via `ApolloQueryComponent`) instead of Angular idioms (`inject()`, structural directives, signals).

### Cache normalization complexity

Apollo's `InMemoryCache` is powerful but notoriously hard to configure. `keyFields`, `typePolicies`, `merge` functions for pagination — every misconfiguration produces subtle bugs: stale data, phantom UI updates, or silent failures. Cache invalidation is consistently the #1 complaint in the community. Quenetiq's cache (`@quenetiq/cache`) is optional, transparent, and uses explicit GC without magic.

### Monolithic error handling

Apollo Client 3 uses a single `ApolloError` class for network errors, GraphQL errors, and parsing errors. You have to dig through nested properties to understand what went wrong. Apollo 4.0 improves this with separate error classes, but Quenetiq's middleware pipeline lets you handle each error type in its own middleware from day one.

### No file uploads

Apollo does not implement the GraphQL Multipart Request Spec. Uploading files requires a separate REST endpoint or a custom link. Quenetiq has `@quenetiq/file-upload` with automatic `File` / `Blob` detection.

### No offline queue

Offline support in Apollo requires `apollo3-cache-persist` and manual queue management. Quenetiq's `offlineQueue` middleware queues mutations when offline and replays them automatically.

### Auth refresh requires custom code

Token refresh on 401 requires writing a custom `ApolloLink`. Quenetiq ships `authRefresh` middleware in `@quenetiq/middlewares`.

### Testing is cumbersome

Apollo testing requires `MockedProvider` (React wrapper) or a full `TestBed` setup with custom providers. Quenetiq provides `@quenetiq/testing` with `MockGraphqlService` and `when`/`respond` helpers that integrate directly with Angular's `TestBed`.

## Relay Pain Points

Relay is Facebook's GraphQL client, designed for React at scale. It solves real problems but introduces its own.

### React-only

Relay is fundamentally tied to React. There is no official Angular integration. The compiler, the runtime, the hooks — all React.

### Required compiler pipeline

Relay requires a Babel plugin and the `relay-compiler` to extract and hash fragments at build time. This adds build complexity and locks you into a specific toolchain. Quenetiq's `gql` tag works at runtime — no build step required.

### Backend conventions

Relay mandates specific backend patterns: `Node` interface for global object identification, `Connection` spec for pagination. If your backend doesn't follow these, Relay is painful. Quenetiq supports offset, cursor, and relay-style pagination without requiring backend changes.

### Bundle size

Relay's runtime is 100+ kB. For comparison, Quenetiq's entire ecosystem (all 12 packages combined) is ~25 kB.

## URQL Pain Points

URQL is a lighter alternative to Apollo with an exchange-based plugin system similar to Quenetiq's middleware pipeline.

### React-first architecture

Like Apollo, URQL was designed for React. The Angular integration (`@urql/angular`) is community-maintained and lags behind the React version.

### Document cache limitations

URQL's default cache is a document cache — it caches by query document + variables, not by entity. This means the same data fetched by two different queries is stored twice. The normalized cache is available but is a paid/external addon (`@urql/exchange-graphcache`) with its own complexity. Quenetiq provides both cache types in-tree.

### Smaller ecosystem

URQL has fewer middleware, fewer community packages, and less adoption than Apollo. Quenetiq ships 12 packages covering the most common GraphQL scenarios out of the box.

## Industry Gaps

Beyond individual clients, the GraphQL ecosystem has several gaps that Quenetiq addresses.

### Subscription protocol fragmentation

There are two competing WebSocket protocols: the original `subscriptions-transport-ws` (deprecated) and the newer `graphql-transport-ws`. Apollo uses its own protocol. Quenetiq standardizes on `graphql-transport-ws`.

### SSR hydration is an afterthought

Apollo requires `getDataFromTree` to prefetch data on the server, which is slow and complex. Quenetiq's `@quenetiq/ssr` provides chunked transfer state — query results are streamed as `<script>` tags during SSR and hydrated automatically on the client.

### Persisted queries require infrastructure

Most clients rely on external tools (Webpack plugins, CDN config) for persisted queries. Quenetiq's `apqMiddleware` handles SHA-256 APQ automatically — first request sends hash, server responds with `PersistedQueryNotFound`, client retries with full query.

### Debugging requires browser extensions

Apollo DevTools and Relay DevTools are browser extensions that require installation by every developer. Quenetiq's `@quenetiq/debugging` is code — import it, get a query tree inspector and mutation chart in-app, no extensions needed.

### No standard testing utilities

Every GraphQL client expects you to mock the network layer yourself. Quenetiq provides `MockGraphqlService` that plugs directly into Angular's DI and works with `fakeAsync` / `TestBed`.

## When to Choose Quenetiq

Quenetiq is not for everyone. Here's when it shines — and when you might want to look elsewhere.

### Choose Quenetiq if you value:

- **Zero-boilerplate normalized cache** — no `typePolicies`, no `keyFields`, no `merge` functions. Just `__typename` + `id` and it works.
- **Built-in middleware ecosystem** — auth refresh, retry, offline queue, auto mock, APQ, batching. No third-party packages needed.
- **Framework-native design** — Angular Signals, React hooks v2 with options object, Vue composables. Not wrappers around a core — each framework gets its own ergonomic API.
- **Offline-first mindset** — mutation queue with localStorage persistence, auto-replay on reconnect, optimistic update rollback.
- **Debugging without extensions** — built-in DevTools panel for query inspection, cache snapshot, error timeline. Ship it to staging, not just local dev.
- **Type safety without a build step** — phantom-typed `DocumentNode` with result + variables inference. Optional codegen for the full schema.
- **Live Queries** — `useLiveQuery` for real-time data with WebSocket fallback. First-class support across all frameworks.

### Do NOT choose Quenetiq if:

- You need a mature ecosystem with 1000+ community packages — Apollo has this; Quenetiq is a smaller, focused library.
- You're tied to Relay's compiler-based data masking and prefer static build-time guarantees over runtime flexibility.
- You prefer one massive all-in-one package over modular composition — Quenetiq ships 12+ packages and you pick what you need.
