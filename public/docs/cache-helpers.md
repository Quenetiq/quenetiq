---
title: "Cache Helpers"
slug: cache-helpers
group: "Core"
order: 4
since: "0.0.1"
tags: [cache, helpers, keys, meta, snapshot, optimistic]
description: "Standalone helper functions for cache operations"
---

# Cache Helpers

Standalone helper functions exported from `@quenetiq/cache`. They operate on raw `Map` instances — useful for testing, building custom cache layers, or working directly with `NormalizedCache.all()` and `NormalizedCache.allMeta()`.

No class instantiation required.

## Key Helpers (`cache-keys`)

Build and query cache keys without touching the `NormalizedCache` class.

### `buildKey`

```typescript
buildKey(typename: string, entity: CacheEntity, policy?: TypePolicy): string | null
```

Builds a cache key for an entity. Uses `policy.keyFn` if provided, otherwise joins `policy.keyFields` (or falls back to `id`). Returns `null` if no key can be built.

```typescript
import { buildKey } from '@quenetiq/cache';

const entity = { __typename: 'Post', slug: 'hello-world', title: 'Hello' };

buildKey('Post', entity);                                        // null (no id, no keyFields)
buildKey('Post', entity, { keyFields: ['slug'] });              // "Post:hello-world"
buildKey('Post', entity, { keyFn: (e) => `post:${e.slug}` });  // "post:hello-world"
```

### `simpleKey`

```typescript
simpleKey(typename: string, id: string): string
```

Concatenates `"typename:id"` — the simplest key builder. Does not read the entity.

```typescript
simpleKey('User', '42');  // "User:42"
```

### `inlineKey`

```typescript
inlineKey(typename: string): string
```

Generates a unique key for entities without an id: `"typename:__inline__1"`, `"typename:__inline__2"`, etc. Counter resets with `resetInlineCounter()`.

```typescript
inlineKey('Todo');  // "Todo:__inline__1"
inlineKey('Todo');  // "Todo:__inline__2"
```

### `resetInlineCounter`

```typescript
resetInlineCounter(): void
```

Resets the `inlineKey` counter to `0`. Useful in tests to get deterministic keys.

### `allKeys`

```typescript
allKeys(entities: Map<string, CacheEntity>): string[]
```

Returns all cache keys from a map.

```typescript
const entities = new Map([
  ['Todo:1', { __typename: 'Todo', id: '1' }],
  ['Todo:2', { __typename: 'Todo', id: '2' }],
  ['User:1', { __typename: 'User', id: '1' }],
]);

allKeys(entities);  // ["Todo:1", "Todo:2", "User:1"]
```

### `keysByType`

```typescript
keysByType(entities: Map<string, CacheEntity>, typename: string): string[]
```

Returns keys filtered by typename prefix.

```typescript
keysByType(entities, 'Todo');  // ["Todo:1", "Todo:2"]
```

### `getEntityTypes`

```typescript
getEntityTypes(entities: Map<string, CacheEntity>): string[]
```

Extracts all unique typenames from key prefixes.

```typescript
getEntityTypes(entities);  // ["Todo", "User"]
```

## Meta Helpers (`cache-meta`)

Read and update entity metadata (`EntityMeta`) without a cache instance.

```typescript
interface EntityMeta {
  createdAt: number;
  updatedAt: number;
  source: string;
  mergeCount: number;
}
```

### `getMeta`

```typescript
getMeta(meta: Map<string, EntityMeta>, key: string): EntityMeta | undefined
```

Looks up metadata for a cache key.

```typescript
getMeta(meta, 'Todo:1');  // { createdAt: ..., updatedAt: ..., source: 'merge', mergeCount: 1 }
```

### `getAllMeta`

```typescript
getAllMeta(meta: Map<string, EntityMeta>): Map<string, EntityMeta>
```

Returns a shallow copy of the entire meta map.

### `getEntityAge`

```typescript
getEntityAge(meta: Map<string, EntityMeta>, key: string): number | undefined
```

Returns the age in milliseconds since the entity was last updated. `undefined` if key not found.

```typescript
getEntityAge(meta, 'Todo:1');  // 500
```

### `isStale`

```typescript
isStale(meta: Map<string, EntityMeta>, key: string, maxAge: number): boolean
```

Returns `true` if the entity was last updated more than `maxAge` ms ago, or if the key doesn't exist. Unknown entities are always considered stale.

```typescript
isStale(meta, 'Todo:1', 10_000);   // false (only 500ms old)
isStale(meta, 'Todo:1', 100);      // true (500ms > 100ms)
isStale(meta, 'Missing:1', 10_000); // true
```

### `touchMeta`

```typescript
touchMeta(meta: Map<string, EntityMeta>, key: string, source: string): void
```

