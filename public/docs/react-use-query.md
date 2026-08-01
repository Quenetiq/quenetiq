---
title: 'useQuery'
slug: react-use-query
group: 'Frameworks'
order: 1
since: '0.0.1'
tags: [react, hooks, query]
description: 'Reactive query hook with polling, skip, fetchPolicy, and pagination support.'
---

# useQuery

Executes a query on mount. Returns reactive `{ data, loading, error, refetch, fetchMore }`. Automatically refetches when variables change.

```tsx
import { useQuery, gql } from '@quenetiq/react';

const GET_TODOS = gql`
	query Todos {
		todos {
			id
			title
		}
	}
`;

function Todos() {
	const { data, loading, error, refetch } = useQuery(GET_TODOS);

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
```

## Options

| Option         | Type                                            | Default         | Description              |
| -------------- | ----------------------------------------------- | --------------- | ------------------------ |
| `variables`    | `Record<string, any>`                           | —               | Query variables          |
| `pollInterval` | `number`                                        | —               | Auto-poll interval in ms |
| `skip`         | `boolean`                                       | `false`         | Skip the query on mount  |
| `fetchPolicy`  | `'cache-first' \| 'network-only' \| 'no-cache'` | `'cache-first'` | Cache strategy           |

## Result

| Field           | Type                                                        | Description                            |
| --------------- | ----------------------------------------------------------- | -------------------------------------- |
| `data`          | `TData \| null`                                             | Response data                          |
| `loading`       | `boolean`                                                   | True while request is in-flight        |
| `error`         | `string \| null`                                            | Error message                          |
| `errorCode`     | `string \| undefined`                                       | Categorised error code                 |
| `networkStatus` | `'loading' \| 'ready' \| 'error' \| 'refetching' \| 'poll'` | Current network status                 |
| `called`        | `boolean`                                                   | True once the query has fired          |
| `refetch`       | `(vars?: Variables) => void`                                | Re-execute with optional new variables |
| `fetchMore`     | `(mergeFn, vars?) => void`                                  | Merge pagination helper                |
