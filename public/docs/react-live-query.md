---
title: 'useLiveQuery'
slug: react-live-query
group: 'Frameworks'
order: 5
since: '0.0.2-alpha.1'
tags: [react, hooks, live-query, subscription]
description: 'Combines a one-shot query with a WebSocket subscription for real-time updates.'
---

# useLiveQuery

Combines a query with a subscription for real-time updates. Automatically subscribes after the initial fetch and merges incoming changes.

```tsx
import { useLiveQuery, gql } from '@quenetiq/react';

const { data, loading, error } = useLiveQuery(
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
```

## Options

| Option            | Type                  | Default           | Description                     |
| ----------------- | --------------------- | ----------------- | ------------------------------- |
| `variables`       | `Record<string, any>` | —                 | Query / subscription variables  |
| `wsEndpoint`      | `string`              | HTTP→WS transform | WebSocket URL                   |
| `shouldSubscribe` | `boolean`             | `true`            | Conditionally enable/disable WS |
| `onCompleted`     | `(data) => void`      | —                 | Callback on query or WS update  |
| `onError`         | `(error) => void`     | —                 | Callback with error             |

## Result

| Field       | Type                  | Description                            |
| ----------- | --------------------- | -------------------------------------- |
| `data`      | `TData \| null`       | Latest data from query or subscription |
| `loading`   | `boolean`             | True while initial query in-flight     |
| `error`     | `string \| null`      | Error message                          |
| `errorCode` | `string \| undefined` | Categorised error code                 |
