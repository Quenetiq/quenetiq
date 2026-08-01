---
title: 'Garbage Collection'
slug: cache-gc
group: 'Core'
order: 3
since: '0.0.1'
tags: [cache, gc, ttl, eviction]
description: 'Reference counting and TTL eviction'
---

# Garbage Collection

`CacheGc` uses **reference counting** with **TTL eviction**. When a query result references entities, call `track()` to increment their refcount. When the query is no longer active, call `release()`. Entities with refcount = 0 are marked _dangling_ and evicted after the TTL expires (default: 60 seconds).

**Safety guarantee:** an entity is never evicted while its refcount > 0, even if `sweep()` is called.

```typescript
import { CacheGc } from '@quenetiq/cache';

const gc = new CacheGc(normalizedCache, 60_000); // 60s TTL

// Increment reference when a query uses an entity
gc.track([{ __typename: 'Todo', id: '1' }]);

// Decrement when the query unsubscribes
gc.release([{ __typename: 'Todo', id: '1' }]);

// Evict entities dangling beyond TTL
const evicted = gc.sweep(); // { evicted: number, count: number }

// Check ref count
console.log(gc.refCountOf('Todo', '1')); // 0 after release+sweep
```

## API Reference

| Member                     | Type                                     | Description                                                     |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `CacheGc`                  | class                                    | Reference-counting GC with TTL eviction                         |
| constructor                | `cache: NormalizedCache, ttlMs?: number` | Bind to a cache                                                 |
| `track(entities)`          | method                                   | Increment refcount for each entity                              |
| `release(entities)`        | method                                   | Decrement refcount for each entity                              |
| `sweep()`                  | method                                   | Evict zero-ref entities past TTL. Returns `{ evicted, count }`. |
| `refCountOf(typename, id)` | method                                   | Current reference count for an entity                           |
