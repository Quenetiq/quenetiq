---
title: '@quenetiq/react'
slug: react
group: 'Frameworks'
order: 1
since: '0.0.1'
tags: [react, hooks]
description: 'React hooks and components'
---

# @quenetiq/react

React bindings for `@quenetiq/client`. Provides hooks, components, and a `QuenetiqProvider` context wrapper.

**Size:** ~3.0 kB min+gzip
**Dependencies:** `react`, `@quenetiq/client`

## Installation

```bash
npm install @quenetiq/react
```

## Quick Start

```tsx
import { QuenetiqProvider, useQuery, gql } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const GET_TODOS = gql`
	query Todos {
		todos {
			id
			title
		}
	}
`;

function Todos() {
	const { data, loading, error } = useQuery(GET_TODOS);
	if (loading) return <p>Loading…</p>;
	if (error) return <p>Error: {error}</p>;
	return (
		<ul>
			{data.todos.map((todo) => (
				<li key={todo.id}>{todo.title}</li>
			))}
		</ul>
	);
}

function App() {
	return (
		<QuenetiqProvider client={client}>
			<Todos />
		</QuenetiqProvider>
	);
}
```

## Features

| Feature                                   | Description                              |
| ----------------------------------------- | ---------------------------------------- |
| [useQuery](react-use-query)               | Reactive query hook                      |
| [useMutation](react-use-mutation)         | Mutation hook with optimistic updates    |
| [useSubscription](react-use-subscription) | WebSocket subscription hook              |
| [useFragment](react-use-fragment)         | Fragment cache read hook                 |
| [useLiveQuery](react-live-query)          | Real-time query + subscription           |
| [Suspense & SSR](react-suspense)          | Suspense and SSR hooks                   |
| [Components](react-components)            | RateLimitGate and render-prop components |
| [useVal](react-val)                       | Reactive value hook with null handling   |

## Provider

| Name                    | Description                                           | Type      |
| ----------------------- | ----------------------------------------------------- | --------- |
| `QuenetiqProvider`      | Context provider that injects client + optional cache | component |
| `QuenetiqProviderProps` | `{ client, cache?, children }`                        | interface |
| `useClient()`           | Returns QuenetiqClient from context                   | hook      |
| `useCache()`            | Returns CacheStore \| null from context               | hook      |

## Re-exports

`gql`, `isSuccess`, `isError`, `unwrap`, `unwrapOrThrow`, `CacheStore` from `@quenetiq/client`.

## Starters

:::stackblitz starter="react"
