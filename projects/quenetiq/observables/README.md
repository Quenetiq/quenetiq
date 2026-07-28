<h1 align="center">@quenetiq/observables</h1>

<p align="center"><b>RxJS operators for @quenetiq/cache — observe entities, watch queries, cache-first / stale-while-revalidate patterns.</b></p>

---

## Install

```bash
npm install @quenetiq/observables @quenetiq/cache rxjs
```

## Operators

### observeEntity

Emits an entity from the normalized cache whenever it is written, merged, or evicted.

```ts
import { observeEntity } from '@quenetiq/observables';

observeEntity(store, 'User', '1').subscribe((user) => {
  console.log(user); // { __typename: 'User', id: '1', name: 'Alice', ... } | undefined
});
```

### observeQuery

Emits a cached query result when any of its entity dependencies change. Extracts entity references from the cached data (`__typename` + `id`) and listens for write/merge/evict events on those entities.

```ts
import { observeQuery } from '@quenetiq/observables';

observeQuery(store, 'query:users').subscribe((data) => {
  console.log(data); // cached query result or undefined
});
```

Optionally pass a custom `extractData` function for reading the query:

```ts
observeQuery(store, 'q:users', () => store.readQuery('q:users')).subscribe(…);
```

### cacheFirst

Emits cached data immediately if available, then fetches fresh data. Good for instant UI while background-refreshing.

```ts
import { cacheFirst } from '@quenetiq/observables';

const fetchUsers = () => api.get('/users');

cacheFirst(store, 'q:users', fetchUsers).subscribe((data) => {
  // 1. cached data (if any)
  // 2. fresh data from fetch
});
```

Also available as a pipeable operator:

```ts
import { cacheFirstPipe } from '@quenetiq/observables';

source$.pipe(cacheFirstPipe(store, 'q:users', fetchUsers));
```

### staleWhileRevalidate

Emits cached data immediately (stale), then fetches in background. Unlike `cacheFirst`, fetch errors are silently swallowed when cached data exists.

```ts
import { staleWhileRevalidate } from '@quenetiq/observables';

staleWhileRevalidate(store, 'q:users', fetchUsers).subscribe((data) => {
  // 1. stale cached data
  // 2. fresh data (or no error if fetch fails + cache exists)
});
```

### invalidateOn

Re-subscribes the source Observable when a watched entity changes. Useful for re-fetching data on mutation.

```ts
import { invalidateOn } from '@quenetiq/observables';
import { interval } from 'rxjs';

interval(5000).pipe(
  invalidateOn(store, 'User', '1')
).subscribe(() => {
  // re-fetches whenever User:1 changes
});
```

### watchQuery

Fetches data, then observes the cached query result. Combines initial fetch + `observeQuery` for automatic re-emission on entity changes.

```ts
import { watchQuery } from '@quenetiq/observables';

watchQuery(store, {
  queryHash: 'q:users',
  fetch: fetchUsers,
}).subscribe((data) => {
  // 1. fetch result
  // 2. re-emitted when any entity the query depends on changes
});
```

## Debug Operators

### lastValueFromCache

Returns a Promise that resolves to the cached query result, or `null`.

```ts
import { lastValueFromCache } from '@quenetiq/observables';

const data = await lastValueFromCache(store, 'q:users');
```

### asCache

Returns an Observable that emits the current cached value and re-emits when entity dependencies change.

```ts
import { asCache } from '@quenetiq/observables';

asCache(store, 'q:users').subscribe((data) => {
  console.log(data); // cached value or null
});
```

### readHash

Reads an entity (or all entities of a type) from the normalized cache.

```ts
import { readHash } from '@quenetiq/observables';

const user = readHash(store, 'User', '1');       // single entity or null
const users = readHash(store, 'User');            // all User entities or null
```

### watchEntity

Watches a single entity by `__typename` + `id`. Emits immediately, updates on write/merge, emits `null` on evict.

```ts
import { watchEntity } from '@quenetiq/observables';

watchEntity(store, 'User', '1').subscribe((user) => {
  // initial value → updates → null on eviction
});
```
