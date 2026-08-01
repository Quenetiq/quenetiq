---
title: 'useFragment'
slug: vue-use-fragment
group: 'Frameworks'
order: 4
since: '0.0.1'
tags: [vue, composables, fragment, cache]
description: 'Reactive cache fragment reader by __typename + id.'
---

# useFragment

Reads a normalized entity from the cache by `__typename` + `id`. No network request — pure cache lookup. Returns `{ data, complete }` where `data` is a reactive `Ref` that updates when the cached entity changes.

```vue
<script setup>
import { useFragment, gql } from '@quenetiq/vue';

const TODO_FIELDS = gql`
	fragment TodoFields on Todo {
		id
		title
		completed
	}
`;

const { data, complete } = useFragment(TODO_FIELDS, {
	__typename: 'Todo',
	id: props.todoId,
});
</script>

<template>
	<p v-if="complete && data">{{ data.title }}</p>
	<p v-else>Todo not found in cache</p>
</template>
```

## API

| Name                                | Type                                           | Description                                            |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| `useFragment(fragment, identifier)` | composable                                     | Reads a normalized cache entity by `__typename` + `id` |
| `identifier`                        | `{ __typename: string; id: string \| number }` | Cache entity identifier                                |
| `data`                              | `Ref<TData \| null>`                           | Entity data from cache                                 |
| `complete`                          | `boolean`                                      | `true` when the entity was found in cache              |
