---
title: 'useSubscription'
slug: vue-use-subscription
group: 'Frameworks'
order: 3
since: '0.0.1'
tags: [vue, composables, subscription]
description: 'WebSocket subscription composable with auto-reconnect.'
---

# useSubscription

Connects to a WebSocket subscription. Returns reactive `{ data, loading, error }`. Supports **auto-reconnect** with exponential backoff.

```vue
<script setup>
import { useSubscription, gql } from '@quenetiq/vue';

const { data } = useSubscription(
	gql`
		subscription OnMessage {
			messageAdded {
				content
			}
		}
	`,
	{ reconnect: true, reconnectInterval: 2000, maxReconnects: 5 },
);
</script>

<template>
	<p>{{ data?.messageAdded?.content }}</p>
</template>
```

## Options

| Option              | Type                                        | Default           | Description                   |
| ------------------- | ------------------------------------------- | ----------------- | ----------------------------- |
| `variables`         | `Record<string, any>`                       | —                 | Subscription variables        |
| `wsEndpoint`        | `string`                                    | HTTP→WS transform | WebSocket URL                 |
| `shouldSubscribe`   | `boolean`                                   | `true`            | Conditionally enable/disable  |
| `reconnect`         | `boolean`                                   | `false`           | Enable auto-reconnect         |
| `reconnectInterval` | `number`                                    | `2000`            | Base reconnect interval in ms |
| `maxReconnects`     | `number`                                    | `5`               | Max attempts before giving up |
| `onNext`            | `(data: TData) => void`                     | —                 | Callback per payload          |
| `onError`           | `(error: string, code?: ErrorCode) => void` | —                 | Callback on error             |
| `onComplete`        | `() => void`                                | —                 | Callback on completion        |

## Result

| Field       | Type                          | Description                 |
| ----------- | ----------------------------- | --------------------------- |
| `data`      | `Ref<TData \| null>`          | Latest subscription payload |
| `loading`   | `Ref<boolean>`                | True while connecting       |
| `error`     | `Ref<string \| null>`         | Error message               |
| `errorCode` | `Ref<ErrorCode \| undefined>` | Categorised error code      |
