---
title: 'useSubscription'
slug: react-use-subscription
group: 'Frameworks'
order: 3
since: '0.0.1'
tags: [react, hooks, subscription]
description: 'WebSocket subscription hook with auto-reconnect and exponential backoff.'
---

# useSubscription

Connects to a WebSocket subscription on mount, cleans up on unmount. Supports **auto-reconnect** with exponential backoff.

```tsx
import { useSubscription, gql } from '@quenetiq/react';

function MessageFeed() {
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

	return <p>{data?.messageAdded?.content}</p>;
}
```

## Options

| Option              | Type                  | Default           | Description                   |
| ------------------- | --------------------- | ----------------- | ----------------------------- |
| `variables`         | `Record<string, any>` | —                 | Subscription variables        |
| `wsEndpoint`        | `string`              | HTTP→WS transform | WebSocket URL                 |
| `shouldSubscribe`   | `boolean`             | `true`            | Conditionally enable/disable  |
| `reconnect`         | `boolean`             | `false`           | Enable auto-reconnect         |
| `reconnectInterval` | `number`              | `2000`            | Base reconnect interval in ms |
| `maxReconnects`     | `number`              | `5`               | Max reconnect attempts        |
| `onNext`            | `(data) => void`      | —                 | Callback with each payload    |
| `onError`           | `(error) => void`     | —                 | Callback on error             |
| `onComplete`        | `() => void`          | —                 | Callback on stream complete   |

## Result

| Field       | Type                  | Description                   |
| ----------- | --------------------- | ----------------------------- |
| `data`      | `TData \| null`       | Latest subscription data      |
| `loading`   | `boolean`             | True while initial connection |
| `error`     | `string \| null`      | Error message                 |
| `errorCode` | `string \| undefined` | Categorised error code        |
