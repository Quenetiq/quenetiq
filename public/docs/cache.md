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

## Entity Key Listing

Query the structure of the cache without reading entity data. Useful for debugging,
cache inspection, and building devtools UIs.

```typescript
import { CacheStore } from '@quenetiq/cache';

const cache = new CacheStore();
cache.write({ __typename: 'Todo', id: '1', title: 'Hello' });
cache.write({ __typename: 'Todo', id: '2', title: 'World' });
cache.write({ __typename: 'User', id: '1', name: 'Alice' });

// All cache keys
cache.allKeys();       // ["Todo:1", "Todo:2", "User:1"]

// Keys for a specific type
cache.keysByType('Todo');  // ["Todo:1", "Todo:2"]
cache.keysByType('User');  // ["User:1"]

// All unique typenames
cache.getEntityTypes();    // ["Todo", "User"]
```

## Cache Snapshot

Capture and restore the full cache state — entities **and metadata** — as a serializable
object. Unlike `serialize()`/`deserialize()` which produce JSON strings, `snapshot()`/`restore()`
operate on structured objects that preserve type information.

```typescript
import { CacheStore } from '@quenetiq/cache';

const cache = new CacheStore();
cache.write({ __typename: 'Todo', id: '1', title: 'Hello' });

// Capture snapshot (includes entity metadata: createdAt, updatedAt, source, mergeCount)
const snap = cache.snapshot();

// ... later, after clearing or on a different cache instance ...
const fresh = new CacheStore();
fresh.restore(snap);

// The restored cache has identical entities and metadata
console.log(fresh.query('Todo', '1')); // { __typename: 'Todo', id: '1', title: 'Hello' }
```

### Using with NormalizedCache directly

```typescript
import { NormalizedCache } from '@quenetiq/cache';

const nc = new NormalizedCache();
nc.set({ __typename: 'Todo', id: '1', title: 'Hello' });

// Low-level snapshot
const snap = nc.snapshot(); // { entities: [...], meta: [...] }

// Restore into a new instance
const nc2 = new NormalizedCache();
nc2.restore(snap);
```

### Helper Functions

All helpers are exported from `@quenetiq/cache` and can be used standalone without importing any class.

See the [Cache Helpers](/docs/cache-helpers) reference for full API details.

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

## Cross-tab Sync

Synchronize cache write/merge/evict events across browser tabs via `BroadcastChannel`.

```typescript
import { createCache, CrossTabSync } from '@quenetiq/cache';

const cache = createCache({
  crossTabSync: true,  // enable with defaults
  // or with custom config:
  crossTabSync: { channel: 'myapp:cache', echo: false },
});
```

**How it works:** When an entity is written, merged, or evicted in one tab, the event
is broadcast to all other tabs via `BroadcastChannel`. Receiving tabs apply the same
change to their local cache.

| Option | Default | Description |
|--------|---------|-------------|
| `channel` | `'quenetiq:cache-sync'` | BroadcastChannel name |
| `echo` | `false` | Whether to re-apply to local cache (prevents echo loops) |

**Events synced:** `write`, `merge`, `evict`, `clear`

## Cache Events

Every cache operation emits a typed event:

```typescript
const unsub = cache.events.on((event) => {
  switch (event.type) {
    case 'write':
      console.log('Entity written:', event.data.key);
      break;
    case 'evict':
      console.log('Entity evicted:', `${event.data.typename}:${event.data.id}`);
      break;
    case 'clear':
      console.log('Cache cleared:', event.data.entityCount, 'entities removed');
      break;
  }
});

unsub(); // stop listening
```

### Debug logging

```typescript
const stop = cache.debug(true);
// [12:34:56.789] write Todo:1
// [12:34:57.000] evict User:42

// Custom logger:
cache.debug({ logger: (msg) => myLogFn(msg) });

stop();
```

### Event types

| Event | Data | Triggered by |
|-------|------|-------------|
| `read` | `typename, id, hit` | `query()`, `readFragment()` |
| `write` | `entity, key` | `write()`, `writeFragment()` |
| `merge` | `entity, key, existed, changedFields` | `merge()` |
| `evict` | `typename, id, entity?` | `evict()`, `invalidateEntity()`, GC |
| `clear` | `entityCount` | `clear()` |
| `optimistic` | `action, id` | `applyOptimistic()`, `commitOptimistic()`, `rollbackOptimistic()` |
| `gcSweep` | `evicted, refCounts` | `collectGarbage()` |
| `error` | `operation, error` | restore/persist errors |

