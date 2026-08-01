---
title: 'Cursor Pagination'
slug: cursor-pagination
group: 'Features'
order: 2
since: '0.0.1'
tags: [pagination, cursor]
description: 'Cursor-based pagination'
---

# Cursor Pagination

Creates a cursor-based pagination query using Relay-style connection patterns.

```typescript
import { cursorPagination, cursorMerge } from '@quenetiq/pagination';

const query = cursorPagination(GET_USERS, { first: 10 });

query.result$.subscribe((result) => {
	if (result.status === 'success') {
		const connection = result.data; // CursorConnection<User>
		console.log(connection.edges, connection.pageInfo);
	}
});
```

## cursorMerge

Cache merge function for cursor pagination (concatenates items):

```typescript
const cache = new CacheStore({
	typePolicies: {
		UserConnection: { merge: cursorMerge },
	},
});
```

## API Reference

| Function                                 | Returns                            | Description             |
| ---------------------------------------- | ---------------------------------- | ----------------------- |
| `cursorPagination(document, variables?)` | `QueryHandle<CursorConnection<T>>` | Cursor pagination query |

### Types

| Type                        | Fields                                                        | Description      |
| --------------------------- | ------------------------------------------------------------- | ---------------- |
| `CursorConnection<T>`       | `edges: CursorEdge<T>[]`, `pageInfo: PageInfo`, `totalCount?` | Relay connection |
| `CursorEdge<T>`             | `node: T`, `cursor: string`                                   | Connection edge  |
| `PageInfo`                  | `hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor`  | Relay page info  |
| `CursorPaginationResult<T>` | `items`, `cursor?`, `hasMore`                                 | Simplied result  |
