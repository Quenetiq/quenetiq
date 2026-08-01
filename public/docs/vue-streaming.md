---
title: 'Streaming'
slug: vue-streaming
group: 'Frameworks'
order: 9
since: '1.0.6-beta'
tags: [vue, streaming, defer, stream, incremental]
description: 'useStreamQuery composable for @defer and @stream incremental delivery'
---

# Streaming (Vue)

`useStreamQuery` renders GraphQL `@defer` / `@stream` responses incrementally. It wraps `client.queryDefer()`, which auto-merges incremental patches, so every emission is the full merged result up to that point.

## useStreamQuery

```vue
<script setup lang="ts">
import { useStreamQuery, gql } from '@quenetiq/vue';

const STREAM_CHARACTERS = gql`
	query StreamCharacters {
		characters @defer {
			name
			friends @stream {
				name
			}
		}
	}
`;

const { data, loading, status, error, start, stop } = useStreamQuery(STREAM_CHARACTERS);

start();
</script>

<template>
	<div>
		<p v-if="loading">Loading…</p>
		<p v-if="status === 'streaming'">Streaming…</p>
		<p v-if="error">Error: {{ error }}</p>
		<ul>
			<li v-for="c in data?.characters" :key="c.name">{{ c.name }}</li>
		</ul>
	</div>
</template>
```

Unlike `useQuery`, the stream does **not** start automatically — call `start()` to begin and `stop()` to abort. The stream is aborted automatically on unmount.

## Options

| Option        | Type                                  | Description                          |
| ------------- | ------------------------------------- | ------------------------------------ |
| `variables`   | `TVariables`                          | Query variables                      |
| `onData`      | `(data: TData) => void`               | Called on every incremental emission |
| `onError`     | `(error: string, errorCode?) => void` | Called when the stream fails         |
| `onCompleted` | `(data: TData) => void`               | Called with the final merged result  |

## Result

All values except `start`/`stop` are reactive refs:

| Field       | Type                                                   | Description                  |
| ----------- | ------------------------------------------------------ | ---------------------------- |
| `data`      | `Ref<TData \| null>`                                   | Latest merged data           |
| `loading`   | `Ref<boolean>`                                         | Stream in flight             |
| `status`    | `Ref<'idle' \| 'streaming' \| 'completed' \| 'error'>` | Stream status                |
| `error`     | `Ref<string \| null>`                                  | Error message                |
| `errorCode` | `Ref<ErrorCode \| undefined>`                          | Categorized error code       |
| `start`     | `() => void`                                           | Start or restart the stream  |
| `stop`      | `() => void`                                           | Abort the in-progress stream |

## API Reference

| Member                               | Type       | Description                                                        |
| ------------------------------------ | ---------- | ------------------------------------------------------------------ |
| `useStreamQuery(document, options?)` | composable | Stream `@defer`/`@stream` query results                            |
| `StreamStatus`                       | type       | `'idle' \| 'streaming' \| 'completed' \| 'error'`                  |
| `UseStreamQueryOptions`              | interface  | `variables`, `onData`, `onError`, `onCompleted`                    |
| `UseStreamQueryResult`               | interface  | `data`, `loading`, `status`, `error`, `errorCode`, `start`, `stop` |
