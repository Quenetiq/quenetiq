---
title: Middleware Overview
slug: middlewares
group: Middleware
order: 1
since: 0.0.1
tags:
  - middleware
  - pipeline
description: Composable middleware pipeline
---

# @quenetiq/middlewares

Pre-built middleware functions that plug into the Quenetiq middleware pipeline. Each middleware wraps the next link in the chain — auth refresh, retry, focus refetch, and offline queue.

## authRefreshMiddleware

Intercepts 401 responses, queues concurrent requests, calls `refreshToken()`, then replays them with the new token:

```ts
import { authRefreshMiddleware } from '@quenetiq/middlewares';

const middleware = authRefreshMiddleware({
  refreshToken: () => fetch('/auth/refresh').then(r => r.json()),
});
```

## retryExchange

Retries failed requests with exponential backoff and optional jitter:

```ts
import { retryExchange } from '@quenetiq/middlewares';

const middleware = retryExchange({
  maxRetries: 3,
  initialDelay: 500,
  maxDelay: 10000,
});
```

## focusRefetchMiddleware

Refetches stale queries on `visibilitychange` or `window.focus` events:

```ts
import { focusRefetchMiddleware } from '@quenetiq/middlewares';

const middleware = focusRefetchMiddleware({
  minStaleSeconds: 30,
});
```

## offlineQueueMiddleware

Buffers mutations in localStorage when offline, replays on the `online` event:

```ts
import { offlineQueueMiddleware } from '@quenetiq/middlewares';
import { provideOfflineQueue } from '@quenetiq/middlewares/angular';

// Provider (Angular only):
export const appConfig = {
  providers: [provideOfflineQueue({ maxQueue: 50 })],
};

const middleware = offlineQueueMiddleware();
```

## autoMockMiddleware

Generates realistic mock GraphQL responses from your schema — no backend needed for prototyping:

```ts
import { autoMockMiddleware } from '@quenetiq/middlewares';

const middleware = autoMockMiddleware({
  schema: fs.readFileSync('schema.graphql', 'utf-8'),
  mocks: {
    User: () => ({ name: 'Mock User' }),
  },
  delay: 200,
});
```

## errorHandlerMiddleware

Catches errors and allows custom handling with optional recoverability:

```ts
import { errorHandlerMiddleware } from '@quenetiq/middlewares';

const middleware = errorHandlerMiddleware({
  handle: (error) => {
    notifyUser(error.message);
    return true; // recoverable
  },
  fallbackMessage: 'Something went wrong',
});
```

## rateLimitMiddleware

Sliding-window rate limiter per request key:

```ts
import { rateLimitMiddleware } from '@quenetiq/middlewares';

const middleware = rateLimitMiddleware({
  maxRequests: 10,
  windowMs: 1000,
});
```

## dedupMiddleware

Deduplicates in-flight queries sharing the same query string and variables:

```ts
import { dedupMiddleware } from '@quenetiq/middlewares';

const middleware = dedupMiddleware();
```

## costEstimationMiddleware

Estimates query complexity and warns or blocks expensive queries before they reach the server:

```ts
import { costEstimationMiddleware } from '@quenetiq/middlewares';

const middleware = costEstimationMiddleware({
  maxCost: 1000,
  mode: 'block',
});
```

## Composing Middlewares

Combine multiple middlewares using `composeMiddlewares` from `@quenetiq/core`. Order determines execution order:

```ts
import { composeMiddlewares, createHttpLink } from '@quenetiq/core';
import { authRefreshMiddleware, retryExchange, focusRefetchMiddleware, offlineQueueMiddleware, autoMockMiddleware, errorHandlerMiddleware, rateLimitMiddleware, dedupMiddleware, costEstimationMiddleware } from '@quenetiq/middlewares';

const link = composeMiddlewares(
  authRefreshMiddleware({ refreshToken: () => getToken() }),
  retryExchange({ maxRetries: 3 }),
  focusRefetchMiddleware(),
  offlineQueueMiddleware(),
  autoMockMiddleware(),
  errorHandlerMiddleware({ handle: () => true }),
  rateLimitMiddleware(),
  dedupMiddleware(),
  costEstimationMiddleware(),
  createHttpLink({ uri: '/graphql' }),
);
```

