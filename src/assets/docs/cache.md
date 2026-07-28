---
title: "@quenetiq/cache"
slug: cache
group: "Core"
order: 3
since: "0.0.1"
tags: [cache, normalized]
description: "Normalized cache with type policies"
---

# @quenetiq/cache

The cache package provides a normalized, in-memory cache for GraphQL data. It uses a key-value document store
where every object is normalized by its
`__typename` + `id` (or a custom key function), avoiding data duplication and enabling
automatic updates.

## How It Works

Every GraphQL response is **normalized** into a flat dictionary of entities. Instead of storing
deeply nested response trees, the cache stores each object once — keyed by `__typename:id` — and
references it by key. This eliminates data duplication and enables automatic updates across all queries.

**Server Response → Normalized Cache → Query Result**

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

**Key insight:** `User:1` is stored once, not duplicated. Mutate it — and every query
referencing `User:1` sees the change instantly.

### Architecture Layers

- **CacheService** — Angular DI wrapper — RxJS `watchLocal()`, auto-restore
- **CacheStore** — Orchestrator — query, write, merge, evict, optimistic, gc, persist
  - **NormalizedCache** — Entity store + type policies
  - **CacheGc** — Reference counting + TTL
  - **CachePersistence** — localStorage / memory fallback

```typescript
// 1. Server returns nested response
const serverData = {
  todos: [
    { id: '1', title: 'Hello', author: { id: '1', name: 'Alice' } },
    { id: '2', title: 'World', author: { id: '1', name: 'Alice' } },
  ],
};

// 2. Each object is stored flat, keyed by __typename:id
cache.write({ __typename: 'Todo', id: '1', title: 'Hello', author: { __typename: 'User', id: '1' } });
cache.write({ __typename: 'Todo', id: '2', title: 'World', author: { __typename: 'User', id: '1' } });
cache.write({ __typename: 'User', id: '1', name: 'Alice' });

// 3. Query result now only stores references
// todos → [Todo:1, Todo:2], Todo:1.author → User:1

// 4. Mutate User:1 — all queries see the change automatically
cache.merge({ __typename: 'User', id: '1', name: 'Alice (updated)' });

// 5. No data duplication: User:1 stored once, referenced from both todos
```

## NormalizedCache

`NormalizedCache` is the low-level entity store. It holds entities in a flat
`Map<string, CacheEntity>` keyed by `TypeName:id`.

### Key Building

| Scenario | Example Key |
|---|---|
| Entity with `id` | `Todo:1` |
| Custom `keyFields: ['slug']` | `Post:my-post-slug` |
| Compound `keyFields: ['locale','slug']` | `Translation:en.hello` |
| No `id`, no keyFields | `Todo:__inline__1` |

Use `NormalizedCache` directly when you need framework-agnostic entity storage:

```typescript
import { NormalizedCache } from '@quenetiq/cache';

const nc = new NormalizedCache();

// Store entities — keys are built automatically
nc.set({ __typename: 'Todo', id: '1', title: 'Dune', done: false });

// Read single
const todo = nc.get('Todo', '1');

// Read all entities of a type
const allTodos = nc.get('Todo');

// Partial merge
nc.merge({ __typename: 'Todo', id: '1', done: true });

// Remove
nc.remove('Todo', '1');

// Snapshot / restore for serialization
const json = nc.snapshot();
nc.restore(json);

console.log(nc.count()); // number of entities in store
```

## CacheService

`CacheService` wraps `CacheStore` as an Angular `@Injectable()` and integrates
with `GraphqlService` automatically. Install it using `provideCacheService`:

```typescript
import { provideCacheService, provideCachePersistence } from '@quenetiq/cache/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideQuenetiqCore({ link: createHttpLink({ uri: '/graphql' }) }),
    provideCacheService(),
    provideCachePersistence({ storageKey: 'my_cache', version: '1' }),
  ],
};

// In any component:
class TodoList {
  private cache = inject(CacheService);
  private graphql = inject(GraphqlService);

  load() {
    this.graphql.query(gql`{ todos { id title done } }`).subscribe(res => {
      for (const todo of res.data.todos) {
        this.cache.write(todo);
      }
    });
  }
}
```

## Garbage Collection

`CacheGc` uses **reference counting** with **TTL eviction**. When a query
result references entities, call `track()` to increment their refcount. When the query is no longer
active, call `release()`. Entities with refcount = 0 are marked *dangling* and evicted after
the TTL expires (default: 60 seconds).

**Safety guarantee:** an entity is never evicted while its refcount > 0, even if
`sweep()` is called. This prevents accidental data loss during active queries.

