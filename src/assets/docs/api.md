---
title: API Reference
slug: api
group: Reference
order: 1
since: 0.0.1
tags: [api, reference]
description: Complete API reference
---

# API Reference

Complete reference of all exported symbols from every Quenetiq package.

## @quenetiq/client

| Export | Description |
| --- | --- |
| `createClient(config, cache?)` | Factory for `QuenetiqClient` |
| `QuenetiqClient` | Core class — query, mutate, refetch, queryStream |
| `gql` | Tagged template literal for DocumentNode |
| `isSuccess(result)` | Type guard for successful results |
| `isError(result)` | Type guard for errored results |
| `unwrap(result)` | Extract data or throw |
| `unwrapOrThrow(result)` | Extract data or throw network error |
| `mapResult(result, fn)` | Map over success data |
| `authMiddleware(token)` | Bearer token middleware |
| `loggingMiddleware(label?)` | Request logging middleware |
| `applyMiddleware(mw, final)` | Build middleware chain |

## @quenetiq/react

| Export | Description |
| --- | --- |
| `QuenetiqProvider` | Context provider for client + cache |
| `useClient()` | Returns `QuenetiqClient` from context |
| `useCache()` | Returns `CacheStore | null` from context |
| `useQuery(doc, vars?)` | Query hook — `{ data, loading, error, refetch }` |
| `useMutation(doc)` | Mutation hook — `{ data, loading, error, mutate }` |
| `useSubscription(doc, vars?, opts?)` | Subscription hook — `{ data, loading, error }` |
| `<Query>` | Render-prop query component |
| `<Mutation>` | Render-prop mutation component |
| `<Subscription>` | Render-prop subscription component |

## @quenetiq/vue

| Export | Description |
| --- | --- |
| `createQuenetiqPlugin(client)` | Vue plugin — installs client globally |
| `useClient()` | Access `QuenetiqClient` from composition API |
| `useQuery(doc, vars?, opts?)` | Reactive query composable |
| `useMutation(doc)` | Mutation composable |
| `useSubscription(doc, vars?, opts?)` | Subscription composable |

## @quenetiq/core

### Classes

| Export | Description |
| --- | --- |
| `GraphqlService` | Main service for queries, mutations, and watch queries |
| `MutationRef<T>` | Reference returned by `mutate()` with `.result` signal and `.loading` signal |

### Functions

| Export | Description |
| --- | --- |
| `gql` | Tagged template literal for GraphQL documents |
| `createReactiveVar<T>(initial: T)` | Creates a reactive variable |
| `composeMiddlewares` | Composes middleware functions into a link chain |
| `createHttpLink` | Creates an HTTP link for queries and mutations |
| `executeQuery` | Standalone query execution outside DI |
| `buildRequest` | Builds a GraphQL request object from document + variables |
| `parseResult` | Extracts data and errors from a raw response |

### Providers

| Export | Description |
| --- | --- |
| `provideQuenetiqCore(config)` | Configures and provides GraphqlService |

### Pipes

| Export | Description |
| --- | --- |
| `GqlPipe` | Formats GraphQL data for display |
| `GqlTypePipe` | Resolves GraphQL type names |

### Directives

| Export | Description |
| --- | --- |
| `DqlClientDirective` | Structural directive for client-side resolvers |

### Interfaces

| Export | Description |
| --- | --- |
| `QuenetiqCoreConfig` | Configuration interface for `provideQuenetiqCore` |
| `Link` | Middleware link type |
| `Operation` | GraphQL operation (query, mutation, subscription) |
| `FetchResult<T>` | Typed fetch result |

## @quenetiq/cache

### Agnostic (`@quenetiq/cache`)

| Export | Description |
| --- | --- |
| `CacheStore` | High-level cache with GC, persistence, type policies |
| `NormalizedCache` | Low-level normalized document store |
| `createCache(config?)` | Factory for CacheStore |
| `createNormalizedCache()` | Factory for NormalizedCache |
| `TypePolicy` | Type policy for custom normalization |

### Angular (`@quenetiq/cache/angular`)

