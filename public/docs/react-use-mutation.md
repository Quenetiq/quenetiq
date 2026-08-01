---
title: 'useMutation'
slug: react-use-mutation
group: 'Frameworks'
order: 2
since: '0.0.1'
tags: [react, hooks, mutation]
description: 'Mutation hook with optimistic cache updates.'
---

# useMutation

Returns a mutate function and reactive result state. Supports **optimistic updates** via the `optimistic` option — receives the `CacheStore` and returns an ID. The update is automatically committed on success or rolled back on error.

```tsx
import { useMutation, gql } from '@quenetiq/react';

const ADD_TODO = gql`
	mutation AddTodo($title: String!) {
		addTodo(title: $title) {
			id
			title
		}
	}
`;

function AddTodoForm() {
	const [mutate, { data, loading, error }] = useMutation(ADD_TODO);
	return <button onClick={() => mutate({ title: 'New' })}>Add</button>;
}
```

## Optimistic Updates

```tsx
const [mutate] = useMutation(ADD_TODO, {
	optimistic: (cache) => {
		cache.applyOptimistic({
			id: 'opt-1',
			entities: [{ __typename: 'Todo', id: 'temp-1', title: 'New' }],
		});
		return 'opt-1';
	},
});
```

## Result

| Field       | Type                                | Description                      |
| ----------- | ----------------------------------- | -------------------------------- |
| `mutate`    | `(vars?) => Promise<GraphQLResult>` | Execute the mutation             |
| `data`      | `TData \| null`                     | Response data                    |
| `loading`   | `boolean`                           | True while in-flight             |
| `error`     | `string \| null`                    | Error message                    |
| `errorCode` | `string \| undefined`               | Categorised error code           |
| `called`    | `boolean`                           | True once mutate has been called |
