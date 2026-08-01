---
title: 'Cache Persistence'
slug: cache-persistence
group: 'Core'
order: 11
since: '0.0.1'
tags: [cache, persistence, localStorage]
description: 'localStorage persistence layer'
---

# Cache Persistence

`CachePersistence` uses `localStorage` with automatic `InMemoryStorage` fallback when localStorage is unavailable (e.g., in private browsing mode or SSR).

### Features

- **Versioning** — bump `version` to invalidate old cached data
- **Max age** — auto-evict persisted data older than `maxAge` ms
- **Throttling** — debounce frequent writes with `throttle` (ms)
- **Storage backend** — `'localStorage'` or `'memory'`

```typescript
import { CachePersistence, createCache } from '@quenetiq/cache';

const persist = new CachePersistence({
	storageKey: 'my_cache',
	version: 'v2',
	maxAge: 3600_000, // auto-evict after 1 hour
	throttle: 500, // debounce writes
	storage: 'localStorage',
});

const cache = createCache({ persist });
// Auto-restores on creation

cache.persist();
persist.clear();
```

## API Reference

| Member                           | Type                          | Description                                                   |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| `CachePersistence`               | class                         | Zero-dependency localStorage persistence with memory fallback |
| constructor                      | `config?: CachePersistConfig` | Create persistence instance                                   |
| `persist(data)`                  | method                        | Store data (sync — localStorage is synchronous)               |
| `persistThrottled(data, delay?)` | method                        | Throttled persist. Default delay: 1000ms.                     |
| `restore()`                      | method                        | Load data from storage. Returns entries or null.              |
| `clear()`                        | method                        | Clear all data from storage                                   |

### CachePersistConfig

| Option       | Type                         | Default            | Description                                               |
| ------------ | ---------------------------- | ------------------ | --------------------------------------------------------- |
| `storageKey` | `string`                     | `'quenetiq_cache'` | localStorage key prefix                                   |
| `throttle`   | `number`                     | `1000`             | Min interval between writes (ms)                          |
| `version`    | `string`                     | —                  | Schema version. Data with different version is discarded. |
| `maxAge`     | `number`                     | —                  | Max age of persisted data (ms)                            |
| `storage`    | `'localStorage' \| 'memory'` | `'localStorage'`   | Storage backend                                           |
