---
title: 'Type Policies'
slug: type-policies
group: 'Core'
order: 4
since: '0.0.1'
tags: [cache, type-policies, merge]
description: 'Custom cache key and merge strategies'
---

# Type Policies

Type policies customize how specific GraphQL types are stored and merged. Use `keyFields` to control the cache key, and `merge` to control how partial data is merged.

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

## API Reference

### TypePolicy

| Field       | Type                                                                 | Description                                                  |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `keyFields` | `string[]`                                                           | Custom cache key fields instead of `id`. Example: `['slug']` |
| `merge`     | `'append' \| 'prepend' \| ((existing, incoming, options) => result)` | Custom merge strategy                                        |

### setTypePolicies

```typescript
store.setTypePolicies({
	Post: { keyFields: ['uuid'] },
});
```
