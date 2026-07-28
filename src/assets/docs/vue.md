---
title: "@quenetiq/vue"
slug: vue
group: "Frameworks"
order: 2
since: "0.0.1"
tags: [vue, composables]
description: "Vue composables and plugin"
---

# @quenetiq/vue

Vue composables for `@quenetiq/client`. Provides `useQuery`, `useMutation`, `useSubscription`, `useLiveQuery`, `useFragment`, `useSuspenseQuery`, `useBackgroundQuery`, `useReadQuery`, `usePrefetch`, `useVal`, components (`RateLimitGate`, `NullOverlay`), directives (`v-dql-mutate`, `v-dql-loading`), and a Vue plugin (`createQuenetiqPlugin`) for global client registration.

## Quick Start

```vue
<script setup>
import { createQuenetiqPlugin, useQuery, gql } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const GET_TODOS = gql`query Todos { todos { id title } }`;
const { data, loading, error, refetch } = useQuery(GET_TODOS);
</script>

<template>
  <p v-if="loading">Loading…</p>
  <p v-else-if="error">{{ error }}</p>
  <ul v-else>
    <li v-for="todo in data.todos" :key="todo.id">{{ todo.title }}</li>
  </ul>
</template>
```

## Composables

### useQuery

Reactive query composable. Returns `{ data, loading, error, refetch }`. All values are Vue `ref`s. Supports `onServerPrefetch` for SSR.

### useMutation

Supports **optimistic updates** via `optimistic` option — receives cache, returns an ID. Auto-committed on success, rolled back on error.

```ts
const ADD_TODO = gql`mutation AddTodo($title: String!) {
  addTodo(title: $title) { id title }
}`;

const { mutate, data, loading, error } = useMutation(ADD_TODO);

function handleSubmit() {
  mutate({ title: 'New Todo' });
}
```

### useSubscription

Supports **auto-reconnect** with exponential backoff (`reconnect`, `reconnectInterval`, `maxReconnects`):

```ts
const { data } = useSubscription(
  gql`subscription OnMessage { messageAdded { content } }`,
  { reconnect: true, reconnectInterval: 2000, maxReconnects: 5 },
);
```

### useFragment

Reads a normalized entity from the cache by `__typename` + `id`. Returns `{ data, complete }` — reactive cache lookup, no network request.

```ts
import { useFragment, gql } from '@quenetiq/vue';

const TODO_FIELDS = gql`
  fragment TodoFields on Todo {
    id title completed
  }
`;

const { data, complete } = useFragment(TODO_FIELDS, {
  __typename: 'Todo',
  id: props.todoId,
});
```

## Fragments

`useFragment` reads a normalized cache entity by `__typename` + `id`. No network request — pure cache lookup. Returns `{ data, complete }`.

```ts
import { useFragment, gql } from '@quenetiq/vue';

const TODO_FIELDS = gql`
  fragment TodoFields on Todo {
    id title completed
  }
`;

const { data, complete } = useFragment(TODO_FIELDS, {
  __typename: 'Todo',
  id: props.todoId,
});
```

## Live Queries

`useLiveQuery` combines a query with a WebSocket subscription for real-time updates. Fetches once, then subscribes and merges incoming changes automatically.

```vue
<script setup>
const { data, loading } = useLiveQuery(
  gql`subscription { todoUpdated { id title } }`,
  { wsEndpoint: 'wss://api.example.com/graphql' },
);
</script>

<template>
  <p v-if="loading">Waiting for updates…</p>
  <p v-else>{{ data?.title }}</p>
</template>
```

## Pagination

Use `fetchMore` with cursor or offset pagination from `@quenetiq/pagination`. Variables are reactive — pass them as `ref`s.

