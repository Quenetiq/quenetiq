---
title: 'watchQuery'
slug: watch-query
group: 'Core'
order: 5
since: '1.0.6-beta'
tags: [observables, watch, query]
description: 'Combined fetch + cache observation'
---

# watchQuery

Combines an initial network fetch with cache observation for a complete reactive data flow.

```typescript
import { watchQuery, type WatchQueryOptions } from '@quenetiq/observables';

const posts$ = watchQuery(store, {
	queryHash: 'PostsQuery',
	fetch: () => fetch('/api/posts').then((r) => r.json()),
});

posts$.subscribe((data) => {
	// Emits cache updates and fresh fetch results
});
```

On subscription:

1. Starts observing the cache via `observeQuery`
2. Simultaneously calls the `fetch` function
3. Emits cache updates and fetch results to subscriber

## API

| Signature                    | Returns                          | Description                        |
| ---------------------------- | -------------------------------- | ---------------------------------- |
| `watchQuery(store, options)` | `Observable<TData \| undefined>` | Combined fetch + cache observation |

### WatchQueryOptions

| Field       | Type                   | Description            |
| ----------- | ---------------------- | ---------------------- |
| `queryHash` | `string`               | Cache query hash       |
| `fetch`     | `() => Promise<TData>` | Network fetch function |