## API Reference

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `authRefreshMiddleware(config)` | Intercepts 401 responses, queues concurrent requests, calls refreshToken(), replays with new token. | function | |
| `AuthRefreshConfig` | Configuration for auth refresh middleware. | interface | |
| `AuthRefreshConfig.refreshToken` | Async function that returns a new token. | property | — |
| `AuthRefreshConfig.headerName` | Header to set the token on. | property | `Authorization` |
| `AuthRefreshConfig.triggerStatuses` | HTTP status codes that trigger a refresh. | property | `[401]` |
| `AuthRefreshConfig.maxAttempts` | Max refresh attempts per request. | property | `1` |
| `retryExchange(config?)` | Retries failed operations with exponential backoff and optional jitter. | function | |
| `RetryExchangeConfig` | Configuration for retry exchange middleware. | interface | |
| `RetryExchangeConfig.maxRetries` | Maximum number of retry attempts. | property | `3` |
| `RetryExchangeConfig.initialDelay` | Initial delay in ms before first retry. | property | `1000` |
| `RetryExchangeConfig.maxDelay` | Maximum delay cap in ms. | property | `30000` |
| `RetryExchangeConfig.exponent` | Backoff exponent multiplier. | property | `2` |
| `RetryExchangeConfig.jitter` | Randomizes delay between 50-100% of calculated value. | property | `true` |
| `RetryExchangeConfig.shouldRetry(result, attempt)` | Custom predicate to decide whether to retry. | property | `network error only` |
| `focusRefetchMiddleware(config?)` | Refetches stale queries on visibilitychange or window.focus. | function | |
| `FocusRefetchConfig` | Configuration for focus refetch middleware. | interface | |
| `FocusRefetchConfig.visibilityOnly` | Only refetch on visibilitychange, not window.focus. | property | `false` |
| `FocusRefetchConfig.minStaleSeconds` | Minimum age in seconds before a query is considered stale. | property | `30` |
| `offlineQueueMiddleware(config?)` | Buffers mutations in localStorage when offline, replays on online event. | function | |
| `OfflineQueueConfig` | Configuration for offline queue middleware. | interface | |
| `OfflineQueueConfig.storageKey` | localStorage key for persisted queue. | property | `__quenetiq_offline_queue` |
| `OfflineQueueConfig.maxQueue` | Maximum number of queued mutations. | property | `50` |
| `OfflineQueueConfig.autoReplay` | Automatically replay queue on online event. | property | `true` |
| `provideOfflineQueue(config?)` | Angular provider for the offline queue service. | function | |
| `OfflineQueueService` | Injectable queue manager for offline mutations. | class | |
| `OfflineQueueService.queue` | Read-only array of queued mutations. | property | |
| `OfflineQueueService.size` | Number of queued mutations. | property | |
| `OfflineQueueService.enqueue(query, variables)` | Adds a mutation to the offline queue. | method | |
| `OfflineQueueService.replay()` | Replays all queued mutations and returns results. | method | |
| `OfflineQueueService.clear()` | Clears all queued mutations. | method | |
| `OfflineQueueService.remove(id)` | Removes a specific mutation from the queue by ID. | method | |
| `autoMockMiddleware(config?)` | Generates mock GraphQL responses from a schema or field defaults. | function | |
| `AutoMockConfig` | Configuration for auto-mock middleware. | interface | |
| `AutoMockConfig.schema` | Schema SDL string for type-aware mocking. | property | — |
| `AutoMockConfig.mocks` | Custom mock resolvers keyed by type name. | property | — |
| `AutoMockConfig.delay` | Simulated network delay in ms. | property | `0` |
| `AutoMockConfig.passthrough` | Fall through to real network if mock generation fails. | property | `true` |
| `MockResolver` | Signature for custom mock resolver functions. | type | |
| `errorHandlerMiddleware(config)` | Catches errors and allows custom handling with optional recoverability. | function | |
| `ErrorHandlerConfig` | Configuration for error handler middleware. | interface | |
| `ErrorHandlerConfig.handle(error)` | Custom error handler returning boolean or Promise. | property | |
| `ErrorHandlerConfig.fallbackMessage` | Fallback message when error has no message. | property | `An error occurred` |
| `rateLimitMiddleware(config?)` | Sliding-window rate limiter per request key. | function | |
| `RateLimitConfig` | Configuration for rate limit middleware. | interface | |
| `RateLimitConfig.maxRequests` | Max requests allowed per window. | property | `10` |
| `RateLimitConfig.windowMs` | Time window in milliseconds. | property | `1000` |
| `RateLimitConfig.key(request)` | Function to derive a rate-limit key from the request. | property | `() => "default"` |
| `dedupMiddleware()` | Deduplicates in-flight queries sharing the same query + variables. | function | |
| `costEstimationMiddleware(config?)` | Estimates query complexity and warns or blocks expensive queries. | function | |
| `CostEstimationConfig` | Configuration for cost estimation middleware. | interface | |
| `CostEstimationConfig.maxCost` | Maximum allowed cost before blocking. | property | `1000` |
| `CostEstimationConfig.warnAt` | Cost threshold for console warnings. | property | `500` |
| `CostEstimationConfig.depthFactor` | Multiplier per nesting level. | property | `0.5` |
| `CostEstimationConfig.mode` | Action when cost exceeds max: block, warn, or pass. | property | `warn` |
| `estimateQueryCost(query, depthFactor?)` | Analyzes query string and returns detailed cost breakdown. | function | |
| `QueryCost` | Query complexity analysis result. | interface | |
| `QueryCost.fields` | Raw field count. | property | |
| `QueryCost.depth` | Maximum nesting depth. | property | |
| `QueryCost.cost` | Weighted cost = sum of (1 + depth x depthFactor) per field. | property | |
| `QueryCost.fragments` | Number of fragment spreads. | property | |
| `QueryCost.aliases` | Number of aliased fields. | property | |
| `QueryCost.details` | Human-readable per-field breakdown. | property | |

## Try it live

:::stackblitz starter="middlewares"