## Smart Persistence

Entity-level persistence with per-entity TTL and LRU eviction.

```typescript
import { SmartPersistence, createCache } from '@quenetiq/cache';

const persist = new SmartPersistence({
  storage: 'localStorage',             // 'localStorage' | 'indexedDB' | EntityStorage
  prefix: 'myapp:cache:',
  ttl: { Note: 60_000, User: 300_000 }, // per-type TTL in ms
});

const cache = createCache({ persist });
```

`SmartPersistence` is auto-created when `TypePolicy.ttl` is set:

```typescript
const cache = createCache({
  typePolicies: {
    Note:    { ttl: 60_000 },
    Session: { ttl: 300_000 },
  },
  // No explicit persist → SmartPersistence auto-created
});
```

### EntityStorage interface

```typescript
interface EntityStorage {
  get(key: string): { entity: CacheEntity; meta: StoredEntityMeta } | undefined;
  set(key: string, entity: CacheEntity, meta?: Partial<StoredEntityMeta>): void;
  delete(key: string): void;
  keys(): string[];
  clear(): void;
  count(): number;
  evictLru(count: number): string[];
}
```

Built-in: `LocalEntityStorage` (localStorage, LRU, TTL),
`IndexedDbEntityStorage` (IndexedDB via `storage: 'indexedDB'`).

## CacheStore API Additions

### `clear()`

Clears all entities, local state, persistence, and emits a `clear` event:

```typescript
cache.clear();
```

### `graph()`

Returns the bidirectional entity-query dependency graph:

```typescript
const deps = cache.graph();
// deps.forward:  { 'query:hash' → ['User:1', 'Todo:2'] }
// deps.reverse:  { 'User:1'     → ['query:hash', 'query:other'] }
```

### `sizeEstimate()`

Approximate serialized size of the entire cache in bytes:

```typescript
const bytes = cache.sizeEstimate();
```

### `debug()`

Toggle structured logging of all cache events:

