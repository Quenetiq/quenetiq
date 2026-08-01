---
title: 'Local State'
slug: local-state
group: 'Core'
order: 6
since: '0.0.1'
tags: [cache, local-state, ui]
description: 'UI-local state in normalized cache'
---

# Local State

Store UI-local state alongside normalized entities. Local state values are **not normalized** — they're stored as-is and can be watched for changes.

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

## Reactive Local State (Angular)

`CacheService.watchLocal()` returns an RxJS `Observable` that emits on every change:

```typescript
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

| Method                                   | Description                                          |
| ---------------------------------------- | ---------------------------------------------------- |
| `readLocal(key)`                         | Read a local state value                             |
| `writeLocal(key, value)`                 | Write a local state value. Triggers watch listeners. |
| `watchLocal(key, listener)`              | Subscribe to changes. Returns unsubscribe function.  |
| `writeLocalWithTypes(key, value, types)` | Write local state scoped to GraphQL type names       |
| `clearLocalState()`                      | Clear all local state values                         |
| `clearLocalStateByTypes(types)`          | Clear local state for given type names               |