```typescript
import { CacheGc } from '@quenetiq/cache';

const gc = new CacheGc(normalizedCache, 60_000); // 60s TTL

// Increment reference when a query result uses an entity
gc.track([{ __typename: 'Todo', id: '1' }]);

// Decrement when the query is no longer subscribed
gc.release([{ __typename: 'Todo', id: '1' }]);

// Evict entities dangling beyond TTL
const evicted = gc.sweep(); // number of entities removed

// Check ref count
console.log(gc.refCountOf('Todo', '1')); // 0 after release+sweep
```

## Persistence

Cache data can be persisted across page reloads. `CachePersistence` uses
`localStorage` with automatic `InMemoryStorage` fallback when localStorage is unavailable
(e.g., in private browsing mode or SSR).

### Features

- **Versioning** — bump `version` to invalidate old cached data after an update
- **Max age** — auto-evict persisted data older than `maxAge` ms
- **Throttling** — debounce frequent writes with `throttle` (ms)
- **Storage backend** — `'localStorage'` or `'memory'`

```typescript
import { CachePersistence, createCache } from '@quenetiq/cache';

// With versioning and max age
const persist = new CachePersistence({
  storageKey: 'my_cache',   // localStorage key
  version: 'v2',            // bump to invalidate old caches
  maxAge: 3600_000,         // auto-evict after 1 hour
  throttle: 500,            // debounce writes
  storage: 'localStorage',
});

const cache = createCache({ persist });
// Automatically restores on creation

// Manual persist
cache.persist();

// Clear persisted data
persist.clear();
```

## Optimistic Updates

Optimistic updates apply changes to the cache **immediately**, before the server responds. If the
server returns an error, the changes are rolled back — showing the user a seamless experience.

### Key-level rollback

The cache captures **only the keys that actually changed** during `apply()`. This means
concurrent optimistic updates on different entities don't interfere. If two updates modify the same key,
rollback order matters — use LIFO order or commit before applying a new one.

```typescript
const cache = inject(CacheService);

cache.applyOptimistic({
  id: 'opt-like-42',
  apply: (entities) => {
    const post = entities.get('Post:42');
    if (post) {
      entities.set('Post:42', {
        ...post,
        likes: (post.likes as number) + 1,
      });
    }
  },
  rollback: () => {
    // Keys changed by apply() are restored automatically
  },
});

// On success:
cache.commitOptimistic('opt-like-42');
// On error:
cache.rollbackOptimistic('opt-like-42');
```

## Type Policies

Type policies customize how specific GraphQL types are stored and merged. Use `keyFields` to control
the cache key, and `merge` to control how partial data is merged.

```typescript
import { CacheStore } from '@quenetiq/cache';

const cache = new CacheStore({
  typePolicies: {
    // Custom key: use 'slug' instead of 'id'
    Post: {
      keyFields: ['slug'],
    },
    // Compound key: locale + key
    Translation: {
      keyFields: ['locale', 'key'],
    },
    // Pagination: append incoming items
    PaginatedPosts: {
      merge: (existing, incoming) => ({
        ...incoming,
        items: [...(existing?.items ?? []), ...incoming.items],
      }),
    },
    // Built-in modes
    LogEntries: { merge: 'append' },
    Notifications: { merge: 'prepend' },
  },
});
```

## Local State

Store UI-local state alongside normalized entities. Local state values are **not normalized**
— they're stored as-is and can be watched for changes.

```typescript
import { CacheStore } from '@quenetiq/cache';

const cache = new CacheStore();

// Store UI state alongside entities
cache.writeLocal('sidebarOpen', true);
cache.writeLocal('filter', { status: 'active', search: '' });

// Read
const open = cache.readLocal('sidebarOpen');

// Watch for changes
cache.watchLocal('filter', () => {
  console.log('filter:', cache.readLocal('filter'));
});

// Scoped local state — auto-cleared with entity types
cache.writeLocalWithTypes('selectedPost', '42', new Set(['Post']));
cache.clearLocalStateByTypes(['Post']); // also clears 'selectedPost'
```

## Common Patterns

### Pagination with Merge

Use a custom `merge` function in type policies to accumulate paginated results:

```typescript
// Type policy for cursor-based pagination
const cache = new CacheStore({
  typePolicies: {
    PostConnection: {
      merge: (existing, incoming, { args }) => {
        if (!args?.after) return incoming; // first page, replace
        return {
          ...incoming,
          edges: [...(existing?.edges ?? []), ...incoming.edges],
        };
      },
    },
  },
});

// After each page fetch:
cache.merge(pageData);
```

### Reactive Local State (Angular)

`CacheService.watchLocal()` returns an RxJS `Observable` that emits on every change:

```typescript
// Angular: reactive local state with RxJS
@Component({ ... })
class SidebarComponent {
  private cache = inject(CacheService);
  readonly isOpen$ = this.cache.watchLocal('sidebarOpen');

  toggle() {
    const current = this.cache.readLocal('sidebarOpen');
    this.cache.writeLocal('sidebarOpen', !current);
  }
}
```

