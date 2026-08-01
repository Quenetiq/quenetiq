---
title: 'Middleware'
slug: client-middleware
group: 'Core'
order: 3
since: '0.0.1'
tags: [client, middleware, auth, logging]
description: 'Intercept and transform requests with middleware'
---

# Middleware

The middleware pipeline lets you intercept and transform every request.

## Built-in Middleware

```typescript
import { createClient, authMiddleware, loggingMiddleware } from '@quenetiq/client';

const client = createClient({
	endpoint: '/graphql',
	middleware: [authMiddleware('my-token'), loggingMiddleware('Todos')],
});
```

## authMiddleware

Attaches `Authorization: Bearer <token>` to every request. Accepts an optional custom header name.

```typescript
authMiddleware('eyJhbGci...', 'X-API-Key');
```

## loggingMiddleware

Logs each operation with type, query snippet, and duration.

```typescript
loggingMiddleware('MyApp');
```

## Custom Middleware

```typescript
import { GraphqlMiddleware, isSuccess } from '@quenetiq/client';

const timingMiddleware: GraphqlMiddleware = async (request, next) => {
	const start = performance.now();
	const result = await next(request);
	const elapsed = performance.now() - start;
	console.log(`${request.type} took ${elapsed}ms`);
	return result;
};
```

## composeMiddlewares

The `applyMiddleware` function composes an array of middlewares into a single async pipeline using `reduceRight`.

## API Reference

| Member                               | Type      | Description                                                                                                          |
| ------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `GraphqlRequestContext`              | interface | Request context: `query`, `variables`, `headers`, `type`, `endpoint`, `extensions`, `method`, `onTypenamesExtracted` |
| `GraphqlMiddleware`                  | type      | `(request, next) => Promise<GraphQLResult<unknown>>`                                                                 |
| `GraphqlMiddlewareNext`              | type      | Next handler in the async middleware chain                                                                           |
| `applyMiddleware(middleware, final)` | function  | Composes middleware array into a single pipeline                                                                     |
| `authMiddleware(token, headerName?)` | function  | Attaches `Authorization: Bearer` header                                                                              |
| `loggingMiddleware(label?)`          | function  | Logs operation type, query snippet, and duration                                                                     |
