---
title: Migration from Apollo
slug: migration
group: Reference
order: 3
since: 0.0.2-alpha.1
tags: [migration, apollo]
description: Migration from Apollo
---

# Migration from Apollo

Complete guide for migrating an existing Apollo Client project to Quenetiq. Use the CLI scanner to find all Apollo patterns, then follow the manual migration steps. For incremental migration, use the adapter layer.

## Why Migrate?

Apollo Client is the most popular GraphQL client, but it has significant drawbacks for Angular projects: it's a React library ported to Angular, it requires complex `typePolicies` for cache normalization, and many features (file uploads, offline queue, auth refresh) require third-party packages. Quenetiq solves all of this with a framework-native, modular architecture.

### What you gain

- **Angular-native architecture** — Signals, standalone DI, pipes, SSR with TransferState
- **Zero-config cache** — auto `__typename` + `id` normalization, no typePolicies
- **Built-in middleware** — auth refresh, retry, offline queue, APQ, batching, auto mock
- **Smaller bundle** — ~3.2 kB core vs ~50 kB Apollo + you only import what you use
- **DevTools in-app** — no browser extension required

### What you lose

- **Ecosystem size** — fewer community packages and tutorials (Apollo is more established)
- **Familiarity** — team will need to learn new API patterns
- **Relay-style data masking** — Quenetiq doesn't have a compiler-based masking system

## CLI Usage

The `@quenetiq/apollo-adapter` package ships a CLI scanner that analyzes your project for Apollo patterns and generates a migration report.

```bash
# Scan project for Apollo patterns
npx @quenetiq/apollo-adapter src/

# Scan and auto-fix import paths (--fix)
npx @quenetiq/apollo-adapter src/ --fix

# Scan a specific directory
npx @quenetiq/apollo-adapter projects/my-app/src --fix
```

The scanner detects Apollo imports, API calls, and configuration patterns, then maps each one to the Quenetiq equivalent. The `--fix` flag auto-replaces import paths where safe (e.g., `@apollo/client` → `@quenetiq/client`, `ApolloClient` → `QuenetiqClient`). Complex patterns (cache operations, Link chains) are flagged for manual migration.

## Manual Migration

Follow these steps to migrate your project from Apollo to Quenetiq:

### 1. Install Quenetiq

```bash
npm install @quenetiq/client @quenetiq/cache
```

Start with the core packages. Add framework bindings and middleware as needed.

### 2. Create Quenetiq client

```typescript
import { QuenetiqClient } from '@quenetiq/client';
import { CacheStore } from '@quenetiq/cache';

const cache = new CacheStore();
const client = new QuenetiqClient({
  endpoint: 'https://api.example.com/graphql',
  cache,
});
```

Replace ApolloClient + InMemoryCache with QuenetiqClient + CacheStore.

### 3. Replace React provider

```typescript
// Before:
import { ApolloProvider } from '@apollo/client';
<ApolloProvider client={apolloClient}><App /></ApolloProvider>

// After:
import { QuenetiqProvider } from '@quenetiq/react';
<QuenetiqProvider client={quenetiqClient}><App /></QuenetiqProvider>
```

Framework provider names change. Vue and Angular follow similar patterns.

### 4. Migrate queries

```typescript
// Before:
const { loading, error, data } = useQuery(MY_QUERY, { variables: { id } });

// After (same API, options object):
const { loading, error, data, networkStatus, called } = useQuery(MY_QUERY, { variables: { id } });
```

Quenetiq hooks return the same shape plus extras (networkStatus, called, fetchMore).

### 5. Migrate mutations with cache update

```typescript
// Before:
const [likePost] = useMutation(LIKE_POST, {
  update(cache, { data }) {
    const existing = cache.readQuery({ query: GET_POSTS });
    cache.writeQuery({ query: GET_POSTS, data: { ... } });
  },
});

// After (same update pattern):
const [likePost] = useMutation(LIKE_POST, {
  update(cache, { data }) {
    // cache here is Quenetiq CacheStore (compatible via fromApolloCache)
    cache.merge({ __typename: 'Post', id: data.likePost.id, likes: data.likePost.likes });
  },
});
```