## API Reference

### NormalizedCache

| Member | Type | Description |
|---|---|---|
| `NormalizedCache` | class | Low-level normalized entity store. Stores entities in a flat `Map<string, CacheEntity>` keyed by `TypeName:id`. |
| `constructor` | constructor | Creates a new store with optional type policies. Signature: `typePolicies?: Record<string, TypePolicy>` |
| `get(typename, id?)` | method | Get entity by typename+id, or all entities of a type when id is omitted. |
| `set(entity)` | method | Store an entity. Overwrites if same key exists. |
| `merge(entity)` | method | Partial merge — only updates fields present in the input. |
| `remove(typename, id?)` | method | Remove entity(ies). If id is omitted, removes all of the given typename. |
| `all()` | method | Returns the underlying `Map<string, CacheEntity>`. |
| `clear()` | method | Removes all entities from the store. |
| `count()` | method | Returns the number of entities in the store. |
| `has(typename, id)` | method | Returns true if an entity with the given key exists. |
| `key(typename, id)` | method | Builds the internal key string (`TypeName:id`). |
| `snapshot()` | method | Serializes all entities to a JSON string. |
| `restore(json)` | method | Deserializes and restores entities from a JSON string. Appends to existing data. |
| `setTypePolicies(policies)` | method | Updates type policies after construction. |
| `applyOptimistic(update)` | method | Applies an optimistic update on top of current cache. |
| `rollbackOptimistic(id)` | method | Removes the top-most optimistic layer by id, restoring previous state. |
| `commitOptimistic(id)` | method | Permanently merges the optimistic layer into the base cache, then removes it. |

### CacheStore

| Member | Type | Description |
|---|---|---|
| `CacheStore` | class | High-level orchestrator that combines `NormalizedCache`, `CacheGc`, local state, and optional persistence. |
| `constructor` | constructor | Creates a `CacheStore` with optional config. Signature: `config?: CacheStoreConfig` |
| `cache` | property | Public readonly reference to the underlying `NormalizedCache`. |
| `gc` | property | Public readonly reference to the underlying `CacheGc` instance. |
| `write(entity)` | method | Writes an entity to the cache with normalization. Tracks GC reference. |
| `query(typename, id)` | method | Reads a single entity. Tracks GC reference. Returns `undefined` if not found. |
| `merge(entity)` | method | Partial merge of an entity. Tracks GC reference. |
| `evict(typename, id)` | method | Removes an entity and releases its GC reference. |
| `persist()` | method | Writes the full cache snapshot (entities + local state) to the persistence layer. |
| `serialize()` | method | Returns the cache as a JSON string. |
| `deserialize(json)` | method | Restores cache from a JSON string. Appends to existing data. |
| `collectGarbage()` | method | Runs GC sweep and returns the number of evicted entities. |
| `applyOptimistic(update)` | method | Applies an optimistic update with key-level change tracking. |
| `rollbackOptimistic(id)` | method | Rolls back an optimistic update by id. |
| `commitOptimistic(id)` | method | Permanently commits an optimistic update. |
| `readLocal(key)` | method | Reads a local state value by key. |
| `writeLocal(key, value)` | method | Writes a local state value. Triggers `watchLocal` listeners. |
| `watchLocal(key, listener)` | method | Subscribes to local state changes. Returns unsubscribe function. |
| `writeLocalWithTypes(key, value, types)` | method | Writes local state scoped to a set of GraphQL type names. |
| `clearLocalState()` | method | Clears all local state values. |
| `clearLocalStateByTypes(types)` | method | Clears local state values scoped to the given type names. |
| `setTypePolicies(policies)` | method | Replaces type policies at runtime. |
| `createCache(config?)` | function | Factory function that returns a new `CacheStore` instance. |

### CacheService (Angular)

