---
title: 'Smart Persistence'
slug: smart-persistence
group: 'Core'
order: 10
since: '0.0.1'
tags: [cache, persistence, ttl, indexeddb]
description: 'Entity-level persistence with TTL'
---

# Smart Persistence

`SmartPersistence` is an entity-level persistence layer with per-typename TTL, LRU eviction, and support for both `localStorage` and `IndexedDB` backends.

```typescript
import { SmartPersistence } from '@quenetiq/cache';

// localStorage-based (default)
const persist = new SmartPersistence({
	storage: 'localStorage',
	prefix: 'my_app',
	ttl: {
		User: 3600_000, // 1 hour
		Session: 300_000, // 5 minutes
	},
	maxSize: 5_000_000, // 5 MB soft limit
});

// IndexedDB-based (for larger data)
const idbPersist = new SmartPersistence({
	storage: 'indexedDB',
	dbName: 'my_cache',
	dbVersion: 2,
});

// Use with CacheStore
const cache = new CacheStore({ persist: idbPersist });
```

## LocalEntityStorage

Synchronous localStorage adapter with per-typename TTL and LRU eviction.

```typescript
import { LocalEntityStorage } from '@quenetiq/cache';

const storage = new LocalEntityStorage({
	prefix: 'my_app',
	ttl: { User: 60_000 },
	maxSize: 5_000_000,
});

await storage.set('User:1', { __typename: 'User', id: '1', name: 'Alice' });
const entity = await storage.get('User:1');
await storage.delete('User:1');
```

## IndexedDbEntityStorage

Async IndexedDB adapter for datasets larger than 5 MB.

```typescript
import { IndexedDbEntityStorage } from '@quenetiq/cache';

const storage = new IndexedDbEntityStorage({
	dbName: 'my_cache',
	dbVersion: 1,
	prefix: 'qntc',
	ttl: { Session: 600_000 },
});
```

## API Reference

### SmartPersistConfig

| Option      | Type                            | Default          | Description             |
| ----------- | ------------------------------- | ---------------- | ----------------------- |
| `storage`   | `'localStorage' \| 'indexedDB'` | `'localStorage'` | Storage backend         |
| `prefix`    | `string`                        | —                | Key prefix              |
| `ttl`       | `Record<string, number>`        | —                | Per-typename TTL in ms  |
| `maxSize`   | `number`                        | —                | Soft size limit (bytes) |
| `dbName`    | `string`                        | —                | IndexedDB database name |
| `dbVersion` | `number`                        | —                | IndexedDB version       |

### EntityStorage Interface

| Method                    | Returns                              | Description               |
| ------------------------- | ------------------------------------ | ------------------------- |
| `get(key)`                | `Promise<StoredEntity \| undefined>` | Read entity               |
| `set(key, entity, meta?)` | `Promise<void>`                      | Store entity              |
| `delete(key)`             | `Promise<void>`                      | Remove entity             |
| `keys()`                  | `Promise<string[]>`                  | All stored keys           |
| `clear()`                 | `Promise<void>`                      | Remove all data           |
| `count()`                 | `Promise<number>`                    | Number of stored entities |
| `evictLru()`              | `Promise<void>`                      | Evict least recently used |
