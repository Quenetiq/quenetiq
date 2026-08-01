---
title: 'useFragment'
slug: react-use-fragment
group: 'Frameworks'
order: 4
since: '0.0.1'
tags: [react, hooks, fragment]
description: 'Subscribes to a normalized cache fragment and re-renders on entity updates.'
---

# useFragment

Subscribes to a normalized fragment by `__typename` + `id`. Returns `{ data, complete }` — re-renders whenever that entity updates in the cache.

```tsx
import { useFragment, gql } from '@quenetiq/react';

const TODO_FIELDS = gql`
	fragment TodoFields on Todo {
		id
		title
		completed
	}
`;

function TodoItem({ todoId }: { todoId: string }) {
	const { data, complete } = useFragment(TODO_FIELDS, {
		__typename: 'Todo',
		id: todoId,
	});

	if (!complete) return <p>Loading fragment…</p>;
	return <p>{data.title}</p>;
}
```

## Parameters

| Param        | Type                                 | Description                  |
| ------------ | ------------------------------------ | ---------------------------- |
| `fragment`   | `DocumentNode`                       | GraphQL fragment document    |
| `identifier` | `{ __typename: string, id: string }` | Entity to resolve from cache |

## Result

| Field      | Type            | Description                         |
| ---------- | --------------- | ----------------------------------- |
| `data`     | `TData \| null` | Fragment data from cache            |
| `complete` | `boolean`       | True when fully resolved from cache |
