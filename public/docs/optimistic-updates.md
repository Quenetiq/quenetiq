---
title: 'Optimistic Updates'
slug: optimistic-updates
group: 'Core'
order: 5
since: '0.0.1'
tags: [cache, optimistic, rollback]
description: 'Key-level optimistic updates'
---

# Optimistic Updates

Optimistic updates apply changes to the cache **immediately**, before the server responds. If the server returns an error, the changes are rolled back.

### Key-level rollback

The cache captures **only the keys that actually changed** during `apply()`. Concurrent optimistic updates on different entities don't interfere. If two updates modify the same key, rollback order matters — use LIFO order or commit before applying a new one.

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

## API Reference

### OptimisticUpdate

| Field      | Type                                           | Description                       |
| ---------- | ---------------------------------------------- | --------------------------------- |
| `id`       | `string`                                       | Unique identifier for this update |
| `apply`    | `(cache: Map<string, CacheEntity>) => void`    | Mutate cache to optimistic state  |
| `rollback` | `(previous: Map<string, CacheEntity>) => void` | Restore previous state            |

### Methods

| Method                    | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `applyOptimistic(update)` | Apply optimistic update on top of current cache    |
| `rollbackOptimistic(id)`  | Remove top-most optimistic layer by id             |
| `commitOptimistic(id)`    | Permanently merge optimistic layer into base cache |