```typescript
const stop = cache.debug(true);
// later:
stop();
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
| `allKeys()` | method | Returns all cache keys as a string array (e.g. `["Todo:1", "User:3"]`). |
| `keysByType(typename)` | method | Returns cache keys for a specific typename (e.g. `["Todo:1", "Todo:2"]`). |
| `getEntityTypes()` | method | Returns all unique typenames in the cache (e.g. `["Todo", "User"]`). |
| `getMeta(key)` | method | Returns `EntityMeta` for a cache key (createdAt, updatedAt, source, mergeCount). |
| `allMeta()` | method | Returns a copy of all entity metadata as a `Map<string, EntityMeta>`. |
| `resolveField(typename, id, field, args?)` | method | Resolves a field using the type policy's custom resolver, or returns the raw value. |
| `isStale(typename, id, maxAge)` | method | Returns `true` if the entity was last updated more than `maxAge` ms ago. |
| `getEntityAge(typename, id)` | method | Returns the age of an entity in milliseconds since last update, or `undefined` if not found. |
| `has(typename, id)` | method | Returns true if an entity with the given key exists. |
| `key(typename, id)` | method | Builds the internal key string (`TypeName:id`). |
| `snapshot()` | method | Captures a `CacheSnapshot` object containing all entities and metadata. Serializable. |
| `restore(snapshot)` | method | Restores entities and metadata from a `CacheSnapshot` object, replacing current state. |
| `setTypePolicies(policies)` | method | Updates type policies after construction. |
| `applyOptimistic(update)` | method | Applies an optimistic update on top of current cache. |
| `rollbackOptimistic(id)` | method | Removes the top-most optimistic layer by id, restoring previous state. |
| `commitOptimistic(id)` | method | Permanently merges the optimistic layer into the base cache, then removes it. |
| `explain(typename, id)` | method | Returns full context for an entity: `EntityExplain` with entity, key, meta, ageMs, staleness, sizeBytes. |
| `mergeDry(entity)` | method | Dry-run merge — returns `{ key, existed, changedFields, previousValues, result }` without applying changes. |

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
| `snapshot()` | method | Captures a `CacheSnapshot` object containing all entities and metadata. |
| `restore(snapshot)` | method | Restores entities and metadata from a `CacheSnapshot` object, replacing current state. |
| `allKeys()` | method | Returns all cache keys. Delegates to `NormalizedCache.allKeys()`. |
| `keysByType(typename)` | method | Returns cache keys for a specific typename. |
| `getEntityTypes()` | method | Returns all unique typenames in the cache. |
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
| `explain(typename, id)` | method | Returns `EntityExplain` — full entity context (data, meta, age, staleness, size). |
| `mergeDry(entity)` | method | Dry-run merge — see what would change without applying it. Returns `DryMergeResult`. |
| `graph()` | method | Exports the bidirectional dependency graph: `{ forward: { queryHash → entityKeys[] }, reverse: { entityKey → queryHash[] } }`. |
| `sizeEstimate()` | method | Returns the serialized size of the cache in bytes. |
| `debug(enabled?)` | method | Toggle structured debug logging. Returns unsubscribe function. |
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
| `snapshot()` | method | Captures a `CacheSnapshot` object. |
| `restore(snapshot)` | method | Restores from a `CacheSnapshot` object. |
| `allKeys()` | method | Returns all cache keys. |
| `keysByType(typename)` | method | Returns cache keys for a specific typename. |
| `getEntityTypes()` | method | Returns all unique typenames in the cache. |
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

### CacheEvents

| Member | Type | Description |
|---|---|---|
| `CacheEvents` | class | Event bus for cache operations. Emits typed events for write, merge, evict, read, gcSweep, optimistic, clear, and error. |
| `on(listener)` | method | Subscribe to cache events. Returns an unsubscribe function. |
| `emit(event)` | method | Emit a cache event. Timestamp and seq are added automatically. |
| `setLogging(config)` | method | Enable automatic console logging of all events. Accepts `boolean` or `CacheEventsConfig`. Returns unsubscribe function. |
| `clear()` | method | Remove all listeners and stop logging. |
| `listenerCount` | getter | Returns the number of active listeners. |

```typescript
import { CacheEvents } from '@quenetiq/cache';

const events = new CacheEvents();

// Subscribe to all events
const unsub = events.on((event) => {
  console.log(event.type, event.data, event.timestamp);
});

// Enable console logging
events.setLogging(true);

// Custom logger
events.setLogging({ enableLogging: true, logger: (...args) => myLogger.debug(args) });
```

### CacheMetrics

| Member | Type | Description |
|---|---|---|
| `CacheMetrics` | class | Performance counter for cache operations. Tracks reads, writes, merges, evictions, errors, and timing. |
| `recordRead(hit)` | method | Record a cache read (hit or miss). |
| `recordWrite()` | method | Record a cache write. |
| `recordMerge()` | method | Record a cache merge. |
| `recordEviction()` | method | Record a cache eviction. |
| `recordGcRun(evicted)` | method | Record a GC sweep and the number of entities it evicted. |
| `recordError()` | method | Record a cache error. |
| `recordReadTime(ms)` | method | Record read latency in milliseconds. |
| `recordMergeTime(ms)` | method | Record merge latency in milliseconds. |
| `hitRate` | getter | Cache hit rate (0–1). |
| `snapshot(entityCount, refCountTotal, danglingCount, optimisticCount, localStateCount, sizeEstimate)` | method | Returns a `CacheMetricsSnapshot` with all counters. |
| `reset()` | method | Zero all counters. |

```typescript
import { CacheMetrics } from '@quenetiq/cache';

const metrics = new CacheMetrics();

metrics.recordRead(true);   // hit
metrics.recordRead(false);  // miss
metrics.hitRate;            // 0.5

metrics.recordReadTime(2.5);
metrics.recordMergeTime(1.2);

