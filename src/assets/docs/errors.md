---
title: Error Handling
slug: errors
group: Middleware
order: 2
since: 0.0.3
tags: [errors, handler]
description: Typed error classes and handler
---

# @quenetiq/errors

Type-safe GraphQL error handling utilities. Provides discriminated error types and `isGraphQLError`, `isClientError`, `isNetworkError` type guards for unified error processing.

## Overview

`@quenetiq/errors` standardizes GraphQL error handling across the stack. It exports TypeScript type guards that narrow `unknown` errors to strongly typed error instances, plus a `getUserFacingMessage` helper for safe error display.

## Error Types

The package discriminates three error categories:

- **GraphQLError** — errors returned by the GraphQL server in the `errors` array.
- **NetworkError** — transport-level failures (fetch timeout, WebSocket disconnect, DNS).
- **ClientError** — library misuse (missing query, invalid variables, duplicate subscription).

## Handling Errors

```typescript
import { GraphQLError } from 'graphql';
import { isGraphQLError, isClientError, isNetworkError } from '@quenetiq/errors';

try {
  const data = await client.query({ query: MY_QUERY });
} catch (err: unknown) {
  if (isGraphQLError(err)) {
    // GraphQL response error with extensions, path, etc.
    console.error(err.extensions?.code);
  } else if (isNetworkError(err)) {
    // Fetch/WebSocket failure
    console.error('Network failure:', err.message);
  } else if (isClientError(err)) {
    // Validation / usage error from the client library
    console.error('Client error:', err.message);
  }
}
```

For user-facing messages without leaking internals:

```typescript
import { getUserFacingMessage } from '@quenetiq/errors';

function ErrorDisplay({ error }: { error: unknown }) {
  return <div className="error-banner">{getUserFacingMessage(error)}</div>;
}
```

## Discrimination

Each guard is a TypeScript `is` type predicate, so after a truthy check the value is narrowed to the correct type automatically:

```typescript
import { isGraphQLError } from '@quenetiq/errors';

// TypeScript type guard
if (isGraphQLError(err)) {
  // err is narrowed to GraphQLError<{ code: string }>
  console.log(err.extensions.code);
}
```

## API Reference

| Name | Description | Type |
| --- | --- | --- |
| `QuenetiqError` | Base error class for all Quenetiq errors with code, timestamp, and optional context. | class |
| `QuenetiqError.code` | Unique error code string. | property |
| `QuenetiqError.timestamp` | ISO timestamp of when the error was created. | property |
| `QuenetiqError.context` | Read-only context payload. | property |
| `QuenetiqError.toJSON()` | Serializes error to a plain object. | method |
| `GraphQLError` | Error representing a GraphQL response error with locations, path, and extensions. | class |
| `GraphQLError.locations` | Line/column locations in the query. | property |
| `GraphQLError.path` | Path to the field that caused the error. | property |
| `GraphQLError.extensions` | Extended error metadata from the server. | property |
| `GraphQLLocation` | Location with line and column numbers in a GraphQL document. | interface |
| `GraphQLLocation.line` | Line number. | property |
| `GraphQLLocation.column` | Column number. | property |
| `NetworkError` | Error representing a transport-level failure (timeout, offline, HTTP error). | class |
| `NetworkError.statusCode` | HTTP status code if applicable. | property |
| `NetworkError.statusText` | HTTP status text if applicable. | property |
| `NetworkErrorCode` | Enum of network error codes: TIMEOUT, OFFLINE, HTTP_ERROR, DNS_ERROR, ABORTED, UNKNOWN. | enum |
| `CacheError` | Error representing a cache operation failure (miss, serialization, GC, persistence). | class |
| `CacheErrorCode` | Enum of cache error codes: MISS, SERIALIZATION, GC, PERSISTENCE, INVALIDATION. | enum |
| `ValidationError` | Error representing a query or response validation failure. | class |
| `ValidationErrorCode` | Enum of validation error codes: MISSING_VARIABLES, INVALID_QUERY, TYPE_MISMATCH, MALFORMED_RESPONSE. | enum |
| `ErrorHandler` | Configurable error handler with filter-based routing and fallback throw behavior. | class |
| `ErrorHandler.on(filter, handler)` | Registers a handler for matching error codes or filter functions. Returns this for chaining. | method |
| `ErrorHandler.handle(error)` | Processes an error through registered handlers. Returns true if handled. | method |
| `ErrorHandler.reset()` | Clears all registered handlers. | method |
| `ErrorFilter` | Type alias for error filter function: `(error: QuenetiqError) => boolean`. | type |
| `ErrorHandlerFn` | Type alias for error handler function returning boolean, void, or Promise. | type |
| `ErrorHandlerConfig` | Configuration for ErrorHandler. | interface |
| `ErrorHandlerConfig.throwUnhandled` | Whether to throw errors not handled by any filter. | property (default: `true`) |

## Starters

:::stackblitz starter="errors"
