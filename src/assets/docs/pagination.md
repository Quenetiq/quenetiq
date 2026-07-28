---
title: Pagination
slug: pagination
group: Features
order: 4
since: 0.0.1
tags:
  - pagination
  - offset
  - cursor
description: Offset and cursor pagination
---

# @quenetiq/pagination

The pagination package provides helper functions for handling offset-based and cursor-based pagination. These functions work with the cache's type policy `merge` configuration to append pages seamlessly.

## offsetPagination

Use `offsetPagination` for traditional page-based pagination with `page` and `limit` parameters:

```ts
import { offsetPagination } from '@quenetiq/pagination';
import { provideQuenetiqCache } from '@quenetiq/cache';

provideQuenetiqCache({
  typePolicies: {
    BooksConnection: {
      merge: offsetPagination({ offsetField: 'page', limitField: 'limit' }),
    },
  },
});
```

## cursorPagination

Use `cursorPagination` for relay-style cursor-based pagination with `after` / `before` cursors:

```ts
import { cursorPagination } from '@quenetiq/pagination';

provideQuenetiqCache({
  typePolicies: {
    PostConnection: {
      merge: cursorPagination({
        cursorField: 'cursor',
        edgesField: 'edges',
        pageInfoField: 'pageInfo',
      }),
    },
  },
});
```

## Merge Functions

Both pagination helpers return a merge function that tells the cache how to combine existing and incoming data. They handle:

- Appending new items to the existing list
- Deduplicating items by `id` or cursor
- Updating `pageInfo` with the latest cursors
- Respecting `__typename` for cache normalization

You can also write custom merge functions for advanced use cases:

```ts
// Custom merge example
provideQuenetiqCache({
  typePolicies: {
    Comments: {
      merge: (existing, incoming, { args }) => {
        if (!existing) return incoming;
        return {
          ...incoming,
          items: args?.refresh
            ? incoming.items
            : [...existing.items, ...incoming.items],
        };
      },
    },
  },
});
```

## Starters

:::stackblitz starter="pagination"

:::stackblitz starter="angular"

:::stackblitz starter="react"

:::stackblitz starter="vue"

## API Reference

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `offsetPagination(document, options)` | Creates an observable pagination state with loadMore/refresh for offset-based APIs. | function | |
| `OffsetPaginationConfig` | Configuration for offset pagination merge function. | interface | |
| `OffsetPaginationConfig.limit` | Default page size. | property | `20` |
| `OffsetPaginationConfig.offset` | Initial offset. | property | `0` |
| `OffsetPaginationState<T>` | Observable pagination state with items, offset, hasMore, loading, error. | interface | |
| `OffsetPaginationState.items` | Accumulated items array. | property | |
| `OffsetPaginationState.offset` | Current offset. | property | |
| `OffsetPaginationState.limit` | Current page size. | property | |
| `OffsetPaginationState.hasMore` | Whether more pages are available. | property | |
| `OffsetPaginationState.loading` | Whether a fetch is in progress. | property | |
| `OffsetPaginationState.error` | Error message if fetch failed. | property | |
| `OffsetPaginationResult<T>` | Result shape expected from offset-based query responses. | interface | |
| `OffsetPaginationResult.items` | Page items. | property | |
| `OffsetPaginationResult.totalCount` | Total item count. | property | |
| `OffsetPaginationResult.hasMore` | Whether more pages exist. | property | |
| `offsetMerge(existing, incoming, options?)` | Cache merge function for offset-based pagination using args.offset. | function | |
| `cursorPagination(document, variables?)` | Creates a QueryHandle for Relay-style cursor-based pagination. | function | |
| `CursorPaginationConfig` | Configuration for cursor pagination merge function. | interface | |
| `CursorPaginationConfig.first` | Number of items to fetch. | property | — |
| `CursorPaginationConfig.after` | Cursor to fetch items after. | property | — |
| `CursorPaginationResult<T>` | Result shape for cursor-based paginated queries. | interface | |
| `CursorPaginationResult.items` | Accumulated items. | property | |
| `CursorPaginationResult.cursor` | Last cursor for next page. | property | |
| `CursorPaginationResult.hasMore` | Whether more pages exist. | property | |
| `PageInfo` | Relay connection PageInfo with cursors and booleans. | interface | |
| `PageInfo.hasNextPage` | Whether more pages exist forward. | property | |
| `PageInfo.hasPreviousPage` | Whether more pages exist backward. | property | |
| `PageInfo.startCursor` | Cursor of the first edge. | property | |
| `PageInfo.endCursor` | Cursor of the last edge. | property | |
| `CursorEdge<T>` | A single edge with node and cursor. | interface | |
| `CursorEdge.node` | The item. | property | |
| `CursorEdge.cursor` | Cursor for this edge. | property | |
| `CursorConnection<T>` | Relay connection shape with edges, pageInfo, and optional totalCount. | interface | |
| `CursorConnection.edges` | Array of edges. | property | |
| `CursorConnection.pageInfo` | PageInfo with cursors. | property | |
| `CursorConnection.totalCount` | Optional total count. | property | |
| `cursorMerge(existing, incoming)` | Cache merge function for cursor-based pagination (appends incoming). | function | |