const snap = metrics.snapshot(150, 300, 12, 0, 5, 24000);
// snap.totalReads = 2, snap.hitRate = 0.5, snap.sizeEstimateBytes = 24000
```

### Cache Event Types

| Type | Description |
|---|---|
| `CacheWriteEvent` | `{ entity, key }` — emitted when an entity is written. |
| `CacheMergeEvent` | `{ entity, key, existed, changedFields?, previousValues? }` — emitted on merge. `changedFields` lists fields that actually changed. |
| `CacheEvictEvent` | `{ typename, id, entity? }` — emitted when an entity is evicted. |
| `CacheReadEvent` | `{ typename, id, hit }` — emitted on every cache read. |
| `CacheGcSweepEvent` | `{ evicted, refCounts }` — emitted after GC sweep. `evicted` is the list of removed keys. |
| `CacheOptimisticEvent` | `{ action, id }` — emitted on apply/rollback/commit. `action` is `'apply' \| 'rollback' \| 'commit'`. |
| `CacheClearEvent` | `{ entityCount }` — emitted when cache is cleared. |
| `CacheErrorEvent` | `{ operation, key?, error }` — emitted on cache errors. |
| `CacheEvent` | Discriminated union of all the above. Each event also has `timestamp: number` and `seq: number`. |
| `CacheEventListener` | `(event: CacheEvent) => void` — callback type for event subscriptions. |
| `CacheEventsConfig` | `{ enableLogging?: boolean, logger?: (...args) => void }` — config for `setLogging()`. |

### Interfaces

| Member | Type | Description |
|---|---|---|
| `CacheEntity` | interface | Entity interface. Must have at minimum `__typename` and optionally `id`. |
| `EntityMeta` | interface | Metadata for a cache entity: `{ createdAt, updatedAt, source, mergeCount }`. |
| `TypePolicy` | interface | Customizes caching behavior for a specific GraphQL type. |
| `TypePolicy.keyFields` | property | Array of field names used to build the cache key instead of `id`. Example: `["slug"]`. Default: `undefined` |
| `TypePolicy.keyFn` | property | Custom key function: `(entity: CacheEntity) => string`. Overrides `keyFields`. Default: `undefined` |
| `TypePolicy.merge` | property | Custom merge strategy: `"append"`, `"prepend"`, or a function `(existing, incoming, options) => result`. Default: `undefined` |
| `TypePolicy.resolve` | property | Custom field resolver: `(field, args, ctx) => unknown`. Default: `undefined` |
| `CacheStoreConfig` | interface | `CacheStore` construction options. |
| `CacheStoreConfig.persist` | property | Persistence config — a `CachePersistence` instance or plain `CachePersistConfig` object. Default: `undefined` |
| `CacheStoreConfig.typePolicies` | property | Type policies for custom cache key and merge logic. Default: `undefined` |
| `CachePersistConfig` | interface | Persistence configuration options. |
| `CachePersistConfig.storageKey` | property | Key prefix used in `localStorage`. Default: `'quenetiq_cache'` |
| `CachePersistConfig.throttle` | property | Minimum interval (ms) between consecutive persist writes. Default: `1000` |
| `CachePersistConfig.version` | property | Schema version string. Persisted data with a different version is discarded on restore. Default: `undefined` |
| `CachePersistConfig.maxAge` | property | Maximum age (ms) of persisted data. Data older than this is discarded on restore. Default: `undefined` |
| `CachePersistConfig.storage` | property | Storage backend override: `"localStorage"` (default) or `"memory"`. Default: `'localStorage'` |
| `OptimisticUpdate` | interface | Describes an optimistic update with `apply` and `rollback` callbacks. |
| `OptimisticUpdate.id` | property | Unique identifier for this optimistic update. |
| `OptimisticUpdate.apply` | property | Function that mutates the cache to reflect the optimistic state. Signature: `(cache: Map<string, CacheEntity>) => void`. |
| `OptimisticUpdate.rollback` | property | Function that restores the cache to the previous state. Signature: `(previous: Map<string, CacheEntity>) => void`. |
| `CacheSnapshot` | interface | `{ entities: [string, CacheEntity][], meta: [string, EntityMeta][] }` — serializable cache state. |
| `CacheMetricsSnapshot` | interface | Full metrics snapshot with `totalReads`, `totalWrites`, `totalMerges`, `totalEvictions`, `totalGcRuns`, `totalEntitiesEvicted`, `totalErrors`, `hitRate`, `currentEntityCount`, `currentRefCountTotal`, `currentDanglingCount`, `optimisticUpdateCount`, `localStateCount`, `sizeEstimateBytes`, `totalReadTimeMs`, `totalMergeTimeMs`. |
| `GraphqlCacheLike` | interface | Minimal cache interface consumed by `@quenetiq/core` middleware. Implemented by `CacheStore`. |
| `CacheAwareResult<T>` | interface | Type-safe wrapper for GraphQL results: `{ status, data, fromCache, cachedAt?, entityKeys?, graphQLErrors? }`. |
| `EntityExplain` | interface | Full entity context returned by `explain()`: `{ entity, key, meta, ageMs, staleness, sizeBytes }`. |
| `DryMergeResult` | interface | Dry-run merge result: `{ key, existed, changedFields, previousValues, result }`. |

## Starters

### Vanilla JS

```typescript
import { createCache, NormalizedCache } from '@quenetiq/cache';

