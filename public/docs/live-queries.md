---
title: "Live Queries"
slug: live-queries
group: "Features"
order: 2
since: "0.0.2-alpha.1"
tags: [live, realtime]
description: "Real-time live queries"
---

# Live Queries

Live Queries provide real-time data synchronization using the `graphql-transport-ws` protocol. They combine an initial HTTP fetch with a WebSocket subscription, so you get immediate cacheable data followed by live updates.

## Overview

Live Queries work in two phases:

1. **Initial fetch** — a standard HTTP `POST` request returns the current server state. This data is cacheable and works with your existing middleware (auth, retry, APQ, etc.).
2. **WebSocket subscription** — after the initial response, a WebSocket connection is established using the `graphql-transport-ws` protocol. The server pushes incremental updates as they happen.

This two-phase approach gives you the best of both worlds: reliable, cacheable initial data and real-time updates without polling.

## React: useLiveQuery

The `useLiveQuery` hook works similarly to `useQuery` but subscribes to real-time updates after the initial fetch.

```tsx
import { useLiveQuery } from '@quenetiq/react';
import { gql } from '@quenetiq/client';

const POSTS_LIVE = gql`
  subscription LivePosts {
    postAdded {
      id
      title
      author { name }
    }
  }
`;

function LivePosts() {
  const { data, loading, error } = useLiveQuery(POSTS_LIVE, {
    variables: {},
    shouldSubscribe: true,
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;

  return (
    <ul>
      {data?.postAdded.map(post => (
        <li key={post.id}>{post.title} — {post.author.name}</li>
      ))}
    </ul>
  );
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `variables` | `Record<string, unknown>` | `{}` | GraphQL variables for the query |
| `wsEndpoint` | `string` | `http → ws` | Custom WebSocket endpoint. Defaults to the client endpoint with `http` replaced by `ws` |
| `shouldSubscribe` | `boolean` | `true` | Set to `false` to skip the WebSocket subscription (one-shot query) |
| `onCompleted` | `(data) => void` | — | Called on every data update (initial + live) |
| `onError` | `(error, code) => void` | — | Called on error |

## Vue: useLiveQuery

The Vue composable has the same API surface as the React hook:

```ts
import { useLiveQuery } from '@quenetiq/vue';
import { gql } from '@quenetiq/client';
import { defineComponent } from 'vue';

const POSTS_LIVE = gql`
  subscription LivePosts {
    postAdded {
      id
      title
      author { name }
    }
  }
`;

export default defineComponent({
  setup() {
    const { data, loading, error } = useLiveQuery(POSTS_LIVE, {
      variables: {},
      shouldSubscribe: true,
    });

    return { data, loading, error };
  },
});
```

It returns a reactive `data` ref that updates in real time. Use it inside `<Suspense>` or render it conditionally based on `loading` / `error`.

## Angular: Live Queries

Angular uses the `GraphqlLiveQuery` class directly. It integrates with `GraphqlService` for the initial fetch and manages the WebSocket lifecycle:

```ts
import { Component, inject } from '@angular/core';
import { GraphqlService } from '@quenetiq/core';
import { GraphqlLiveQuery } from '@quenetiq/subscriptions';
import { gql } from '@quenetiq/client';

const POSTS_LIVE = gql`
  subscription LivePosts {
    postAdded {
      id
      title
      author { name }
    }
  }
`;

@Component({
  selector: 'app-live-posts',
  standalone: true,
  template: `
    <ul>
      @for (post of posts; track post.id) {
        <li>{{ post.title }} — {{ post.author?.name }}</li>
      }
    </ul>
  `,
})
export class LivePosts {
  private gql = inject(GraphqlService);
  posts: Post[] = [];

  constructor() {
    const liveQuery = new GraphqlLiveQuery(this.gql.endpoint);

    liveQuery.execute(POSTS_LIVE, {}, {
      next: (data) => {
        if (data.postAdded) {
          this.posts = [...this.posts, data.postAdded];
        }
      },
      error: (err) => console.error('Live query error', err),
    });
  }
}
```

## GraphqlLiveQuery Class

The `GraphqlLiveQuery` class from `@quenetiq/subscriptions` is the framework-agnostic core that powers both React and Vue hooks. You can use it directly in any JavaScript environment:

```ts
import { GraphqlLiveQuery } from '@quenetiq/subscriptions';

