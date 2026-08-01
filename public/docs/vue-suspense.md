---
title: 'Suspense & SSR'
slug: vue-suspense
group: 'Frameworks'
order: 6
since: '0.0.1'
tags: [vue, composables, suspense, ssr]
description: 'Suspense-aware query composables for SSR and streaming.'
---

# Suspense & SSR

`useSuspenseQuery` integrates with Vue's `<Suspense>` for async data loading. The returned `promise` can be passed to `onServerPrefetch` for server-side rendering. `useBackgroundQuery` kicks off a query early and returns a `QueryRef` handle.

## useSuspenseQuery

```vue
<script setup>
import { useSuspenseQuery, gql } from '@quenetiq/vue';

const { data, promise } = useSuspenseQuery(gql`
	query {
		todos {
			id
			title
		}
	}
`);

onServerPrefetch(() => promise);
</script>

<template>
	<Suspense>
		<ul>
			<li v-for="todo in data?.todos" :key="todo.id">{{ todo.title }}</li>
		</ul>
	</Suspense>
</template>
```

## useBackgroundQuery / useReadQuery

```vue
<script setup>
import { useBackgroundQuery, useReadQuery, gql } from '@quenetiq/vue';

const queryRef = useBackgroundQuery(gql`
	query {
		todos {
			id
			title
		}
	}
`);

// Later, in a child component:
const { data } = useReadQuery(queryRef);
</script>
```

## API

| Name                                       | Description                                                                      | Type       |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ---------- |
| `useSuspenseQuery(document, variables?)`   | Suspense-aware query. Returns `{ data, error, loading, promise }` refs.          | composable |
| `useBackgroundQuery(document, variables?)` | Returns a `QueryRef` — kicks off query eagerly.                                  | composable |
| `useReadQuery(queryRef)`                   | Unwraps a `QueryRef` into `{ data }`.                                            | composable |
| `UseSuspenseQueryResult`                   | `{ data: Ref, error: Ref, loading: Ref, promise: Promise }`                      | interface  |
| `QueryRef`                                 | `{ data: Ref, error: Ref, loading: Ref, refetch: () => Promise<GraphQLResult> }` | interface  |