// Create a cache store
const cache = createCache();

// Write an entity — normalized by __typename + id
cache.write({ __typename: 'Todo', id: '1', title: 'Hello', done: false });

// Partial merge — only updates provided fields
cache.merge({ __typename: 'Todo', id: '1', done: true });

// Read entity
const todo = cache.query('Todo', '1');
console.log(todo); // { __typename: 'Todo', id: '1', title: 'Hello', done: true }

// Use NormalizedCache directly for low-level access
const nc = new NormalizedCache();
nc.set({ __typename: 'Book', id: '42', title: 'Dune' });
nc.set({ __typename: 'Book', id: '43', title: 'Neuromancer' });
console.log(nc.get('Book')); // all Book entities
console.log(nc.count()); // 2
```

### Angular

```typescript
import { provideCacheService, CacheService } from '@quenetiq/cache/angular';
import { provideQuenetiq } from '@quenetiq/core';
import { createHttpLink } from '@quenetiq/core/link';

export const appConfig: ApplicationConfig = {
  providers: [
    provideQuenetiq({ link: createHttpLink({ uri: '/graphql' }) }),
    provideCacheService(),
  ],
};

// In a component:
@Component({ ... })
export class TodoListComponent {
  private cache = inject(CacheService);

  loadTodos() {
    const todos = this.cache.query('Todo');
    console.log(todos);
  }

  updateTodo() {
    this.cache.merge({ __typename: 'Todo', id: '1', done: true });
  }
}
```

### React

```tsx
import { QuenetiqProvider, useCache, useQuery, gql } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';
import { createCache } from '@quenetiq/cache';

const client = createClient({ endpoint: '/graphql' });
const cache = createCache();

function TodoList() {
  const cacheStore = useCache();

  const { data } = useQuery(gql`{ todos { id title done } }`, {
    onCompleted(result) {
      for (const todo of result.data.todos) {
        cacheStore?.write(todo);
      }
    },
  });

  return <pre>{JSON.stringify(cacheStore?.query('Todo'), null, 2)}</pre>;
}

function App() {
  return (
    <QuenetiqProvider client={client} cache={cache}>
      <TodoList />
    </QuenetiqProvider>
  );
}
```

### Vue

```typescript
import { createQuenetiqPlugin, useCache, useQuery, gql } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';
import { createCache } from '@quenetiq/cache';
import { createApp } from 'vue';

const client = createClient({ endpoint: '/graphql' });
const cache = createCache();
const app = createApp(App);
app.use(createQuenetiqPlugin(client, cache));
```

```vue
<script setup lang="ts">
const cacheStore = useCache();
const { data } = useQuery(gql`{ todos { id title done } }`);

watch(data, (val) => {
  if (val?.todos) {
    for (const todo of val.todos) {
      cacheStore?.write(todo);
    }
  }
});
</script>

<template>
  <pre>{{ cacheStore?.query('Todo') }}</pre>
</template>
```

## Try it live

:::stackblitz starter="cache"

:::stackblitz starter="cache-entity-keys"

:::stackblitz starter="cache-snapshot"

:::stackblitz starter="cache-auto-refetch"
