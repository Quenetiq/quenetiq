---
title: 'useMutation'
slug: vue-use-mutation
group: 'Frameworks'
order: 2
since: '0.0.1'
tags: [vue, composables, mutation]
description: 'Mutation composable with optimistic cache updates.'
---

# useMutation

Returns a `mutate` function and reactive result state. Supports **optimistic updates** via the `optimistic` option — receives the `CacheStore` and returns an ID. The update is automatically committed on success or rolled back on error.

```vue
<script setup>
import { useMutation, gql } from '@quenetiq/vue';

const ADD_TODO = gql`
	mutation AddTodo($title: String!) {
		addTodo(title: $title) {
			id
			title
		}
	}
`;

const { mutate, data, loading, error } = useMutation(ADD_TODO);

function handleSubmit() {
	mutate({ title: 'New Todo' });
}
</script>
```

## Optimistic Updates

```ts
const { mutate } = useMutation(ADD_TODO, {
	optimistic: (cache) => {
		cache.applyOptimistic({
			id: 'opt-1',
			entities: [{ __typename: 'Todo', id: 'temp-1', title: 'New' }],
		});
		return 'opt-1';
	},
	onCompleted: (data) => console.log('Done', data),
	onError: (err) => console.error(err),
});
```

## Options

| Option        | Type                                                 | Default | Description                            |
| ------------- | ---------------------------------------------------- | ------- | -------------------------------------- |
| `variables`   | `Record<string, any>`                                | —       | Default mutation variables             |
| `onCompleted` | `(data: TData) => void`                              | —       | Callback on success                    |
| `onError`     | `(error: string, code?: ErrorCode) => void`          | —       | Callback on error                      |
| `update`      | `(cache: CacheStore, result: GraphQLResult) => void` | —       | Cache write after mutation             |
| `optimistic`  | `(cache: CacheStore) => string`                      | —       | Optimistic update callback, returns ID |

## Result

| Field       | Type                                           | Description                      |
| ----------- | ---------------------------------------------- | -------------------------------- |
| `mutate`    | `(vars?: Variables) => Promise<GraphQLResult>` | Execute the mutation             |
| `data`      | `Ref<TData \| null>`                           | Response data                    |
| `loading`   | `Ref<boolean>`                                 | True while in-flight             |
| `error`     | `Ref<string \| null>`                          | Error message                    |
| `errorCode` | `Ref<ErrorCode \| undefined>`                  | Categorised error code           |
| `called`    | `Ref<boolean>`                                 | True once mutate has been called |
