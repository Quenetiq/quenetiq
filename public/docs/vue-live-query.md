---
title: 'useLiveQuery'
slug: vue-live-query
group: 'Frameworks'
order: 5
since: '0.0.2-alpha.1'
tags: [vue, composables, live-query, realtime]
description: 'Real-time query composable that combines a one-shot query with a WebSocket subscription.'
---

# useLiveQuery

Combines a one-shot query with a WebSocket subscription for real-time updates. Fetches once, then subscribes and merges incoming changes automatically into the reactive `data` ref.

```vue
<script setup>
import { useLiveQuery, gql } from '@quenetiq/vue';

const { data, loading } = useLiveQuery(
	gql`
		subscription {
			todoUpdated {
				id
				title
			}
		}
	`,
	{ wsEndpoint: 'wss://api.example.com/graphql' },
);
</script>

<template>
	<p v-if="loading">Waiting for updates…</p>
	<p v-else>{{ data?.todoUpdated?.title }}</p>
</template>
```

## Options

| Option            | Type                                        | Default           | Description                                      |
| ----------------- | ------------------------------------------- | ----------------- | ------------------------------------------------ |
| `variables`       | `Record<string, any>`                       | —                 | Query / subscription variables                   |
| `wsEndpoint`      | `string`                                    | HTTP→WS transform | WebSocket URL                                    |
| `shouldSubscribe` | `boolean`                                   | `true`            | Conditionally enable/disable the WS subscription |
| `onCompleted`     | `(data: TData) => void`                     | —                 | Callback on query success or WS update           |
| `onError`         | `(error: string, code?: ErrorCode) => void` | —                 | Callback on error                                |

## Result

| Field       | Type                          | Description                           |
| ----------- | ----------------------------- | ------------------------------------- |
| `data`      | `Ref<TData \| null>`          | Merged real-time data                 |
| `loading`   | `Ref<boolean>`                | True while initial query is in-flight |
| `error`     | `Ref<string \| null>`         | Error message                         |
| `errorCode` | `Ref<ErrorCode \| undefined>` | Categorised error code                |
