---
title: 'Cache Events'
slug: cache-events
group: 'Core'
order: 8
since: '0.0.1'
tags: [cache, events, logging]
description: 'Cache event system'
---

# Cache Events

`CacheEvents` is a typed event emitter for all cache operations. Every `CacheStore` exposes `store.events`.

**8 event types:** `read`, `write`, `merge`, `evict`, `gcSweep`, `optimistic`, `clear`, `error`.

```typescript
import { CacheEvents } from '@quenetiq/cache';

const events = new CacheEvents();

// Subscribe to all events
const unsub = events.on((event) => {
	// event: { type: 'write', data: { entity, key }, timestamp, seq }
});

// Subscribe to specific types
events.on((e) => {
	if (e.type === 'error') {
		console.error('Cache error:', e.data.operation, e.data.error);
	}
});

// Enable console logging (prefix: [quenetiq:cache])
const stopLogging = events.setLogging(true);

// or with custom logger
const stop = events.setLogging({
	enableLogging: true,
	logger: (...args) => myLogger.debug(...args),
});

// Clean up
unsub();
stopLogging();
events.clear();
```

## Event Types

| Event        | `data` shape                                                | Triggered by                      |
| ------------ | ----------------------------------------------------------- | --------------------------------- |
| `read`       | `{ typename, id, hit }`                                     | `store.query()`                   |
| `write`      | `{ entity, key }`                                           | `store.write()`                   |
| `merge`      | `{ entity, key, existed, changedFields?, previousValues? }` | `store.merge()`                   |
| `evict`      | `{ typename, id, entity? }`                                 | `store.evict()`                   |
| `gcSweep`    | `{ evicted: string[], refCounts }`                          | `store.collectGarbage()`          |
| `optimistic` | `{ action, id }`                                            | `apply/rollback/commitOptimistic` |
| `clear`      | `{ entityCount }`                                           | `store.clear()` / `cache.clear()` |
| `error`      | `{ operation, key?, error }`                                | Persist/restore failures          |

## API Reference

| Method               | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `on(listener)`       | Subscribe to all events. Returns unsubscribe function. |
| `emit(event)`        | Emit an event to all listeners                         |
| `setLogging(config)` | Enable/disable console logging                         |
| `clear()`            | Remove all listeners                                   |
| `listenerCount`      | Property — current number of listeners                 |
