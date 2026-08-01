---
title: 'Response Diff Logging'
slug: response-diff
group: 'Core'
order: 6
since: '1.0.0'
tags: [core, diff, logging, response, debugging]
description: 'Response diff logging utility'
---

# Response Diff Logging

`responseDiffLogging()` creates a callback that logs changes between consecutive responses for the same query. Useful for debugging and performance monitoring.

```typescript
import { responseDiffLogging, type DiffEntry } from '@quenetiq/core';
```

## Usage

```typescript
const logs: DiffEntry[] = [];

const diffLogger = responseDiffLogging({
	// Called when a diff is detected
	onDiff: (entry) => logs.push(entry),
	// Also log to console (default: true)
	console: true,
});

// Use with middleware pipeline
const middleware = (request, next) => {
	return next(request).pipe(
		tap((result) => {
			if (result.status === 'success') {
				diffLogger({
					timestamp: Date.now(),
					query: 'MyQuery',
					changedFields: [],
					previousData: {},
					newData: result.data,
				});
			}
		}),
	);
};
```

## Diff Detection

The logger keeps a map of previous results keyed by query string (or custom `keyFn`). When a new result arrives, it performs a deep comparison and:

- Reports the changed field paths
- Stores the previous and new data snapshots
- Logs to console (optionally)
- Calls the `onDiff` callback

## API Reference

| Signature                      | Returns                      | Description                    |
| ------------------------------ | ---------------------------- | ------------------------------ |
| `responseDiffLogging(config?)` | `(entry: DiffEntry) => void` | Creates a diff logger callback |

### Config

| Option    | Type                            | Default | Description                             |
| --------- | ------------------------------- | ------- | --------------------------------------- |
| `onDiff`  | `(entry: DiffEntry) => void`    | —       | Callback when a diff is detected        |
| `console` | `boolean`                       | `true`  | Whether to log to console               |
| `keyFn`   | `(query, variables?) => string` | —       | Custom key function for mapping results |

### DiffEntry

| Field           | Type       | Description            |
| --------------- | ---------- | ---------------------- |
| `timestamp`     | `number`   | Timestamp of the diff  |
| `query`         | `string`   | Query name or hash     |
| `changedFields` | `string[]` | Fields that changed    |
| `previousData`  | `unknown`  | Previous data snapshot |
| `newData`       | `unknown`  | New data snapshot      |
