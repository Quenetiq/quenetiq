---
title: '@quenetiq/cache'
slug: cache
group: 'Core'
order: 3
since: '0.0.1'
tags: [cache, normalized]
description: 'Normalized cache with type policies'
---

# @quenetiq/cache

The cache package provides a normalized, in-memory cache for GraphQL data. It uses a key-value document store
where every object is normalized by its
`__typename` + `id` (or a custom key function), avoiding data duplication and enabling
automatic updates.

**Size:** ~3.5 kB min+gzip
**Dependencies:** (none — zero-dependency)

## Installation

```bash
npm install @quenetiq/cache
```

## Architecture

Every GraphQL response is **normalized** into a flat dictionary of entities. Instead of storing
deeply nested response trees, the cache stores each object once — keyed by `__typename:id` — and
references it by key. This eliminates data duplication and enables automatic updates across all queries.

```
Server Response:                    Normalized Cache:                   Query Result:
{                                   Todo:1 → { __typename:"Todo",       todos → [Todo:1, Todo:2]
  todos: [{                           id:"1", title:"Hello",           Todo:1.author → User:1
    id: "1",                          author: User:1 }                 Todo:2.author → User:1
    title: "Hello",                 Todo:2 → { __typename:"Todo",
    author: { id: "1",                id:"2", title:"World",
      name: "Alice" }                 author: User:1 }
  }, {                             User:1 → { __typename:"User",
    id: "2",                          id:"1", name:"Alice" }
    title: "World",                 }
    author: { id: "1",
      name: "Alice" }
  }]
}
```

### Architecture Layers

- **CacheService** — Angular DI wrapper — RxJS `watchLocal()`, auto-restore
- **CacheStore** — Orchestrator — query, write, merge, evict, optimistic, gc, persist
  - **NormalizedCache** — Entity store + type policies
  - **CacheGc** — Reference counting + TTL
  - **CachePersistence** — localStorage / memory fallback

## Features

| Feature                                  | Description                                        |
| ---------------------------------------- | -------------------------------------------------- |
| [NormalizedCache](normalized-cache)      | Low-level entity store with type policies          |
| [CacheService (Angular)](cache-service)  | Angular `@Injectable` wrapper for `CacheStore`     |
| [Garbage Collection](cache-gc)           | Reference counting and TTL eviction                |
| [Cache Persistence](cache-persistence)   | localStorage persistence layer                     |
| [Smart Persistence](smart-persistence)   | Entity-level persistence with per-type TTL         |
| [Cache Migration](cache-migration)       | Version migration for persisted cache data         |
| [Cache Helpers](cache-helpers)           | Standalone helper functions (keys, meta, snapshot) |
| [Optimistic Updates](optimistic-updates) | Key-level optimistic updates with rollback         |
| [Type Policies](type-policies)           | Custom key fields and merge strategies             |
| [Local State](local-state)               | UI-local state alongside normalized entities       |
| [Cache Metrics](cache-metrics)           | Performance metrics and hit rate tracking          |
| [Cache Events](cache-events)             | Typed event emitter for all cache operations       |
| [Cross-Tab Sync](cross-tab-sync)         | BroadcastChannel-based cache synchronization       |

## API Reference

### NormalizedCache

| Member                      | Type   | Description                                                                                             |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `NormalizedCache`           | class  | Low-level entity store. Holds entities in a flat `Map<string, CacheEntity>` keyed by `TypeName:id`.     |
| `constructor`               | method | Creates a new store with optional type policies. Signature: `typePolicies?: Record<string, TypePolicy>` |
| `get(typename, id?)`        | method | Get entity by typename+id, or all entities of a type when id is omitted.                                |
| `set(entity)`               | method | Store an entity. Overwrites if same key exists.                                                         |
| `merge(entity)`             | method | Partial merge — only updates fields present in the input.                                               |
| `remove(typename, id?)`     | method | Remove entity(ies). If id is omitted, removes all of the given typename.                                |
| `all()`                     | method | Returns the underlying `Map<string, CacheEntity>`.                                                      |
| `clear()`                   | method | Removes all entities from the store.                                                                    |
| `count()`                   | method | Returns the number of entities in the store.                                                            |
| `has(typename, id)`         | method | Returns true if an entity with the given key exists.                                                    |
| `key(typename, id)`         | method | Builds the internal key string (`TypeName:id`).                                                         |
| `snapshot()`                | method | Serializes all entities to a JSON string.                                                               |
| `restore(json)`             | method | Deserializes and restores entities from a JSON string. Appends to existing data.                        |
| `setTypePolicies(policies)` | method | Updates type policies after construction.                                                               |
| `applyOptimistic(update)`   | method | Applies an optimistic update on top of current cache.                                                   |
| `rollbackOptimistic(id)`    | method | Removes the top-most optimistic layer by id, restoring previous state.                                  |
| `commitOptimistic(id)`      | method | Permanently merges the optimistic layer into the base cache, then removes it.                           |

