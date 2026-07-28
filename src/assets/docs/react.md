---
title: "@quenetiq/react"
slug: react
group: "Frameworks"
order: 1
since: "0.0.1"
tags: [react, hooks]
description: "React hooks and components"
---

# @quenetiq/react

React bindings for `@quenetiq/client`. Provides hooks (`useQuery`, `useMutation`, `useSubscription`, `useFragment`, `useLiveQuery`, `useSuspenseQuery`, `useBackgroundQuery`, `useReadQuery`, `usePrefetch`, `useVal`), components (`RateLimitGate`, `NullOverlay`), render-prop components, and a `QuenetiqProvider` context wrapper.

## Quick Start

```tsx
import { QuenetiqProvider, useQuery, gql } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';
import { createCache } from '@quenetiq/cache';

const client = createClient({ endpoint: '/graphql' });
const cache = createCache();

const GET_TODOS = gql`query Todos { todos { id title } }`;

function Todos() {
  const { data, loading, error, refetch } = useQuery(GET_TODOS);

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <ul>
      {data.todos.map(todo => <li key={todo.id}>{todo.title}</li>)}
    </ul>
  );
}

function App() {
  return (
    <QuenetiqProvider client={client} cache={cache}>
      <Todos />
    </QuenetiqProvider>
  );
}
```

## Hooks

### useQuery

Executes a query on mount. Returns `{ data, loading, error, refetch }`. Automatically refetches when variables change.

### useMutation

Returns a mutate function and result state. Supports **optimistic updates** via the `optimistic` option — receives the `CacheStore` and returns an ID. The update is automatically committed on success or rolled back on error:

```tsx
const ADD_TODO = gql`mutation AddTodo($title: String!) {
  addTodo(title: $title) { id title }
}`;

function AddTodoForm() {
  const [mutate, { data, loading, error }] = useMutation(ADD_TODO);
  return <button onClick={() => mutate({ title: 'New' })}>Add</button>;
}

// With optimistic update:
const [mutate] = useMutation(ADD_TODO, {
  optimistic: (cache) => {
    cache.applyOptimistic({
      id: 'opt-1', entities: [{ __typename: 'Todo', id: 'temp-1', title: 'New' }],
    });
    return 'opt-1';
  },
});
```

### useSubscription

Connects to a WebSocket subscription. Supports **auto-reconnect** with exponential backoff (`reconnect`, `reconnectInterval`, `maxReconnects`):

```tsx
const { data } = useSubscription(
  gql`subscription OnMessage { messageAdded { content } }`,
  { reconnect: true, reconnectInterval: 2000, maxReconnects: 5 },
);
```

## Fragments

`useFragment` subscribes to a normalized fragment by `__typename` + `id`. Returns `{ data, complete }` — re-renders whenever that entity updates in the cache.

```tsx
import { useFragment, gql } from '@quenetiq/react';

const TODO_FIELDS = gql`
  fragment TodoFields on Todo {
    id title completed
  }
`;

function TodoItem({ todoId }: { todoId: string }) {
  const { data, complete } = useFragment(TODO_FIELDS, {
    __typename: 'Todo',
    id: todoId,
  });

  if (!complete) return <p>Loading fragment…</p>;
  return <p>{data.title}</p>;
}
```

## Live Queries

`useLiveQuery` combines a query with a subscription for real-time updates. Automatically subscribes after the initial fetch and merges incoming changes.

```tsx
import { useLiveQuery, gql } from '@quenetiq/react';

const { data, loading, error } = useLiveQuery(
  gql`subscription { todoUpdated { id title } }`,
  { wsEndpoint: 'wss://api.example.com/graphql' },
);
```

## Pagination

Use `fetchMore` with cursor or offset pagination from `@quenetiq/pagination`. The `cursorMerge` helper appends incoming edges to the cached list.

