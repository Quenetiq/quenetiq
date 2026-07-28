# @quenetiq/pagination

Stateful offset‑based and cursor‑based pagination helpers with merge functions.

## Install

```bash
npm install @quenetiq/pagination
```

## Cursor Pagination

```typescript
import { cursorPagination, cursorMerge } from '@quenetiq/pagination';
import { gql } from '@quenetiq/core';

const handle = cursorPagination<{ id: string; title: string }>(
  gql`query Todos($first: Int, $after: String) {
    todos(first: $first, after: $after) { edges { node { id title } } }
  }`,
  { first: 20 },
);

handle.result$.subscribe(console.log);
handle.refetch();

// Merge function for cache type policies
cacheMiddleware({ policies: { Todo: { merge: cursorMerge } } });
```

## Offset Pagination

```typescript
import { offsetPagination, offsetMerge } from '@quenetiq/pagination';

const { state, loadMore, refresh } = offsetPagination<Todo>(
  gql`query Todos($offset: Int, $limit: Int) { … }`,
  { limit: 20 },
);

state.subscribe(s => console.log(s.items));
```

## API

| Export | Description |
|--------|-------------|
| `cursorPagination(document, variables?)` | Returns `QueryHandle<CursorConnection<T>>` |
| `cursorMerge(existing, incoming)` | Append‑style merge for type policies |
| `offsetPagination(document, options)` | Returns `{ state, loadMore, refresh }` |
| `offsetMerge(existing, incoming, options?)` | Offset‑aware merge for type policies |
| `CursorConnection<T>` | `{ edges, pageInfo, totalCount? }` |
| `OffsetPaginationState<T>` | `{ items, offset, limit, hasMore, loading, error }` |

## Dependencies

`@angular/core`, `@quenetiq/core`, `rxjs`