### CacheStore

| Member                                   | Type     | Description                                                                                                |
| ---------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `CacheStore`                             | class    | High-level orchestrator that combines `NormalizedCache`, `CacheGc`, local state, and optional persistence. |
| `constructor`                            | method   | Creates a `CacheStore` with optional config. Signature: `config?: CacheStoreConfig`                        |
| `cache`                                  | property | Public readonly reference to the underlying `NormalizedCache`.                                             |
| `gc`                                     | property | Public readonly reference to the underlying `CacheGc` instance.                                            |
| `write(entity)`                          | method   | Writes an entity to the cache with normalization. Tracks GC reference.                                     |
| `query(typename, id)`                    | method   | Reads a single entity. Tracks GC reference. Returns `undefined` if not found.                              |
| `merge(entity)`                          | method   | Partial merge of an entity. Tracks GC reference.                                                           |
| `evict(typename, id)`                    | method   | Removes an entity and releases its GC reference.                                                           |
| `persist()`                              | method   | Writes the full cache snapshot (entities + local state) to the persistence layer.                          |
| `serialize()`                            | method   | Returns the cache as a JSON string.                                                                        |
| `deserialize(json)`                      | method   | Restores cache from a JSON string. Appends to existing data.                                               |
| `collectGarbage()`                       | method   | Runs GC sweep and returns the number of evicted entities.                                                  |
| `applyOptimistic(update)`                | method   | Applies an optimistic update with key-level change tracking.                                               |
| `rollbackOptimistic(id)`                 | method   | Rolls back an optimistic update by id.                                                                     |
| `commitOptimistic(id)`                   | method   | Permanently commits an optimistic update.                                                                  |
| `readLocal(key)`                         | method   | Reads a local state value by key.                                                                          |
| `writeLocal(key, value)`                 | method   | Writes a local state value. Triggers `watchLocal` listeners.                                               |
| `watchLocal(key, listener)`              | method   | Subscribes to local state changes. Returns unsubscribe function.                                           |
| `writeLocalWithTypes(key, value, types)` | method   | Writes local state scoped to a set of GraphQL type names.                                                  |
| `clearLocalState()`                      | method   | Clears all local state values.                                                                             |
| `clearLocalStateByTypes(types)`          | method   | Clears local state values scoped to the given type names.                                                  |
| `setTypePolicies(policies)`              | method   | Replaces type policies at runtime.                                                                         |
| `createCache(config?)`                   | function | Factory function that returns a new `CacheStore` instance.                                                 |

### CacheService (Angular)

| Member                                   | Type     | Description                                                                                                                       |
| ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `CacheService`                           | class    | Angular `@Injectable()` wrapper around `CacheStore`. Exposes the same methods plus RxJS `watchLocal()`.                           |
| `constructor`                            | method   | Accepts an optional `CachePersistenceService` for auto-restore on init. Signature: `persistSvc?: CachePersistenceService \| null` |
| `cache`                                  | property | Public readonly reference to the underlying `NormalizedCache`.                                                                    |
| `gc`                                     | property | Public readonly reference to the underlying `CacheGc` instance.                                                                   |
| `write(entity)`                          | method   | Writes an entity with normalization and GC tracking.                                                                              |
| `query(typename, id)`                    | method   | Reads a single entity with GC tracking.                                                                                           |
| `merge(entity)`                          | method   | Partial merge with GC tracking.                                                                                                   |
| `evict(typename, id)`                    | method   | Evicts an entity from the cache.                                                                                                  |
| `persist()`                              | method   | Persists cache to the configured storage.                                                                                         |
| `serialize()`                            | method   | Serializes cache to JSON string.                                                                                                  |
| `deserialize(json)`                      | method   | Restores cache from JSON string.                                                                                                  |
| `collectGarbage()`                       | method   | Runs GC sweep, returns evicted count.                                                                                             |
| `applyOptimistic(update)`                | method   | Applies an optimistic update.                                                                                                     |
| `rollbackOptimistic(id)`                 | method   | Rolls back an optimistic update.                                                                                                  |
| `commitOptimistic(id)`                   | method   | Commits an optimistic update.                                                                                                     |
| `readLocal(key)`                         | method   | Reads a local state value.                                                                                                        |
| `watchLocal(key)`                        | method   | Returns an `Observable<unknown>` that emits the current value and all subsequent changes.                                         |
| `writeLocal(key, value)`                 | method   | Writes a local state value.                                                                                                       |
| `writeLocalWithTypes(key, value, types)` | method   | Writes local state scoped to a set of GraphQL type names.                                                                         |
| `clearLocalState()`                      | method   | Clears all local state.                                                                                                           |
| `clearLocalStateByTypes(types)`          | method   | Clears local state for the given type names.                                                                                      |
| `setTypePolicies(policies)`              | method   | Sets type policies at runtime.                                                                                                    |
| `provideCacheService(persistSvc?)`       | function | Angular provider for `CacheService`. Also provides `GRAPHQL_CACHE` token.                                                         |
| `provideCachePersistence(config?)`       | function | Angular provider for `CachePersistenceService` with auto-init.                                                                    |

