---
title: Persisted Queries
slug: persisted-queries
group: Features
order: 6
since: 0.0.1
tags:
  - apq
  - persisted
description: Automatic Persisted Queries
---

# @quenetiq/persisted-queries

The persisted-queries package implements Automatic Persisted Queries (APQ), allowing the client to send a hash of the query string instead of the full query body. This reduces bandwidth for large queries and improves performance on slow networks.

## APQ Middleware

Add the `apqMiddleware` to your middleware chain to enable automatic persisted queries. The middleware will first attempt to send the query hash; if the server responds with a `PersistedQueryNotFound` error, it automatically retries with the full query string:

```ts
import { apqMiddleware } from '@quenetiq/persisted-queries';
import { composeMiddlewares, createHttpLink } from '@quenetiq/core';

const link = composeMiddlewares(apqMiddleware(), createHttpLink({ uri: '/graphql' }));
```

## Wire Format

On the wire, the first request looks like this. The server returns `PersistedQueryNotFound` if it doesn't have the query cached:

```json
// What gets sent on the wire:
{
	"operationName": "Books",
	"extensions": {
		"persistedQuery": {
			"version": 1,
			"sha256Hash": "9b6c6b8f0e9a1c3d7f5e2b4a8d0c6e1f3a5b7c9d0e2f4a6b8c0d2e4f6a8b0c"
		}
	}
}
```

## Starters

:::stackblitz starter="persisted-queries"

:::stackblitz starter="angular"

:::stackblitz starter="react"

:::stackblitz starter="vue"

## API Reference

| Name                                                  | Description                                                                                                                                                         | Type     | Default                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------- |
| `apqMiddleware(config?)`                              | Automatic Persisted Query middleware. First sends only the SHA-256 hash, retries with full query on PersistedQueryNotFound. Optionally uses GET for hashed queries. | function |                                             |
| `PersistedQueryService`                               | Injectable Angular service for executing queries through the persisted query middleware chain.                                                                      | class    |                                             |
| `PersistedQueryService.execute(document, variables?)` | Executes a GraphQL query through the persisted query pipeline.                                                                                                      | method   | `document: DocumentNode, variables?: TVars` |
