---
title: 'Cross-Tab Sync'
slug: cross-tab-sync
group: 'Core'
order: 9
since: '0.0.1'
tags: [cache, sync, broadcast-channel]
description: 'Cross-tab cache synchronization'
---

# Cross-Tab Sync

`CrossTabSync` keeps the cache in sync across browser tabs using `BroadcastChannel`. Enabled by default when `crossTabSync` is set in `CacheStoreConfig`.

```typescript
import { CacheStore } from '@quenetiq/cache';

const store = new CacheStore({
	crossTabSync: true,
	// or with custom config:
	crossTabSync: {
		channel: 'my-app:cache',
		enabled: true,
	},
});
```

**What gets synced:**

- **Merge** — entity partial updates
- **Write** — new entities
- **Evict** — entity removals
- **Optimistic** — rollbacks and commits (applies are local-only)
- **Clear** — full cache clear

Sync is one-directional per operation: the tab that performed the operation broadcasts it; other tabs receive and apply it. The source tab is identified by `crypto.randomUUID()` to avoid echo loops.

```typescript
// Manual setup
const crossTabSync = new CrossTabSync(events, ops, { channel: 'cache' });
crossTabSync.disconnect(); // closes BroadcastChannel and unsubscribes
```

## API Reference

| Member         | Type                     | Description                                      |
| -------------- | ------------------------ | ------------------------------------------------ |
| `CrossTabSync` | class                    | BroadcastChannel-based cross-tab synchronization |
| constructor    | `(events, ops, config?)` | Create sync instance                             |
| `disconnect()` | method                   | Close channel and unsubscribe                    |

### CrossTabSyncConfig

| Option    | Type      | Default                 | Description                  |
| --------- | --------- | ----------------------- | ---------------------------- |
| `channel` | `string`  | `'quenetiq:cache-sync'` | BroadcastChannel name        |
| `enabled` | `boolean` | `true`                  | Auto-connect on construction |
