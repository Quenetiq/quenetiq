---
title: 'Query & Mutate'
slug: client-operations
group: 'Core'
order: 2
since: '0.0.1'
tags: [client, query, mutate, refetch]
description: 'Execute GraphQL queries, mutations and refetches'
---

# Query & Mutate

## query

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

Supports automatic deduplication when `config.dedup` is enabled.

## mutate

```typescript
const ADD_TODO = gql`
	mutation AddTodo($title: String!) {
		addTodo(title: $title) {
			id
			title
		}
	}
`;

const result = await client.mutate(ADD_TODO, { title: 'Hello' });
```

Automatically invalidates the normalized cache on success.

## refetch

```typescript
const result = await client.refetch(GET_TODOS);
```

Bypasses the dedup cache and re-fetches the query from the network.

## Endpoint

```typescript
client.setEndpoint('/api/v2/graphql');
console.log(client.endpoint); // '/api/v2/graphql'
```

## API Reference

| Member                                     | Type     | Description                                                        |
| ------------------------------------------ | -------- | ------------------------------------------------------------------ |
| `query(document, variables?, endpoint?)`   | method   | Executes a GraphQL query. Supports dedup.                          |
| `mutate(document, variables?, endpoint?)`  | method   | Executes a mutation. Handles file uploads, auto-invalidates cache. |
| `refetch(document, variables?, endpoint?)` | method   | Bypasses dedup, re-fetches a query.                                |
| `setEndpoint(url)`                         | method   | Changes the GraphQL endpoint URL at runtime.                       |
| `endpoint`                                 | property | Current GraphQL endpoint URL. Default: `'/graphql'`                |
| `getCacheService()`                        | method   | Returns the `CacheStore` instance or `null`.                       |
