---
title: 'Suspense & SSR'
slug: react-suspense
group: 'Frameworks'
order: 6
since: '0.0.1'
tags: [react, hooks, suspense, ssr]
description: 'Suspense-powered hooks: useSuspenseQuery, useBackgroundQuery, useReadQuery, usePrefetch.'
---

# Suspense & SSR

## useSuspenseQuery

Suspense-powered query. Throws a promise until data is available.

```tsx
import { useSuspenseQuery, gql } from '@quenetiq/react';

function TodoList() {
	const { data } = useSuspenseQuery(gql`
		query {
			todos {
				id
				title
			}
		}
	`);
	return (
		<ul>
			{data.todos.map((t) => (
				<li key={t.id}>{t.title}</li>
			))}
		</ul>
	);
}
```

## useBackgroundQuery / useReadQuery

Starts fetching in a parent component. Pass the `QueryRef` to a child via `useReadQuery`.

```tsx
import { useBackgroundQuery, useReadQuery, gql } from '@quenetiq/react';

function Parent() {
	const queryRef = useBackgroundQuery(gql`
		query {
			todos {
				id
				title
			}
		}
	`);
	return <Child queryRef={queryRef} />;
}

function Child({ queryRef }) {
	const { data } = useReadQuery(queryRef);
	return (
		<ul>
			{data.todos.map((t) => (
				<li key={t.id}>{t.title}</li>
			))}
		</ul>
	);
}
```

## usePrefetch

Fires a query ahead of navigation for route-level prefetching.

```tsx
import { usePrefetch, gql } from '@quenetiq/react';

function prefetch() {
	const prefetchQuery = usePrefetch(gql`
		query {
			todos {
				id
				title
			}
		}
	`);
	return prefetchQuery();
}
```

## API

| Hook                                  | Description                                         |
| ------------------------------------- | --------------------------------------------------- |
| `useSuspenseQuery(query, options?)`   | Suspense-powered query, returns fully resolved data |
| `useBackgroundQuery(query, options?)` | Starts fetch in parent, returns `QueryRef`          |
| `useReadQuery(queryRef)`              | Reads resolved data from a `QueryRef`               |
| `usePrefetch(document)`               | Fires a query ahead of navigation                   |
