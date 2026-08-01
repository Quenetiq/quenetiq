---
title: 'Cache Helpers'
slug: cache-helpers
group: 'Core'
order: 1
since: '0.0.1'
tags: [cache, helpers, keys, meta, snapshot, optimistic]
description: 'Standalone cache helper functions'
---

# Cache Helpers

The `@quenetiq/cache` package exports a set of standalone helper functions for working with cache keys, metadata, snapshots, and optimistic updates.

## Cache Keys

| Function                              | Returns          | Description                                                                          |
| ------------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `simpleKey(typename, id)`             | `string`         | Creates `typename:id` composite key                                                  |
| `buildKey(typename, entity, policy?)` | `string \| null` | Builds key via `policy.keyFn` or `policy.keyFields`; falls back to `id`, then `null` |
| `inlineKey(typename)`                 | `string`         | Generates a unique inline key for entities without an ID (counter-based)             |
| `resetInlineCounter()`                | `void`           | Resets the inline key counter                                                        |
| `allKeys(entities)`                   | `string[]`       | Returns all entity keys from a cache map                                             |
| `keysByType(entities, typename)`      | `string[]`       | Returns keys matching a given typename prefix                                        |
| `getEntityTypes(entities)`            | `string[]`       | Extracts all unique typenames from cache keys                                        |

```typescript
import { simpleKey, buildKey, allKeys, keysByType } from '@quenetiq/cache';

const k1 = simpleKey('Todo', '1'); // 'Todo:1'

const customKey = buildKey('Post', { slug: 'hello-world' }, { keyFields: ['slug'] });
// 'Post:hello-world'

const cache = new Map<string, CacheEntity>();
cache.set('Todo:1', { __typename: 'Todo', id: '1' });
cache.set('Todo:2', { __typename: 'Todo', id: '2' });
cache.set('User:1', { __typename: 'User', id: '1' });

allKeys(cache); // ['Todo:1', 'Todo:2', 'User:1']
keysByType(cache, 'Todo'); // ['Todo:1', 'Todo:2']
getEntityTypes(cache); // ['Todo', 'User']
```

## Cache Metadata

Entity metadata tracks lifecycle timestamps, sources, and merge counts.

| Function                       | Returns                   | Description                                                              |
| ------------------------------ | ------------------------- | ------------------------------------------------------------------------ |
| `getMeta(meta, key)`           | `EntityMeta \| undefined` | Retrieves metadata for a specific entity key                             |
| `getAllMeta(meta)`             | `Map<string, EntityMeta>` | Returns a shallow copy of the entire metadata map                        |
| `getEntityAge(meta, key)`      | `number \| undefined`     | Age in ms since last update                                              |
| `isStale(meta, key, maxAge)`   | `boolean`                 | `true` if entity is older than `maxAge` ms                               |
| `touchMeta(meta, key, source)` | `void`                    | Creates or updates entity metadata (`updatedAt`, `source`, `mergeCount`) |

```typescript
import { getMeta, getEntityAge, isStale, touchMeta } from '@quenetiq/cache';

const meta = new Map<string, EntityMeta>();
touchMeta(meta, 'Todo:1', 'query');

const entityMeta = getMeta(meta, 'Todo:1');
// { createdAt: 1234, updatedAt: 1234, source: 'query', mergeCount: 1 }

const age = getEntityAge(meta, 'Todo:1');
const stale = isStale(meta, 'Todo:1', 60_000);
```

## Snapshots

Serialize and restore the full cache state (entities + metadata).

```typescript
import { takeSnapshot, restoreSnapshot, type CacheSnapshot } from '@quenetiq/cache';

const entities = new Map<string, CacheEntity>();
const meta = new Map<string, EntityMeta>();

// Capture snapshot
const snapshot: CacheSnapshot = takeSnapshot(entities, meta);

// Serialize to JSON
const json = JSON.stringify(snapshot);

// Restore from snapshot
restoreSnapshot(entities, meta, JSON.parse(json));
```

## Optimistic Updates

Low-level optimistic update primitives used by `CacheStore.applyOptimistic()`.

```typescript
import { applyOptimistic, rollbackOptimistic, commitOptimistic } from '@quenetiq/cache';

const entities = new Map<string, CacheEntity>();
entities.set('Post:42', { __typename: 'Post', id: '42', likes: 10 });

const optimistics = new Map<string, () => void>();

// Apply optimistic update
applyOptimistic(entities, optimistics, {
	id: 'opt-like',
	apply: (cache) => {
		const post = cache.get('Post:42');
		if (post) cache.set('Post:42', { ...post, likes: (post.likes as number) + 1 });
	},
});

console.log(entities.get('Post:42')?.likes); // 11

// Rollback on error → restores `likes` to 10
rollbackOptimistic(entities, optimistics, 'opt-like');

// Or commit on success
commitOptimistic(optimistics, 'opt-like');
```

## Type Guard

```typescript
import { isCacheEntity } from '@quenetiq/cache';

if (isCacheEntity(value)) {
	// value is narrowed to CacheEntity
	console.log(value.__typename);
}
```
