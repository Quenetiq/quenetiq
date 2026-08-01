---
title: 'Streaming'
slug: react-streaming
group: 'Frameworks'
order: 9
since: '1.0.6-beta'
tags: [react, streaming, defer, stream, incremental]
description: 'useStreamQuery hook for @defer and @stream incremental delivery'
---

# Streaming (React)

`useStreamQuery` renders GraphQL `@defer` / `@stream` responses incrementally. It wraps `client.queryDefer()`, which auto-merges incremental patches, so every emission is the full merged result up to that point.

## useStreamQuery

```tsx
import { useStreamQuery, gql } from '@quenetiq/react';

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

function CharactersList() {
	const { data, loading, status, error, start, stop } = useStreamQuery(STREAM_CHARACTERS);

	useEffect(() => {
		start();
		return () => stop();
	}, [start, stop]);

	return (
		<div>
			{loading && <p>Loading…</p>}
			{status === 'streaming' && <p>Streaming…</p>}
			{error && <p>Error: {error}</p>}
			<ul>
				{data?.characters.map((c: { name: string }) => (
					<li key={c.name}>{c.name}</li>
				))}
			</ul>
		</div>
	);
}
```

Unlike `useQuery`, the stream does **not** start automatically — call `start()` to begin and `stop()` to abort.

## Options

| Option        | Type                                  | Description                          |
| ------------- | ------------------------------------- | ------------------------------------ |
| `variables`   | `TVariables`                          | Query variables                      |
| `onData`      | `(data: TData) => void`               | Called on every incremental emission |
| `onError`     | `(error: string, errorCode?) => void` | Called when the stream fails         |
| `onCompleted` | `(data: TData) => void`               | Called with the final merged result  |

## Result

| Field       | Type                                              | Description                  |
| ----------- | ------------------------------------------------- | ---------------------------- |
| `data`      | `TData \| null`                                   | Latest merged data           |
| `loading`   | `boolean`                                         | Stream in flight             |
| `status`    | `'idle' \| 'streaming' \| 'completed' \| 'error'` | Stream status                |
| `error`     | `string \| null`                                  | Error message                |
| `errorCode` | `ErrorCode \| undefined`                          | Categorized error code       |
| `start`     | `() => void`                                      | Start or restart the stream  |
| `stop`      | `() => void`                                      | Abort the in-progress stream |

## API Reference

| Member                               | Type      | Description                                                        |
| ------------------------------------ | --------- | ------------------------------------------------------------------ |
| `useStreamQuery(document, options?)` | hook      | Stream `@defer`/`@stream` query results                            |
| `StreamStatus`                       | type      | `'idle' \| 'streaming' \| 'completed' \| 'error'`                  |
| `UseStreamQueryOptions`              | interface | `variables`, `onData`, `onError`, `onCompleted`                    |
| `UseStreamQueryResult`               | interface | `data`, `loading`, `status`, `error`, `errorCode`, `start`, `stop` |
