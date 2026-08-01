---
title: 'staleWhileRevalidate'
slug: stale-while-revalidate
group: 'Core'
order: 4
since: '1.0.6-beta'
tags: [observables, swr]
description: 'Stale-while-revalidate strategy'
---

# staleWhileRevalidate

Implements a **stale-while-revalidate** strategy. Similar to `cacheFirst`, but **tolerates fetch failures** when cached data exists.

```typescript
import { staleWhileRevalidate } from '@quenetiq/observables';

const posts$ = staleWhileRevalidate(store, 'PostsQuery', () => fetch('/api/posts').then((r) => r.json()));
```

If the fetch fails but cached data is present, the observable **completes successfully** with the stale data. Only errors if there's no cached data AND the fetch fails.

## API

| Signature                                       | Returns                          | Description                     |
| ----------------------------------------------- | -------------------------------- | ------------------------------- |
| `staleWhileRevalidate(store, queryHash, fetch)` | `Observable<TData \| undefined>` | Stale-while-revalidate strategy |
