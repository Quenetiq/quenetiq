---
title: '@quenetiq/client'
slug: client
group: 'Core'
order: 1
since: '0.0.1'
tags: [client, graphql]
description: 'Framework-agnostic GraphQL client'
---

# @quenetiq/client

The framework-agnostic GraphQL client. Works in React, Vue, Svelte, Node, or any JS environment. Provides
`QuenetiqClient` with query, mutate, refetch, streaming, middleware pipeline, and normalized cache
integration.

**Size:** ~2.1 kB min+gzip
**Dependencies:** `graphql`

## Installation

```bash
npm install @quenetiq/client
```

## Quick Start

```typescript
import { createClient, gql, isSuccess } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const GET_TODOS = gql`
	query Todos {
		todos {
			id
			title
		}
	}
`;
const result = await client.query<{ todos: Todo[] }>(GET_TODOS);
if (isSuccess(result)) {
	console.log(result.data.todos);
}
```

## Features

| Feature                             | Description                                |
| ----------------------------------- | ------------------------------------------ |
| [createClient](client-create)       | Factory function and configuration options |
| [Query & Mutate](client-operations) | Execute queries, mutations, and refetch    |
| [Middleware](client-middleware)     | Middleware pipeline for requests           |
| [Streaming](client-streaming)       | @defer/@stream incremental delivery        |
| [File Upload](client-upload)        | Multipart file upload support              |
| [Val](client-val)                   | Value container with null handling         |

## Configuration

### `createClient(config, cache?)`

Factory function that creates and returns a configured `QuenetiqClient` instance. Accepts a `ClientConfig` and optional `CacheStore`.

### `QuenetiqClient`

| Member                                         | Type     | Description                     |
| ---------------------------------------------- | -------- | ------------------------------- |
| `query(document, variables?, endpoint?)`       | method   | Executes a GraphQL query        |
| `mutate(document, variables?, endpoint?)`      | method   | Executes a GraphQL mutation     |
| `refetch(document, variables?, endpoint?)`     | method   | Bypasses dedup and re-fetches   |
| `queryStream(document, variables?, endpoint?)` | method   | Streaming for @defer/@stream    |
| `setEndpoint(url)`                             | method   | Changes endpoint URL at runtime |
| `endpoint`                                     | property | Current GraphQL endpoint URL    |

## Result Types

| Member                  | Type     | Description                                                             |
| ----------------------- | -------- | ----------------------------------------------------------------------- |
| `GraphQLResult<T>`      | type     | `{ status: "success", data } \| { status: "error", error, errorCode? }` |
| `isSuccess(result)`     | function | Type guard for success variant                                          |
| `isError(result)`       | function | Type guard for error variant                                            |
| `unwrap(result)`        | function | Returns data or null                                                    |
| `unwrapOrThrow(result)` | function | Returns data or throws                                                  |

## Starters

:::stackblitz starter="client"

:::stackblitz starter="angular"

:::stackblitz starter="react"

:::stackblitz starter="vue"
