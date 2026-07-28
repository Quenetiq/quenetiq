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

### Vanilla JS

```ts
import { createClient, gql, isSuccess } from '@quenetiq/client';
import { cursorPagination, offsetPagination } from '@quenetiq/pagination';

const client = createClient({ endpoint: '/graphql' });

const FEED = gql`query Feed($first: Int!, $after: String) {
  feed(first: $first, after: $after) {
    edges { node { id title } }
    pageInfo { endCursor hasNextPage }
  }
}`;

// Cursor-based pagination helper
const paginate = cursorPagination();

async function loadMore(cursor?: string) {
  const result = await client.query(FEED, { first: 10, after: cursor });
  if (isSuccess(result)) {
    const { edges, pageInfo } = result.data.feed;
    paginate(edges, pageInfo);
    console.log('Items:', edges.length, 'Has more:', pageInfo.hasNextPage);
  }
}

loadMore(); // first page
```

### Angular

```ts
import { provideQuenetiq, GraphqlService, gql } from '@quenetiq/core';
import { cursorPagination } from '@quenetiq/pagination';
import { createHttpLink } from '@quenetiq/core/link';

export const appConfig: ApplicationConfig = {
  providers: [
    provideQuenetiq({ link: createHttpLink({ uri: '/graphql' }) }),
  ],
};

@Component({ ... })
export class FeedComponent {
  private graphql = inject(GraphqlService);
  items: any[] = [];
  pageInfo: any;

  loadMore(cursor?: string) {
    this.graphql.query(gql`query Feed($first: Int!, $after: String) {
      feed(first: $first, after: $after) {
        edges { node { id title } }
        pageInfo { endCursor hasNextPage }
      }
    }`, { variables: { first: 10, after: cursor } }).subscribe(res => {
      if (res.status === 'success') {
        this.items.push(...res.data.feed.edges);
        this.pageInfo = res.data.feed.pageInfo;
      }
    });
  }
}
```

### React

```tsx
import { QuenetiqProvider, useQuery, gql } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const FEED = gql`query Feed($first: Int!, $after: String) {
  feed(first: $first, after: $after) {
    edges { node { id title } }
    pageInfo { endCursor hasNextPage }
  }
}`;

function Feed() {
  const { data, fetchMore } = useQuery(FEED, {
    variables: { first: 10 },
  });

  return (
    <div>
      <ul>
        {data?.feed.edges.map(e => <li key={e.node.id}>{e.node.title}</li>)}
      </ul>
      {data?.feed.pageInfo.hasNextPage && (
        <button onClick={() => fetchMore({
          variables: { after: data.feed.pageInfo.endCursor },
        })}>Load More</button>
      )}
    </div>
  );
}

function App() {
  return <QuenetiqProvider client={client}><Feed /></QuenetiqProvider>;
}
```

### Vue

```vue
<script setup lang="ts">
import { createQuenetiqPlugin, useQuery, gql } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });
const app = createApp(App);
app.use(createQuenetiqPlugin(client));

const FEED = gql`query Feed($first: Int!, $after: String) {
  feed(first: $first, after: $after) {
    edges { node { id title } }
    pageInfo { endCursor hasNextPage }
  }
}`;

const { data, fetchMore } = useQuery(FEED, { variables: { first: 10 } });
</script>

<template>
  <ul>
    <li v-for="e in data?.feed.edges" :key="e.node.id">{{ e.node.title }}</li>
  </ul>
  <button v-if="data?.feed.pageInfo.hasNextPage"
    @click="fetchMore({ variables: { after: data.feed.pageInfo.endCursor } })">
    Load More
  </button>
</template>
```

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

## Try it live

:::stackblitz starter="pagination"
