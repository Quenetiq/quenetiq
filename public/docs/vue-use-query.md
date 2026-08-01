---
title: 'useQuery'
slug: vue-use-query
group: 'Frameworks'
order: 1
since: '0.0.1'
tags: [vue, composables, query]
description: 'Reactive query composable with polling, skip, and pagination support.'
---

# useQuery

Executes a query on mount. Returns reactive `{ data, loading, error, refetch, fetchMore }`. All values are Vue `ref`s. Supports `onServerPrefetch` for SSR.

```vue
<script setup>
import { useQuery, gql } from '@quenetiq/vue';

const GET_TODOS = gql`
	query Todos {
		todos {
			id
			title
		}
	}
`;
const { data, loading, error, refetch } = useQuery(GET_TODOS);
</script>

<template>
	<p v-if="loading">Loading…</p>
	<p v-else-if="error">{{ error }}</p>
	<ul v-else>
		<li v-for="todo in data.todos" :key="todo.id">{{ todo.title }}</li>
	</ul>
</template>
```

## Options

| Option         | Type                                        | Default | Description              |
| -------------- | ------------------------------------------- | ------- | ------------------------ |
| `variables`    | `Record<string, any>`                       | —       | Query variables          |
| `pollInterval` | `number`                                    | —       | Auto-poll interval in ms |
| `skip`         | `boolean`                                   | `false` | Skip the query on mount  |
| `onCompleted`  | `(data: TData) => void`                     | —       | Callback on success      |
| `onError`      | `(error: string, code?: ErrorCode) => void` | —       | Callback on error        |

## Result

| Field           | Type                                           | Description                                                 |
| --------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| `data`          | `Ref<TData \| null>`                           | Response data                                               |
| `loading`       | `Ref<boolean>`                                 | True while request is in-flight                             |
| `error`         | `Ref<string \| null>`                          | Error message                                               |
| `errorCode`     | `Ref<ErrorCode \| undefined>`                  | Categorised error code                                      |
| `networkStatus` | `Ref<NetworkStatus>`                           | `'loading' \| 'ready' \| 'error' \| 'refetching' \| 'poll'` |
| `called`        | `Ref<boolean>`                                 | True once the query has fired                               |
| `refetch`       | `(vars?: Variables) => Promise<GraphQLResult>` | Re-execute the query                                        |
| `fetchMore`     | `(mergeFn, vars?) => Promise<GraphQLResult>`   | Pagination helper                                           |
