---
title: 'Offset Pagination'
slug: offset-pagination
group: 'Features'
order: 1
since: '0.0.1'
tags: [pagination, offset]
description: 'Offset-based pagination'
---

# Offset Pagination

Creates an offset-based pagination manager with `loadMore()` and `refresh()` methods.

```typescript
import { offsetPagination, offsetMerge } from '@quenetiq/pagination';

const pagination = offsetPagination(GET_ITEMS, {
	limit: 20,
	variables: { filter: 'active' },
});

pagination.state.subscribe((state) => {
	console.log(state.items, state.hasMore, state.loading);
});

pagination.loadMore(); // Fetch next page
pagination.refresh(); // Reset to first page
```

## offsetMerge

Cache merge function for offset pagination:

```typescript
const cache = new CacheStore({
	typePolicies: {
		Items: { merge: offsetMerge },
	},
});
```

## API Reference

| Function                                 | Returns                        | Description               |
| ---------------------------------------- | ------------------------------ | ------------------------- |
| `offsetPagination(document, options?)`   | `{ state, loadMore, refresh }` | Offset pagination manager |
| `offsetMerge(existing, incoming, args?)` | `T[]`                          | Cache merge function      |

### OffsetPaginationState<T>

| Field     | Type                  | Description          |
| --------- | --------------------- | -------------------- |
| `items`   | `T[]`                 | Accumulated items    |
| `offset`  | `number`              | Current offset       |
| `limit`   | `number`              | Page size            |
| `hasMore` | `boolean`             | More pages available |
| `loading` | `boolean`             | Currently fetching   |
| `error`   | `string \| undefined` | Error message        |