| Export | Description |
| --- | --- |
| `CacheService` | Injectable cache service |
| `provideCachePersistence(config)` | Provider for cache persistence |
| `CachePersistenceService` | Persistence manager service |

## @quenetiq/subscriptions

### Agnostic (`@quenetiq/subscriptions`)

| Export | Description |
| --- | --- |
| `GraphqlSubscription` | Core WebSocket subscription class |

### Angular (`@quenetiq/subscriptions/angular`)

| Export | Description |
| --- | --- |
| `GraphqlSubscriptionService` | Injectable WebSocket subscription manager |
| `subscribe(document, variables?)` | Standalone function (injection-free) |
| `provideQuenetiqSubscriptions(config)` | Provider for subscriptions config |
| `SubscriptionsConfig` | Subscriptions configuration interface |

## @quenetiq/file-upload

| Export | Description |
| --- | --- |
| `UploadService` | File upload service with multipart support |
| `isUploadValue(value)` | Type guard for File/Blob/FileList |
| `extractUploads(variables)` | Recursively extracts upload values from variables |

## @quenetiq/middlewares

### Agnostic (`@quenetiq/middlewares`)

| Export | Description |
| --- | --- |
| `authRefreshMiddleware(config)` | Auth token refresh on 401 |
| `retryExchange(config?)` | Exponential backoff retry |
| `focusRefetchMiddleware(config?)` | Refetch on window focus |
| `offlineQueueMiddleware(config?)` | Queue mutations when offline |

### Angular (`@quenetiq/middlewares/angular`)

| Export | Description |
| --- | --- |
| `OfflineQueueService` | Injectable queue manager |
| `provideOfflineQueue(config)` | Provider for offline queue |
| `OfflineQueueConfig` | Offline queue configuration |

## @quenetiq/pagination

| Export | Description |
| --- | --- |
| `offsetPagination(config)` | Offset-based merge function |
| `cursorPagination(config)` | Cursor-based merge function |
| `OffsetPaginationConfig` | Offset pagination config |
| `CursorPaginationConfig` | Cursor pagination config |

## @quenetiq/persisted-queries

| Export | Description |
| --- | --- |
| `apqMiddleware(config)` | Automatic Persisted Query middleware |
| `sha256Hash(document)` | Computes SHA-256 hash of a query document |
| `ApqConfig` | APQ middleware configuration |

## @quenetiq/fragments

| Export | Description |
| --- | --- |
| `fragment(typeCondition, document)` | Defines a typed fragment |
| `spread(fragment)` | Spreads a fragment into a query |
| `compose(fragments)` | Composes multiple fragments into one document |
| `useFragment(fragment, parentSignal)` | Extracts fragment data from query result |
| `Fragment<T>` | Fragment type |

## @quenetiq/ssr

| Export | Description |
| --- | --- |
| `SsrStreamService` | Server-side query streaming |
| `TransferCacheService` | Client-side cache hydration |
| `provideQuenetiqSsr(config)` | SSR provider |
| `QuenetiqSsrConfig` | SSR configuration |

## @quenetiq/debugging

| Export | Description |
| --- | --- |
| `GraphqlDebugService` | Debug logging service |
| `parseFieldTree(document)` | Parse query into field tree |
| `buildMutationChart(document)` | Build mutation dependency chart |
| `normalizeData(data, config)` | Preview cache normalization |
| `provideQuenetiqDebugging(config)` | Debug provider |

## @quenetiq/downloader

| Export | Description |
| --- | --- |
| `downloadAndStoreSchema(config)` | Downloads schema via introspection |
| `DownloadSchemaConfig` | Download configuration |
| `DownloadResult` | Download result with file paths |

## @quenetiq/testing

| Export | Description |
| --- | --- |
| `MockGraphqlService` | Mock service for testing |
| `when(service, operationName)` | Select an operation to mock |
| `respond(data)` | Configure response for selected operation |
| `provideQuenetiqTesting(config)` | Testing provider |
| `QuenetiqTestingConfig` | Testing configuration |