const live = new GraphqlLiveQuery('https://api.example.com/graphql');

// Returns an unsubscribe function
const unsubscribe = await live.execute(
  gql`subscription { notifications { id message } }`,
  { userId: '123' },
  {
    next: (data) => console.log('New notification:', data),
    error: (err) => console.error('Subscription error:', err),
    complete: () => console.log('Subscription ended'),
  },
);

// Later, to stop listening:
unsubscribe();
```

## WebSocket Protocol

Live Queries use the `graphql-transport-ws` protocol, the newer and more robust WebSocket sub-protocol for GraphQL. This is the same protocol used by Apollo Client v3+ and recommended by the GraphQL over WebSocket specification.

### Message Flow

1. **Client → Server:** `{ type: 'connection_init' }`
2. **Server → Client:** `{ type: 'connection_ack' }`
3. **Client → Server:** `{ type: 'subscribe', id, payload: { query, variables } }`
4. **Server → Client:** `{ type: 'next', payload: { data } }` (repeated)
5. **Client → Server:** `{ type: 'complete', id }` (on unsubscribe)

This protocol avoids the race conditions and reconnection issues of the older `subscriptions-transport-ws` protocol.

## API Reference

| Name | Description | Type |
|------|-------------|------|
| `GraphqlLiveQuery` | Framework-agnostic class that combines an initial HTTP query fetch with a WebSocket subscription for real-time updates. | class |
| `GraphqlLiveQuery.constructor` | Creates a new GraphqlLiveQuery instance with the GraphQL endpoint URL. | constructor |
| `GraphqlLiveQuery.execute(query, variables?, callbacks?)` | Executes initial HTTP POST fetch, then subscribes via WebSocket using the graphql-transport-ws protocol. Returns a Promise resolving to an unsubscribe function. | method |

## Starters

### Vanilla JS

```ts
import { createClient, gql } from '@quenetiq/client';

const client = createClient({
  endpoint: '/graphql',
  wsEndpoint: 'ws://localhost:4000/graphql',
});

const TYPED_SUB = gql`subscription {
  todoUpdated { id title done }
}`;

// useLiveQuery equivalent — manual fetch + subscription
(async () => {
  const initial = await client.query(gql`{ todos { id title done } }`);
  console.log('Initial:', initial.data?.todos);

  for await (const update of client.subscribe(TYPED_SUB)) {
    if (update.status === 'success') {
      console.log('Updated:', update.data.todoUpdated);
    }
  }
})();
```

### Angular

```ts
import { provideQuenetiq, query, gql } from '@quenetiq/core';
import { createHttpLink } from '@quenetiq/core/link';

export const appConfig: ApplicationConfig = {
  providers: [
    provideQuenetiq({ link: createHttpLink({ uri: '/graphql' }) }),
  ],
};

// Live queries in Angular use regular query() with polling,
// or combine query with subscriptions
@Component({ ... })
export class LiveTodosComponent implements OnInit {
  private graphql = inject(GraphqlService);

  ngOnInit() {
    this.graphql.query(gql`{ todos { id title done } }`).subscribe(result => {
      console.log('Live data:', result.data?.todos);
    });
  }
}
```

### React

```tsx
import { QuenetiqProvider, useLiveQuery, gql } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';

const client = createClient({
  endpoint: '/graphql',
  wsEndpoint: 'ws://localhost:4000/graphql',
});

function TodoList() {
  const { data, loading } = useLiveQuery(gql`subscription {
    todoUpdated { id title done }
  }`);

  if (loading) return <p>Connecting...</p>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

function App() {
  return <QuenetiqProvider client={client}><TodoList /></QuenetiqProvider>;
}
```

### Vue

```ts
import { createQuenetiqPlugin, useLiveQuery, gql } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';
import { createApp } from 'vue';

const client = createClient({
  endpoint: '/graphql',
  wsEndpoint: 'ws://localhost:4000/graphql',
});
const app = createApp(App);
app.use(createQuenetiqPlugin(client));
```

```vue
<script setup lang="ts">
const { data, loading } = useLiveQuery(gql`subscription {
  todoUpdated { id title done }
}`);
</script>

<template>
  <p v-if="loading">Connecting...</p>
  <pre v-else>{{ data }}</pre>
</template>
```