```ts
const FEED_QUERY = gql`
  query Feed($first: Int!, $after: String) {
    feed(first: $first, after: $after) {
      edges { node { id title } }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

const { data, fetchMore } = useQuery(FEED_QUERY, { first: 10 });

function loadMore() {
  fetchMore({ after: data.value.feed.pageInfo.endCursor });
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

## RateLimitGate

`RateLimitGate` wraps your template and shows a countdown banner when `isLimited` is `true`. Fires `onRetry` when the countdown completes.

## Directives

Registered automatically via `createQuenetiqPlugin`:

- `v-dql-mutate` — on click, executes a mutation. Accepts a string (mutation) or `{ mutation, variables }` object.
- `v-dql-loading` — toggles `.dql-loading` CSS class on the element based on a boolean expression.

```html
<!-- v-dql-mutate: click to mutate -->
<button v-dql-mutate="{ mutation: 'mutation { like }', variables: { id: 1 } }">Like</button>

<!-- v-dql-loading: CSS class toggle -->
<div v-dql-loading="isLoading">Content</div>
```

## Reactive Val

`useVal` creates a reactive value container with null-handling utilities (`nullify`, `isNull`, `orElse`, `match`, etc.). Returns a Vue `Ref` augmented with these methods.

```ts
import { useVal } from '@quenetiq/vue';

const count = useVal(0);
count.value; // reactive
count.set(5); // triggers reactivity

// Null-handling
const name = useVal<string | null>(null);
name.orElse('Guest'); // 'Guest'
name.match(
  (v) => `Hello, ${v}`,
  () => 'Hello, Guest',
);
```

## Suspense & SSR

`useSuspenseQuery` integrates with Vue's `<Suspense>` for async data loading. The returned `promise` can be passed to `onServerPrefetch` for server-side rendering.

```vue
<script setup>
const { data, promise } = useSuspenseQuery(
  gql`query { todos { id title } }`,
);

// Vue will await this during SSR
onServerPrefetch(() => promise);
</script>

<template>
  <Suspense>
    <ul>
      <li v-for="todo in data?.todos" :key="todo.id">{{ todo.title }}</li>
    </ul>
  </Suspense>
</template>
```

## Testing

Use `@quenetiq/testing` with `@vue/test-utils`. Create a `MockGraphqlService` and register it via `createQuenetiqPlugin`.

```ts
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createQuenetiqPlugin } from '@quenetiq/vue';
import { MockGraphqlService } from '@quenetiq/testing';

const mockService = new MockGraphqlService();

function mountWithPlugin(component: any) {
  return mount(component, {
    global: { plugins: [createQuenetiqPlugin(mockService as any)] },
  });
}
```

## Debugging

`@quenetiq/debugging` provides `GraphqlDebugService` to log and inspect every operation. Enable it during development to trace queries, mutations, and cache activity.

```ts
import { GraphqlDebugService } from '@quenetiq/debugging';

const debugService = new GraphqlDebugService();
debugService.enable();

// Logged operations available via
const entries = debugService.getAll();
```

## OpenTelemetry

`@quenetiq/opentelemetry` adds distributed tracing. Create a `MinimalTracer` and set it as the global tracer. Exported spans include query/mutation execution time and cache hits.

```ts
import { consoleExporter } from '@quenetiq/opentelemetry';
import { setTracer, MinimalTracer } from '@quenetiq/opentelemetry';

const tracer = new MinimalTracer({
  serviceName: 'my-vue-app',
  exporter: consoleExporter(),
});
setTracer(tracer);
```

## API Reference

### Plugin

| Name | Description | Type |
|------|-------------|------|
| `createQuenetiqPlugin(client)` | Vue plugin factory. Registers client globally. Usage: app.use(createQuenetiqPlugin(client)). | function |
| `useClient()` | Returns QuenetiqClient instance from composition API after plugin registration. Throws if plugin not installed. | composable |

### useQuery

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `useQuery(document, options?)` | Reactive query composable. All result fields are Vue refs. Supports pollInterval, skip, onCompleted, onError. | composable | |
| `UseQueryOptions` | `{ variables?, pollInterval?, skip?, onCompleted?, onError? }` | interface | |
| `UseQueryOptions.variables` | Query variables. | property | |
| `UseQueryOptions.pollInterval` | Auto-poll interval in ms. | property | |
| `UseQueryOptions.skip` | Skip the query on mount. | property | `false` |
| `UseQueryOptions.onCompleted` | Callback with data on success. | property | |
| `UseQueryOptions.onError` | Callback with error string and optional errorCode. | property | |
| `UseQueryResult` | Result (all fields are Ref\<T\>): `{ data, loading, error, errorCode, networkStatus, called, refetch, fetchMore }` | interface | |
| `UseQueryResult.data` | Ref\<TData \| null\> — response data. | property | |
| `UseQueryResult.loading` | Ref\<boolean\> — true while in-flight. | property | |
| `UseQueryResult.error` | Ref\<string \| null\> — error message. | property | |
| `UseQueryResult.errorCode` | Ref\<ErrorCode \| undefined\>. | property | |
| `UseQueryResult.networkStatus` | Ref\<NetworkStatus\> — loading \| ready \| error \| refetching \| poll. | property | |
| `UseQueryResult.called` | Ref\<boolean\> — true once the query has fired. | property | |
| `UseQueryResult.refetch` | (vars?) => Promise\<GraphQLResult\> — re-execute the query. | property | |
| `UseQueryResult.fetchMore` | (merge, vars?) => Promise\<GraphQLResult\> — pagination helper. | property | |
| `NetworkStatus` | Union type: loading \| ready \| error \| refetching \| poll. | type | |

### useMutation

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `useMutation(document, options?)` | Returns `{ mutate, data, loading, error, errorCode, called }` with all reactive refs. Supports optimistic updates via update option. | composable | |
| `UseMutationOptions` | `{ variables?, onCompleted?, onError?, update?, optimistic? }` | interface | |
| `UseMutationOptions.variables` | Default mutation variables. | property | |
| `UseMutationOptions.onCompleted` | Callback with data on success. | property | |
| `UseMutationOptions.onError` | Callback with error string and optional errorCode. | property | |
| `UseMutationOptions.update` | Cache write after mutation: update(cache, result). | property | |
| `UseMutationOptions.optimistic` | Optimistic update callback: (cache) => string. Auto-committed on success, rolled back on error. | property | |
| `UseMutationResult` | Result (all refs): `{ data, loading, error, errorCode, called, mutate }` | interface | |
| `UseMutationResult.data` | Ref\<TData \| null\>. | property | |
| `UseMutationResult.loading` | Ref\<boolean\> — true while in-flight. | property | |
| `UseMutationResult.error` | Ref\<string \| null\>. | property | |
| `UseMutationResult.errorCode` | Ref\<ErrorCode \| undefined\>. | property | |
| `UseMutationResult.called` | Ref\<boolean\> — true once mutate has been called. | property | |
| `UseMutationResult.mutate` | (vars?) => Promise\<GraphQLResult\> — execute the mutation. | property | |
| `UseMutationFn` | Mutate function signature: (variables?) => Promise\<GraphQLResult\<TData\>\>. | type | |

### useSubscription

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `useSubscription(document, options?)` | Connects to a WebSocket subscription. All result fields are reactive refs. | composable | |
| `UseSubscriptionOptions` | `{ variables?, wsEndpoint?, shouldSubscribe?, reconnect?, reconnectInterval?, maxReconnects?, onNext?, onError?, onComplete? }` | interface | |
| `UseSubscriptionOptions.variables` | Subscription variables. | property | |
| `UseSubscriptionOptions.wsEndpoint` | WebSocket URL. Defaults to HTTP→WS transform of client endpoint. | property | |
| `UseSubscriptionOptions.shouldSubscribe` | Conditionally enable/disable. | property | `true` |
| `UseSubscriptionOptions.reconnect` | Enable auto-reconnect with exponential backoff. | property | `false` |
| `UseSubscriptionOptions.reconnectInterval` | Base reconnect interval in ms. | property | `2000` |
| `UseSubscriptionOptions.maxReconnects` | Max reconnect attempts before giving up. | property | `5` |
| `UseSubscriptionOptions.onNext` | Callback with each new data payload. | property | |
| `UseSubscriptionOptions.onError` | Callback with error string and optional errorCode. | property | |
| `UseSubscriptionOptions.onComplete` | Callback when the subscription completes. | property | |
| `UseSubscriptionResult` | Result (all refs): `{ data, loading, error, errorCode }` | interface | |
| `UseSubscriptionResult.data` | Ref\<TData \| null\>. | property | |
| `UseSubscriptionResult.loading` | Ref\<boolean\>. | property | |
| `UseSubscriptionResult.error` | Ref\<string \| null\>. | property | |
| `UseSubscriptionResult.errorCode` | Ref\<ErrorCode \| undefined\>. | property | |

### useLiveQuery

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `useLiveQuery(document, options?)` | Combines a one-shot query with a subscription for real-time updates. All result fields are reactive refs. | composable | |
| `UseLiveQueryOptions` | `{ variables?, wsEndpoint?, shouldSubscribe?, onCompleted?, onError? }` | interface | |
| `UseLiveQueryOptions.variables` | Query / subscription variables. | property | |
| `UseLiveQueryOptions.wsEndpoint` | WebSocket URL. Defaults to HTTP→WS transform. | property | |
| `UseLiveQueryOptions.shouldSubscribe` | Conditionally enable/disable the WS subscription. | property | `true` |
| `UseLiveQueryOptions.onCompleted` | Callback on query success or WS update. | property | |
| `UseLiveQueryOptions.onError` | Callback with error string and optional errorCode. | property | |
| `UseLiveQueryResult` | Result (all refs): `{ data, loading, error, errorCode }` | interface | |
| `UseLiveQueryResult.data` | Ref\<TData \| null\>. | property | |
| `UseLiveQueryResult.loading` | Ref\<boolean\>. | property | |
| `UseLiveQueryResult.error` | Ref\<string \| null\>. | property | |
| `UseLiveQueryResult.errorCode` | Ref\<ErrorCode \| undefined\>. | property | |

### useFragment

| Name | Description | Type |
|------|-------------|------|
| `useFragment(fragment, identifier)` | Reads a normalized cache entity by \_\_typename + id. Returns `{ data, complete }`. | composable |
| `UseFragmentResult` | `{ data, complete }` | interface |
| `UseFragmentResult.data` | Ref\<TData \| null\> — entity data from cache. | property |
| `UseFragmentResult.complete` | boolean — true when the entity was found in cache. | property |

### usePrefetch

| Name | Description | Type |
|------|-------------|------|
| `usePrefetch(document)` | Returns a (variables?) => Promise\<GraphQLResult\> prefetch function. Fires query ahead of navigation. | composable |

### QueryRef / useBackgroundQuery / useReadQuery

| Name | Description | Type |
|------|-------------|------|
| `useBackgroundQuery(document, variables?)` | Returns QueryRef\<TData\> — kicks off a query and exposes reactive data/error/loading refs plus refetch. | composable |
| `useReadQuery(queryRef)` | Unwraps a QueryRef: returns `{ data }` where data is the reactive Ref. | composable |
| `QueryRef` | Interface: `{ data: Ref, error: Ref, loading: Ref, refetch: () => Promise<GraphQLResult> }` | interface |
| `QueryRef.data` | Ref\<TData \| null\> — resolved query data. | property |
| `QueryRef.error` | Ref\<string \| null\> — error message. | property |
| `QueryRef.loading` | Ref\<boolean\> — true while query is in-flight. | property |
| `QueryRef.refetch` | (vars?) => Promise\<GraphQLResult\> — re-execute the query. | property |

### RateLimitGate

| Name | Description | Type |
|------|-------------|------|
| `RateLimitGate` | Wrapper that shows countdown fallback when rate-limited. Slots: default, fallback. | component |
| `RateLimitGateProps` | `{ isLimited, retryAfter?, onRetry?, error? }` | interface |
| `RateLimitGateProps.isLimited` | Whether rate limit is currently exceeded. | property |
| `RateLimitGateProps.retryAfter` | Countdown duration in ms (default: 5000). | property |
| `RateLimitGateProps.onRetry` | Callback fired when countdown completes. | property |
| `RateLimitGateProps.error` | Optional error message to display in the default banner. | property |

### Directives

| Name | Description | Type |
|------|-------------|------|
| `registerDirectives(app, client)` | Registers v-dql-mutate and v-dql-loading directives on an app instance. Called automatically by createQuenetiqPlugin. | function |
| `v-dql-mutate` | Vue directive — triggers a mutation on click. Value: string (mutation) or `{ mutation, variables }`. | directive |
| `v-dql-loading` | Vue directive — toggles .dql-loading CSS class based on boolean binding. | directive |

### Suspense composables

| Name | Description | Type |
|------|-------------|------|
| `useSuspenseQuery(document, variables?)` | Suspense-aware query composable. Returns `{ data, error, loading, promise }` refs. Pass promise to onServerPrefetch for SSR. | composable |
| `UseSuspenseQueryResult` | Result (all refs): `{ data, error, loading, promise }` | interface |
| `UseSuspenseQueryResult.data` | Ref\<TData \| null\>. | property |
| `UseSuspenseQueryResult.error` | Ref\<string \| null\>. | property |
| `UseSuspenseQueryResult.loading` | Ref\<boolean\>. | property |
| `UseSuspenseQueryResult.promise` | Promise\<TData \| undefined\> — await in onServerPrefetch for SSR hydration. | property |
| `useBackgroundQuery(document, variables?)` | Returns QueryRef\<TData\> — reactive query handle with data/error/loading refs and refetch. | composable |

### Re-exports from @quenetiq/client

| Name | Description | Type |
|------|-------------|------|
| `gql` | Tagged template literal for parsing GraphQL documents. | function |
| `isSuccess` | Type guard: checks if GraphQLResult has status === "success". | function |
| `isError` | Type guard: checks if GraphQLResult has status === "error". | function |
| `unwrap` | Extracts data from a GraphQLResult or returns null on error. | function |
| `unwrapOrThrow` | Extracts data from a GraphQLResult or throws on error. | function |

### Val

| Name | Description | Type |
|------|-------------|------|
| `useVal(initialValue)` | Vue composable that returns a VueVal\<T\> — a Vue Ref\<T\> augmented with null-handling methods. Fully reactive. | composable |
| `VueVal<T>` | Extends Ref\<T\> with: nullify, isNull, isEmpty, reset, tap, swap, orElse, match. | interface |
| `VueVal.nullify()` | Sets value to null, returns previous value. | method |
| `VueVal.isNull()` | Returns true if value is null or undefined. | method |
| `VueVal.isEmpty()` | Returns true for null, undefined, empty string, or empty array. | method |
| `VueVal.reset()` | Resets to the initial value. | method |
| `VueVal.tap(fn)` | Transforms value in-place and returns this. | method |
| `VueVal.swap(v)` | Sets value to v and returns the previous value. | method |
| `VueVal.orElse(fallback)` | Returns value or fallback if null/undefined. | method |
| `VueVal.match(onSome, onNone)` | Runs onSome(value) if non-null, onNone() if null. Returns R. | method |

### Plugin Setup

```ts
import { createApp } from 'vue';
import { createQuenetiqPlugin } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });
const app = createApp(App);
app.use(createQuenetiqPlugin(client));
app.mount('#app');
```

## Starters

:::stackblitz starter="vue"