The update callback receives Quenetiq CacheStore instance. Use `cache.merge()` instead of `readQuery`/`writeQuery`.

### 6. Add middleware

```typescript
import { loggingMiddleware, authRefreshMiddleware } from '@quenetiq/middlewares';

const client = new QuenetiqClient({
  endpoint: 'https://api.example.com/graphql',
  middleware: [
    loggingMiddleware('MyApp'),
    authRefreshMiddleware({ getToken: () => localStorage.getItem('token') }),
  ],
});
```

Replace Apollo Links with Quenetiq middleware pipeline. Built-in middlewares cover auth, retry, offline, APQ, batching.

## Adapter: Incremental Migration

If you can't migrate your entire project at once, use the Apollo adapter to run both clients side by side. This is useful for large codebases where you want to migrate module by module.

```typescript
import { fromApolloCache } from '@quenetiq/apollo-adapter';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { QuenetiqClient } from '@quenetiq/client';
import { CacheStore } from '@quenetiq/cache';

// Keep Apollo client for existing code
const apolloCache = new InMemoryCache();
const apolloClient = new ApolloClient({ uri, cache: apolloCache });

// Create Quenetiq client, wrapping Apollo's cache for compatibility
const quenetiqCache = new CacheStore();
const quenetiqClient = new QuenetiqClient({ endpoint: uri, cache: quenetiqCache });

// Create adapter so Quenetiq can read from Apollo cache
const adapter = fromApolloCache(apolloCache);

// Use adapter.query() to read Apollo cache data from Quenetiq
const migratedData = adapter.query('Book', '1');
```

The `fromApolloCache()` function wraps an Apollo `InMemoryCache` instance so it can be used as a Quenetiq `CacheStore`. This lets you gradually migrate components one by one while keeping the Apollo cache as the source of truth.

## Apollo vs Quenetiq API Mapping

Quick reference for converting Apollo APIs to their Quenetiq equivalents:

| Apollo API | Quenetiq Equivalent |
| --- | --- |
| `ApolloClient` | `QuenetiqClient` (from `@quenetiq/client`) |
| `InMemoryCache` | `CacheStore` (from `@quenetiq/cache`) |
| `ApolloProvider` | `QuenetiqProvider` (from `@quenetiq/react`) |
| `Apollo Angular (apollo-angular)` | `@quenetiq/core` (Angular-native) |
| `new ApolloClient({ uri, cache })` | `new QuenetiqClient({ endpoint })` |
| `client.query({ query, variables })` | `client.query(query, variables)` |
| `client.mutate({ mutation, variables })` | `client.mutate(document, variables)` |
| `useQuery(query, { variables })` | `useQuery(query, { variables })` — same API, options object |
| `useMutation(query, { variables, update })` | `useMutation(query, { variables, update })` |
| `useSubscription(query)` | `useSubscription(query)` |
| `subscribeToMore()` | `useLiveQuery()` |
| `cache.readQuery({ query, variables })` | `cache.query(__typename, id)` |
| `cache.writeQuery({ query, data })` | `cache.write(entity)` |
| `cache.evict({ id })` | `cache.evict(__typename, id)` |
| `cache.modify({ id, fields })` | `cache.merge()` |
| `cache.gc()` | `cache.collectGarbage()` |
| `makeVar(value)` | `makeVar(value)` (from `@quenetiq/core`) |
| `reactiveVar()` | `reactiveVar()` (from `@quenetiq/core`) |
| `@client directives` | `clientDirectiveMiddleware()` |
| `Apollo Link chain` | `GraphqlMiddleware pipeline` |
| `errorPolicy` | `errorPolicy` in `QuenetiqClient` config |
| `fetchPolicy` | `fetchPolicy` in `QuenetiqClient` config |
| `pollInterval` | `pollInterval` in `useQuery` options |
| `refetchQueries` | `client.refetch()` / `useQuery().refetch()` |
| `optimisticResponse` | `optimistic` option in `mutate()` |
| `typePolicies / keyFields` | Zero-config — auto `__typename` + `id` detection |
