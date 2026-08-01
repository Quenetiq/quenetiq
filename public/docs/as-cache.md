---
title: 'asCache'
slug: as-cache
group: 'Core'
order: 6
since: '1.0.6-beta'
tags: [observables, cache, reader]
description: 'Reactive cache reader'
---

# asCache

Creates an RxJS `Observable` that reads a cached query result and emits future updates.

```typescript
import { asCache } from '@quenetiq/observables';

const cached$ = asCache(store, 'PostsQuery');
cached$.subscribe((data) => {
	// 1st value: current cached data (or null)
	// Subsequent: cache updates
});
```

Normalizes `undefined` to `null` for consistent output.

## lastValueFromCache

Promise-based cache reader for async/await contexts:

```typescript
import { lastValueFromCache } from '@quenetiq/observables';

const data = await lastValueFromCache(store, 'PostsQuery');
// T | null
```

## readHash

Direct cache entity reader by typename and optional ID:

```typescript
import { readHash } from '@quenetiq/observables';

const user = readHash(store, 'User', '1'); // User | null
const allUsers = readHash(store, 'User'); // User[] | null
```

## API

| Signature                              | Returns                 | Description                |
| -------------------------------------- | ----------------------- | -------------------------- |
| `asCache(store, queryHash)`            | `Observable<T \| null>` | Reactive cache reader      |
| `lastValueFromCache(store, queryHash)` | `Promise<T \| null>`    | Promise-based cache reader |
| `readHash(store, typename, id?)`       | `T \| T[] \| null`      | Direct cache entity reader |