```tsx
import { useQuery, gql } from '@quenetiq/react';
import { cursorPagination } from '@quenetiq/pagination';

const FEED_QUERY = gql`
  query Feed($first: Int!, $after: String) {
    feed(first: $first, after: $after) {
      edges { node { id title } }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

function Feed() {
  const { data, fetchMore } = useQuery(FEED_QUERY, {
    variables: { first: 10 },
  });

  return (
    <button onClick={() => fetchMore({
      variables: { after: data.feed.pageInfo.endCursor },
    })}>
      Load More
    </button>
  );
}
```

## Persisted Queries

Automatic Persisted Queries (APQ) reduce bandwidth by sending a hash first. Attach `apqMiddleware` from `@quenetiq/persisted-queries` to the client:

```ts
import { apqMiddleware } from '@quenetiq/persisted-queries';
import { createClient } from '@quenetiq/client';

const client = createClient({
  endpoint: '/graphql',
  middlewares: [apqMiddleware()],
});
```

## Suspense & SSR

`useSuspenseQuery` integrates with React Suspense for data loading. `usePrefetch` fires a query ahead of navigation.

```tsx
import { useSuspenseQuery, usePrefetch, gql } from '@quenetiq/react';

function TodoList() {
  const { data } = useSuspenseQuery(gql`query { todos { id title } }`);
  return <ul>{data.todos.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
}

// Prefetch for route-level
function prefetch() {
  const prefetchQuery = usePrefetch(gql`query { todos { id title } }`);
  return prefetchQuery();
}
```

## Testing

Use `@quenetiq/testing` with React Testing Library. Create a `MockGraphqlService` and wrap components in `QuenetiqProvider`.

```tsx
import { render, screen } from '@testing-library/react';
import { QuenetiqProvider } from '@quenetiq/react';
import { provideQuenetiqTesting, MockGraphqlService } from '@quenetiq/testing';

const mockService = new MockGraphqlService();

function renderWithProvider(ui: ReactElement) {
  return render(
    <QuenetiqProvider client={mockService as any} cache={null}>
      {ui}
    </QuenetiqProvider>
  );
}
```

## Debugging

`@quenetiq/debugging` provides `GraphqlDebugService` to log and inspect every operation. Enable it during development to trace queries, mutations, and cache activity.

```ts
import { GraphqlDebugService } from '@quenetiq/debugging';

const debugService = new GraphqlDebugService();
debugService.enable();

// Access logged operations
const entries = debugService.getAll();
```

## OpenTelemetry

`@quenetiq/opentelemetry` adds distributed tracing. Create a `MinimalTracer` and set it as the global tracer. Exported spans include query/mutation execution time and cache hits.

```ts
import { consoleExporter } from '@quenetiq/opentelemetry';
import { setTracer, MinimalTracer } from '@quenetiq/opentelemetry';

const tracer = new MinimalTracer({
  serviceName: 'my-app',
  exporter: consoleExporter(),
});
setTracer(tracer);
```

## RateLimitGate

`RateLimitGate` wraps your UI and shows a countdown banner when `isLimited` is true. Fires `onRetry` when the countdown completes.

## Reactive Val

`useVal` creates a mutable reactive value container with null-handling utilities (`nullify`, `isNull`, `orElse`, `match`, etc.). Re-renders on every mutation.

```tsx
import { useVal } from '@quenetiq/react';

function Counter() {
  const count = useVal(0);
  return <button onClick={() => count.set(count.value + 1)}>{count.value}</button>;
}

// Null-handling:
const name = useVal<string | null>(null);
name.orElse('Guest'); // 'Guest'
name.match(
  (v) => `Hello, ${v}`,
  () => 'Hello, Guest',
);
```

## Render-prop Components

Alternative to hooks — useful in class components or when you need inline query logic:

```tsx
import { Query, Mutation, gql } from '@quenetiq/react';

<Query document={gql`query { todos { id title } }`}>
  {({ data, loading }) => (
    <div>
      {loading ? <p>Loading…</p> : data.todos.map(t => <p key={t.id}>{t.title}</p>)}
    </div>
  )}
</Query>
```

## API Reference

### Provider & Context

| Name | Description | Type |
|------|-------------|------|
| `QuenetiqProvider` | Context provider that injects client + optional cache into the React tree. | component |
| `QuenetiqProviderProps` | `{ client, cache?, children }` | interface |
| `QuenetiqProviderProps.client` | QuenetiqClient instance. | property |
| `QuenetiqProviderProps.cache` | Optional CacheStore instance. | property |
| `QuenetiqProviderProps.children` | React sub-tree. | property |
| `useClient()` | Returns QuenetiqClient from the nearest QuenetiqProvider. Throws if missing. | hook |
| `useCache()` | Returns CacheStore \| null from the nearest QuenetiqProvider. | hook |

### useQuery

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `useQuery(document, options?)` | Reactive query hook. Executes on mount. Use fetchPolicy, pollInterval, skip, onCompleted, onError to control behaviour. | hook | |
| `UseQueryOptions` | `{ variables?, pollInterval?, skip?, onCompleted?, onError?, fetchPolicy? }` | interface | |
| `UseQueryOptions.variables` | Query variables. | property | |
| `UseQueryOptions.pollInterval` | Auto-poll interval in ms. | property | |
| `UseQueryOptions.skip` | Skip the query on mount. | property | `false` |
| `UseQueryOptions.onCompleted` | Callback with data on success. | property | |
| `UseQueryOptions.onError` | Callback with error string and optional errorCode. | property | |
| `UseQueryOptions.fetchPolicy` | Cache-first, network-only, or no-cache. | property | `'cache-first'` |
| `UseQueryResult` | `{ data, loading, error, errorCode?, networkStatus, called, refetch, fetchMore }` | interface | |
| `UseQueryResult.data` | Response data or null. | property | |
| `UseQueryResult.loading` | True while request is in-flight. | property | |
| `UseQueryResult.error` | Error message string or null. | property | |
| `UseQueryResult.errorCode` | Categorised error code. | property | |
| `UseQueryResult.networkStatus` | loading \| ready \| error \| refetching \| poll. | property | |
| `UseQueryResult.called` | True once the query has fired at least once. | property | |
| `UseQueryResult.refetch` | Re-execute the query with optional new variables. | property | |
| `UseQueryResult.fetchMore` | Merge pagination helper: fetchMore(mergeFn, vars?). | property | |
| `NetworkStatus` | Union type: loading \| ready \| error \| refetching \| poll. | type | |

### useMutation

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `useMutation(document, options?)` | Returns mutate function and reactive result. Supports optimistic cache updates via update option. | hook | |
| `UseMutationOptions` | `{ variables?, onCompleted?, onError?, update?, optimistic? }` | interface | |
| `UseMutationOptions.variables` | Default mutation variables. | property | |
| `UseMutationOptions.onCompleted` | Callback with data on success. | property | |
| `UseMutationOptions.onError` | Callback with error string and optional errorCode. | property | |
| `UseMutationOptions.update` | Cache write after mutation: update(cache, result). | property | |
| `UseMutationOptions.optimistic` | Optimistic update callback: (cache) => string. Called before mutation. Auto-committed on success, rolled back on error. | property | |
| `UseMutationResult` | `{ data, loading, error, errorCode?, called, mutate }` | interface | |
| `UseMutationResult.data` | Response data or null. | property | |
| `UseMutationResult.loading` | True while mutation is in-flight. | property | |
| `UseMutationResult.error` | Error message string or null. | property | |
| `UseMutationResult.errorCode` | Categorised error code. | property | |
| `UseMutationResult.called` | True once mutate has been called. | property | |
| `UseMutationResult.mutate` | Execute the mutation: mutate(vars?). Returns Promise\<GraphQLResult\>. | property | |
| `UseMutationFn` | Mutate function signature: (variables?) => Promise\<GraphQLResult\<TData\>\>. | type | |

### useSubscription

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `useSubscription(document, options?)` | Connects to a WebSocket subscription. Fires on mount, cleans up on unmount. | hook | |
| `UseSubscriptionOptions` | `{ variables?, wsEndpoint?, shouldSubscribe?, reconnect?, reconnectInterval?, maxReconnects?, onNext?, onError?, onComplete? }` | interface | |
| `UseSubscriptionOptions.variables` | Subscription variables. | property | |
| `UseSubscriptionOptions.wsEndpoint` | WebSocket URL. Defaults to HTTP→WS transform of client endpoint. | property | |
| `UseSubscriptionOptions.shouldSubscribe` | Conditionally enable/disable the subscription. | property | `true` |
| `UseSubscriptionOptions.reconnect` | Enable auto-reconnect with exponential backoff. | property | `false` |
| `UseSubscriptionOptions.reconnectInterval` | Base reconnect interval in ms. | property | `2000` |
| `UseSubscriptionOptions.maxReconnects` | Max reconnect attempts before giving up. | property | `5` |
| `UseSubscriptionOptions.onNext` | Callback with each new data payload. | property | |
| `UseSubscriptionOptions.onError` | Callback with error string and optional errorCode. | property | |
| `UseSubscriptionOptions.onComplete` | Callback when the subscription stream completes. | property | |
| `UseSubscriptionResult` | `{ data, loading, error, errorCode? }` | interface | |
| `UseSubscriptionResult.data` | Latest subscription data or null. | property | |
| `UseSubscriptionResult.loading` | True while initial subscription is establishing. | property | |
| `UseSubscriptionResult.error` | Error message string or null. | property | |
| `UseSubscriptionResult.errorCode` | Categorised error code. | property | |

### useLiveQuery

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `useLiveQuery(document, options?)` | Combines a one-shot query with a WebSocket subscription for real-time updates. | hook | |
| `UseLiveQueryOptions` | `{ variables?, wsEndpoint?, shouldSubscribe?, onCompleted?, onError? }` | interface | |
| `UseLiveQueryOptions.variables` | Query / subscription variables. | property | |
| `UseLiveQueryOptions.wsEndpoint` | WebSocket URL. Defaults to HTTP→WS transform of client endpoint. | property | |
| `UseLiveQueryOptions.shouldSubscribe` | Conditionally enable/disable the WS subscription. | property | `true` |
| `UseLiveQueryOptions.onCompleted` | Callback on query success or WS update. | property | |
| `UseLiveQueryOptions.onError` | Callback with error string and optional errorCode. | property | |
| `UseLiveQueryResult` | `{ data, loading, error, errorCode? }` | interface | |
| `UseLiveQueryResult.data` | Latest data from query or subscription. | property | |
| `UseLiveQueryResult.loading` | True while initial query is in-flight. | property | |
| `UseLiveQueryResult.error` | Error message string or null. | property | |
| `UseLiveQueryResult.errorCode` | Categorised error code. | property | |

### useFragment

| Name | Description | Type |
|------|-------------|------|
| `useFragment(fragment, identifier)` | Subscribes to a normalized cache fragment by \_\_typename and optional id. Returns `{ data, complete }`. | hook |
| `UseFragmentResult` | `{ data, complete }` | interface |
| `UseFragmentResult.data` | Fragment data from cache or null. | property |
| `UseFragmentResult.complete` | True when the fragment was fully resolved from cache. | property |

### usePrefetch

| Name | Description | Type |
|------|-------------|------|
| `usePrefetch(document)` | Fires a query ahead of navigation. Returns a prefetch(vars?) function that resolves once the query completes. | hook |

### Suspense hooks

| Name | Description | Type |
|------|-------------|------|
| `useSuspenseQuery(query, options?)` | Suspense-powered query. Throws a promise until data is available. Returns fully resolved data (error thrown as exception). | hook |
| `useBackgroundQuery(query, options?)` | Starts fetching in a parent component. Returns a QueryRef tuple for useReadQuery. | hook |
| `QueryRef` | `{ read(), refetch() }` returned by useBackgroundQuery. | interface |
| `QueryRef.read` | Read resolved data. Throws promise if still loading or error if failed. | property |
| `QueryRef.refetch` | Re-execute the query and return a promise of GraphQLResult. | property |
| `useReadQuery(queryRef)` | Reads resolved data from a QueryRef created by useBackgroundQuery. Returns `{ data }`. | hook |

### Render-prop Components

| Name | Description | Type |
|------|-------------|------|
| `Query` | Render-prop component for inline query execution. | component |
| `QueryProps` | `{ document, variables?, pollInterval?, skip?, children }` | interface |
| `QueryProps.document` | GraphQL document (gql\`...\`). | property |
| `QueryProps.variables` | Query variables. | property |
| `QueryProps.pollInterval` | Auto-poll interval in ms. | property |
| `QueryProps.skip` | Skip execution on mount. | property |
| `QueryProps.children` | Render function receiving UseQueryResult. | property |
| `Mutation` | Render-prop component for inline mutation execution. | component |
| `MutationProps` | `{ document, variables?, update?, children }` | interface |
| `MutationProps.document` | GraphQL document (gql\`...\`). | property |
| `MutationProps.variables` | Default mutation variables. | property |
| `MutationProps.update` | Local cache update callback: update(result). | property |
| `MutationProps.children` | Render function receiving (mutate, result). | property |
| `Subscription` | Render-prop component for inline subscription. | component |
| `SubscriptionProps` | `{ document, variables?, wsEndpoint?, shouldSubscribe?, children }` | interface |
| `SubscriptionProps.document` | GraphQL document (gql\`...\`). | property |
| `SubscriptionProps.variables` | Subscription variables. | property |
| `SubscriptionProps.wsEndpoint` | WebSocket URL. | property |
| `SubscriptionProps.shouldSubscribe` | Conditionally enable/disable. | property | `true` |
| `SubscriptionProps.children` | Render function receiving UseSubscriptionResult. | property |

### RateLimitGate

| Name | Description | Type |
|------|-------------|------|
| `RateLimitGate` | Wrapper that shows fallback UI when rate-limited. Runs a countdown and fires onRetry when elapsed. | component |
| `RateLimitGateProps` | `{ isLimited, children, fallback?, retryAfter?, onRetry?, error? }` | interface |
| `RateLimitGateProps.isLimited` | Whether rate limit is currently exceeded. | property |
| `RateLimitGateProps.children` | Normal UI shown when not limited. | property |
| `RateLimitGateProps.fallback` | Custom fallback UI when rate limited (default: built-in banner). | property |
| `RateLimitGateProps.retryAfter` | Countdown duration in ms (default: 5000). | property |
| `RateLimitGateProps.onRetry` | Callback fired when the countdown completes. | property |
| `RateLimitGateProps.error` | Optional error message to display in the default banner. | property |

### Re-exports from @quenetiq/client

| Name | Description | Type |
|------|-------------|------|
| `gql` | Tagged template literal for parsing GraphQL documents at build/run time. | function |
| `isSuccess` | Type guard: checks if a GraphQLResult has status === "success". | function |
| `isError` | Type guard: checks if a GraphQLResult has status === "error". | function |
| `unwrap` | Extracts data from a GraphQLResult or returns null on error. | function |
| `unwrapOrThrow` | Extracts data from a GraphQLResult or throws on error. | function |
| `GraphQLResult` | Result type: `{ status, data?, error?, errorCode? }` from client operations. | type |
| `CacheStore` | Normalized cache interface from @quenetiq/cache. Used by QuenetiqProvider and useCache. | type |

### Val

| Name | Description | Type |
|------|-------------|------|
| `useVal(initialValue)` | React hook that returns a ReactVal\<T\> — a reactive value container with null-handling methods. Re-renders on mutation. | hook |
| `ReactVal<T>` | Interface: `{ value, set, update, nullify, isNull, isEmpty, reset, peek, tap, swap, orElse, match }` | interface |
| `ReactVal.value` | Current value (reactive read). | property |
| `ReactVal.set(v)` | Sets the value and triggers re-render. | method |
| `ReactVal.update(fn)` | Updates the value via fn(prev) => next and triggers re-render. | method |

## Starters

:::stackblitz starter="react"
