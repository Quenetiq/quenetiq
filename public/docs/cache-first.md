---
title: 'cacheFirst'
slug: cache-first
group: 'Core'
order: 3
since: '1.0.6-beta'
tags: [observables, cache-first]
description: 'Cache-first strategy with network fetch'
---

# cacheFirst

Implements a **cache-first** strategy: emits cached data immediately, then fetches fresh data from the network.

```typescript
import { cacheFirst } from '@quenetiq/observables';

const posts$ = cacheFirst(store, 'PostsQuery', () => fetch('/api/posts').then((r) => r.json()));

posts$.subscribe((data) => {
	// 1st emission: cached data (or undefined)
	// 2nd emission: fresh data from fetch
});
```

If the fetch fails and no cached data exists, the observable errors.

## cacheFirstPipe

A pipeable operator version for use inside `.pipe()` chains:

```typescript
import { cacheFirstPipe } from '@quenetiq/observables';

source$.pipe(
  cacheFirstPipe(() => fetchPosts(), store, 'PostsQuery'),
).subscribe(data => ...);
```

## API

| Signature                                 | Returns                          | Description                   |
| ----------------------------------------- | -------------------------------- | ----------------------------- |
| `cacheFirst(store, queryHash, fetch)`     | `Observable<TData \| undefined>` | Cache-first strategy          |
| `cacheFirstPipe(fetch, store, queryHash)` | `OperatorFunction`               | Pipeable cache-first operator |