| Member | Type | Description |
|---|---|---|
| `CacheService` | class | Angular `@Injectable()` wrapper around `CacheStore`. Exposes the same methods plus RxJS `watchLocal()`. |
| `constructor` | constructor | Accepts an optional `CachePersistenceService` for auto-restore on init. Signature: `persistSvc?: CachePersistenceService \| null` |
| `cache` | property | Public readonly reference to the underlying `NormalizedCache`. |
| `gc` | property | Public readonly reference to the underlying `CacheGc` instance. |
| `write(entity)` | method | Writes an entity with normalization and GC tracking. |
| `query(typename, id)` | method | Reads a single entity with GC tracking. |
| `merge(entity)` | method | Partial merge with GC tracking. |
| `evict(typename, id)` | method | Evicts an entity from the cache. |
| `persist()` | method | Persists cache to the configured storage. |
| `serialize()` | method | Serializes cache to JSON string. |
| `deserialize(json)` | method | Restores cache from JSON string. |
| `collectGarbage()` | method | Runs GC sweep, returns evicted count. |
| `applyOptimistic(update)` | method | Applies an optimistic update. |
| `rollbackOptimistic(id)` | method | Rolls back an optimistic update. |
| `commitOptimistic(id)` | method | Commits an optimistic update. |
| `readLocal(key)` | method | Reads a local state value. |
| `watchLocal(key)` | method | Returns an `Observable<unknown>` that emits the current value and all subsequent changes. |
| `writeLocal(key, value)` | method | Writes a local state value. |
| `writeLocalWithTypes(key, value, types)` | method | Writes local state scoped to a set of GraphQL type names. |
| `clearLocalState()` | method | Clears all local state. |
| `clearLocalStateByTypes(types)` | method | Clears local state for the given type names. |
| `setTypePolicies(policies)` | method | Sets type policies at runtime. |
| `provideCacheService(persistSvc?)` | function | Angular provider for `CacheService`. Also provides `GRAPHQL_CACHE` token. |
| `provideCachePersistence(config?)` | function | Angular provider for `CachePersistenceService` with auto-init. |

### CacheGc

| Member | Type | Description |
|---|---|---|
| `CacheGc` | class | Reference-counting garbage collector with optional TTL eviction. |
| `constructor` | constructor | Creates a GC instance bound to a `NormalizedCache`. Signature: `cache: NormalizedCache, ttlMs?: number` |
| `track(entities)` | method | Increments reference count for each entity. Called when a query uses an entity. |
| `release(entities)` | method | Decrements reference count for each entity. Called when a query disposes. |
| `sweep()` | method | Evicts entities with zero references that have exceeded the TTL. Returns count of evicted entities. |
| `refCountOf(typename, id)` | method | Returns the current reference count for a specific entity. |

### CachePersistence

| Member | Type | Description |
|---|---|---|
| `CachePersistence` | class | Zero-dependency persistence layer using `localStorage` with memory fallback. |
| `constructor` | constructor | Creates a persistence instance. Signature: `config?: CachePersistConfig` |
| `persist(data)` | method | Stores data to the underlying storage. |
| `persistThrottled(data, delay?)` | method | Throttled persist (batching writes). Default delay is 1000ms. |
| `restore()` | method | Loads data from storage. Returns `[string, Record<string, unknown>][] \| null`. |
| `clear()` | method | Clears all data from storage. |

### Interfaces

| Member | Type | Description |
|---|---|---|
| `CacheEntity` | interface | Entity interface. Must have at minimum `__typename` and optionally `id`. |
| `CacheStoreConfig` | interface | `CacheStore` construction options. |
| `CacheStoreConfig.persist` | property | Persistence config — a `CachePersistence` instance or plain `CachePersistConfig` object. Default: `undefined` |
| `CacheStoreConfig.typePolicies` | property | Type policies for custom cache key and merge logic. Default: `undefined` |
| `CachePersistConfig` | interface | Persistence configuration options. |
| `CachePersistConfig.storageKey` | property | Key prefix used in `localStorage`. Default: `'quenetiq_cache'` |
| `CachePersistConfig.throttle` | property | Minimum interval (ms) between consecutive persist writes. Default: `1000` |
| `CachePersistConfig.version` | property | Schema version string. Persisted data with a different version is discarded on restore. Default: `undefined` |
| `CachePersistConfig.maxAge` | property | Maximum age (ms) of persisted data. Data older than this is discarded on restore. Default: `undefined` |
| `CachePersistConfig.storage` | property | Storage backend override: `"localStorage"` (default) or `"memory"`. Default: `'localStorage'` |
| `TypePolicy` | interface | Customizes caching behavior for a specific GraphQL type. |
| `TypePolicy.keyFields` | property | Array of field names used to build the cache key instead of `id`. Example: `["slug"]`. Default: `undefined` |
| `TypePolicy.merge` | property | Custom merge strategy: `"append"`, `"prepend"`, or a function `(existing, incoming, options) => result`. Default: `undefined` |
| `OptimisticUpdate` | interface | Describes an optimistic update with `apply` and `rollback` callbacks. |
| `OptimisticUpdate.id` | property | Unique identifier for this optimistic update. |
| `OptimisticUpdate.apply` | property | Function that mutates the cache to reflect the optimistic state. Signature: `(cache: Map<string, CacheEntity>) => void`. |
| `OptimisticUpdate.rollback` | property | Function that restores the cache to the previous state. Signature: `(previous: Map<string, CacheEntity>) => void`. |

## Starters

:::stackblitz starter="cache"

:::stackblitz starter="angular"

:::stackblitz starter="react"

:::stackblitz starter="vue"
