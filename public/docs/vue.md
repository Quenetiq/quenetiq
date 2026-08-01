---
title: '@quenetiq/vue'
slug: vue
group: 'Frameworks'
order: 2
since: '0.0.1'
tags: [vue, composables]
description: 'Vue composables and plugin'
---

# @quenetiq/vue

Vue composables for `@quenetiq/client`. Provides composables, components, directives, and a Vue plugin for global client registration.

**Size:** ~2.8 kB min+gzip
**Dependencies:** `vue`, `@quenetiq/client`

## Installation

```bash
npm install @quenetiq/vue
```

## Quick Start

```vue
<script setup>
import { createQuenetiqPlugin, useQuery, gql } from '@quenetiq/vue';
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
const { data, loading, error } = useQuery(GET_TODOS);
</script>

<template>
	<p v-if="loading">Loading…</p>
	<p v-else-if="error">{{ error }}</p>
	<ul v-else>
		<li v-for="todo in data.todos" :key="todo.id">{{ todo.title }}</li>
	</ul>
</template>
```

## Plugin Setup

```ts
import { createApp } from 'vue';
import { createQuenetiqPlugin } from '@quenetiq/vue';

const app = createApp(App);
app.use(createQuenetiqPlugin(client));
app.mount('#app');
```

## Features

| Feature                                 | Description                                  |
| --------------------------------------- | -------------------------------------------- |
| [useQuery](vue-use-query)               | Reactive query composable                    |
| [useMutation](vue-use-mutation)         | Mutation composable with optimistic updates  |
| [useSubscription](vue-use-subscription) | WebSocket subscription composable            |
| [useFragment](vue-use-fragment)         | Fragment cache read composable               |
| [useLiveQuery](vue-live-query)          | Real-time query + subscription               |
| [Suspense & SSR](vue-suspense)          | Suspense and SSR composables                 |
| [Directives](vue-directives)            | v-qtq-mutate and v-qtq-loading directives    |
| [useVal](vue-val)                       | Reactive value composable with null handling |

## Plugin API

| Name                           | Description                                 | Type       |
| ------------------------------ | ------------------------------------------- | ---------- |
| `createQuenetiqPlugin(client)` | Vue plugin factory                          | function   |
| `useClient()`                  | Returns QuenetiqClient from composition API | composable |

## Re-exports

`gql`, `isSuccess`, `isError`, `unwrap`, `unwrapOrThrow` from `@quenetiq/client`.

## Starters

:::stackblitz starter="vue"