### CacheGc

| Member                     | Type   | Description                                                                                             |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `CacheGc`                  | class  | Reference-counting garbage collector with optional TTL eviction.                                        |
| `constructor`              | method | Creates a GC instance bound to a `NormalizedCache`. Signature: `cache: NormalizedCache, ttlMs?: number` |
| `track(entities)`          | method | Increments reference count for each entity. Called when a query uses an entity.                         |
| `release(entities)`        | method | Decrements reference count for each entity. Called when a query disposes.                               |
| `sweep()`                  | method | Evicts entities with zero references that have exceeded the TTL. Returns count of evicted entities.     |
| `refCountOf(typename, id)` | method | Returns the current reference count for a specific entity.                                              |

### CachePersistence

| Member                           | Type   | Description                                                                     |
| -------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `CachePersistence`               | class  | Zero-dependency persistence layer using `localStorage` with memory fallback.    |
| `constructor`                    | method | Creates a persistence instance. Signature: `config?: CachePersistConfig`        |
| `persist(data)`                  | method | Stores data to the underlying storage.                                          |
| `persistThrottled(data, delay?)` | method | Throttled persist (batching writes). Default delay is 1000ms.                   |
| `restore()`                      | method | Loads data from storage. Returns `[string, Record<string, unknown>][] \| null`. |
| `clear()`                        | method | Clears all data from storage.                                                   |

### Interfaces

| Member                          | Type      | Description                                                                                                                   |
| ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `CacheEntity`                   | interface | Entity interface. Must have at minimum `__typename` and optionally `id`.                                                      |
| `CacheStoreConfig`              | interface | `CacheStore` construction options.                                                                                            |
| `CacheStoreConfig.persist`      | property  | Persistence config — a `CachePersistence` instance or plain `CachePersistConfig` object. Default: `undefined`                 |
| `CacheStoreConfig.typePolicies` | property  | Type policies for custom cache key and merge logic. Default: `undefined`                                                      |
| `CachePersistConfig`            | interface | Persistence configuration options.                                                                                            |
| `CachePersistConfig.storageKey` | property  | Key prefix used in `localStorage`. Default: `'quenetiq_cache'`                                                                |
| `CachePersistConfig.throttle`   | property  | Minimum interval (ms) between consecutive persist writes. Default: `1000`                                                     |
| `CachePersistConfig.version`    | property  | Schema version string. Persisted data with a different version is discarded on restore. Default: `undefined`                  |
| `CachePersistConfig.maxAge`     | property  | Maximum age (ms) of persisted data. Data older than this is discarded on restore. Default: `undefined`                        |
| `CachePersistConfig.storage`    | property  | Storage backend override: `"localStorage"` (default) or `"memory"`. Default: `'localStorage'`                                 |
| `TypePolicy`                    | interface | Customizes caching behavior for a specific GraphQL type.                                                                      |
| `TypePolicy.keyFields`          | property  | Array of field names used to build the cache key instead of `id`. Example: `["slug"]`. Default: `undefined`                   |
| `TypePolicy.merge`              | property  | Custom merge strategy: `"append"`, `"prepend"`, or a function `(existing, incoming, options) => result`. Default: `undefined` |
| `OptimisticUpdate`              | interface | Describes an optimistic update with `apply` and `rollback` callbacks.                                                         |
| `OptimisticUpdate.id`           | property  | Unique identifier for this optimistic update.                                                                                 |
| `OptimisticUpdate.apply`        | property  | Function that mutates the cache to reflect the optimistic state. Signature: `(cache: Map<string, CacheEntity>) => void`.      |
| `OptimisticUpdate.rollback`     | property  | Function that restores the cache to the previous state. Signature: `(previous: Map<string, CacheEntity>) => void`.            |

## Starters

:::stackblitz starter="cache"

:::stackblitz starter="angular"

:::stackblitz starter="react"

:::stackblitz starter="vue"