Updates `updatedAt` and `source` on an existing entity, or creates a new `EntityMeta` entry. Increments `mergeCount` on updates.

```typescript
const meta = new Map<string, EntityMeta>();

touchMeta(meta, 'Todo:1', 'query');
// → { createdAt: 1722000000000, updatedAt: 1722000000000, source: 'query', mergeCount: 0 }

touchMeta(meta, 'Todo:1', 'merge');
// → { createdAt: 1722000000000, updatedAt: 1722000001000, source: 'merge', mergeCount: 1 }
```

## Snapshot Helpers (`cache-snapshot`)

Capture and restore full cache state as a structured object.

### `CacheSnapshot`

```typescript
interface CacheSnapshot {
  entities: [string, CacheEntity][];
  meta: [string, EntityMeta][];
}
```

### `takeSnapshot`

```typescript
takeSnapshot(entities: Map<string, CacheEntity>, meta: Map<string, EntityMeta>): CacheSnapshot
```

Serializes both maps into a `CacheSnapshot` — a plain object with `[key, value]` tuple arrays.

```typescript
import { takeSnapshot, restoreSnapshot, type CacheSnapshot } from '@quenetiq/cache';

const entities = new Map<string, CacheEntity>();
const meta = new Map<string, EntityMeta>();
entities.set('Todo:1', { __typename: 'Todo', id: '1', title: 'Hello' });
meta.set('Todo:1', { createdAt: 1722000000000, updatedAt: 1722000000000, source: 'query', mergeCount: 0 });

const snap: CacheSnapshot = takeSnapshot(entities, meta);
// { entities: [["Todo:1", {...}]], meta: [["Todo:1", {...}]] }
```

### `restoreSnapshot`

```typescript
restoreSnapshot(
  entities: Map<string, CacheEntity>,
  meta: Map<string, EntityMeta>,
  snapshot: CacheSnapshot
): void
```

Clears both maps and repopulates them from the snapshot. **Destructive** — replaces current state.

```typescript
const freshEntities = new Map<string, CacheEntity>();
const freshMeta = new Map<string, EntityMeta>();
restoreSnapshot(freshEntities, freshMeta, snap);

freshEntities.get('Todo:1');  // { __typename: 'Todo', id: '1', title: 'Hello' }
```

## Optimistic Helpers (`cache-optimistic`)

Apply, rollback, and commit optimistic updates with automatic key-level change tracking.

### `applyOptimistic`

```typescript
applyOptimistic(
  entities: Map<string, CacheEntity>,
  optimistics: Map<string, OptimisticUpdate>,
  update: OptimisticUpdate
): void
```

Captures a snapshot of changed keys, runs `update.apply()`, and stores the rollback closure. Subsequent `rollbackOptimistic()` restores only the changed keys.

```typescript
import { applyOptimistic, rollbackOptimistic, commitOptimistic } from '@quenetiq/cache';

const entities = new Map<string, CacheEntity>();
entities.set('Post:42', { __typename: 'Post', id: '42', likes: 10 });

const optimistics = new Map<string, OptimisticUpdate>();

applyOptimistic(entities, optimistics, {
  id: 'opt-like-42',
  apply: (cache) => {
    const post = cache.get('Post:42');
    if (post) cache.set('Post:42', { ...post, likes: (post.likes as number) + 1 });
  },
  rollback: () => {},  // key-level rollback is automatic
});

entities.get('Post:42')?.likes;  // 11
```

### `rollbackOptimistic`

```typescript
rollbackOptimistic(
  entities: Map<string, CacheEntity>,
  optimistics: Map<string, OptimisticUpdate>,
  id: string
): void
```

Finds the optimistic update by `id`, calls its `rollback()`, and removes it. Restores only the keys that changed during `apply()`.

```typescript
rollbackOptimistic(entities, optimistics, 'opt-like-42');
entities.get('Post:42')?.likes;  // 10
```

### `commitOptimistic`

```typescript
commitOptimistic(
  optimistics: Map<string, OptimisticUpdate>,
  id: string
): void
```

Permanently keeps the changes by simply removing the optimistic entry — no rollback happens.

```typescript
commitOptimistic(optimistics, 'opt-like-42');
entities.get('Post:42')?.likes;  // 11
```

## Type Guard

### `isCacheEntity`

```typescript
isCacheEntity(value: unknown): value is CacheEntity
```

Returns `true` if the value is an object with a string `__typename` property. Useful when narrowing unknown cache data.

```typescript
import { isCacheEntity } from '@quenetiq/cache';

const data: unknown = JSON.parse(raw);
if (isCacheEntity(data)) {
  console.log(data.__typename);  // safe to access
}
```
