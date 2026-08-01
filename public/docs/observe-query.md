---
title: 'observeQuery'
slug: observe-query
group: 'Core'
order: 2
since: '1.0.6-beta'
tags: [observables, query, watch]
description: 'Watch a cached query result'
---

# observeQuery

Creates an RxJS `Observable` that watches a cached query result by `queryHash`.

```typescript
import { observeQuery } from '@quenetiq/observables';

const posts$ = observeQuery(store, 'PostsQuery');
posts$.subscribe((data) => console.log('Query data:', data));
```

Emits immediately, then re-emits whenever any referenced entity is written, merged, or evicted. Uses entity references (`{ __typename, id }`) from cached data to determine which entities to watch.

## API

| Signature                                             | Returns                          | Description                 |
| ----------------------------------------------------- | -------------------------------- | --------------------------- |
| `observeQuery<TData>(store, queryHash, extractData?)` | `Observable<TData \| undefined>` | Watch a cached query result |
