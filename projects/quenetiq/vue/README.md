<p align="center">
  <img src="https://raw.githubusercontent.com/Quenetiq/quenetiq/main/projects/quenetiq/vue/assets/logo.svg" alt="Quenetiq Vue" width="160"/>
</p>

<h1 align="center">@quenetiq/vue</h1>

<p align="center"><b>Vue composables for @quenetiq/client — useQuery, useMutation, useSubscription, useLiveQuery.</b></p>

---

## Features

- **`createQuenetiqPlugin(client)`** — Vue plugin to provide QuenetiqClient
- **`useQuery(document, options?)`** — reactive query composable with refetch, fetchMore, pollInterval
- **`useMutation(document, options?)`** — mutation composable with update callback
- **`useSubscription(document, options?)`** — subscription composable with onNext/onError
- **`useLiveQuery(document, options?)`** — real-time query (HTTP fetch + WebSocket subscription)
- **`useClient()`** — access QuenetiqClient from anywhere
- **Reactive refs** — `data`, `loading`, `error`, `errorCode` are Vue refs
- **SSR support** — works with Vue's `onServerPrefetch`

## Install

```bash
npm install @quenetiq/vue @quenetiq/client
```

## Quick Start

```vue
<script setup>
import { createQuenetiqPlugin, useQuery, gql } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });
const plugin = createQuenetiqPlugin(client);

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

## Composable API

### useQuery

```ts
const { data, loading, error, errorCode, networkStatus, called, refetch, fetchMore } = useQuery(
  document,
  {
    variables,
    pollInterval,       // auto-polling in ms
    skip,               // skip initial fetch
    onCompleted,        // (data) => void
    onError,            // (error, errorCode?) => void
  },
);
```

All result fields are Vue `Ref`s except `refetch` and `fetchMore`.

| Field | Type | Description |
|-------|------|-------------|
| `data` | `Ref<TData \| null>` | Response data |
| `loading` | `Ref<boolean>` | True during initial fetch or refetch |
| `error` | `Ref<string \| null>` | Error message |
| `errorCode` | `Ref<ErrorCode \| undefined>` | Typed error code |
| `networkStatus` | `Ref<NetworkStatus>` | `'loading' \| 'ready' \| 'error' \| 'refetching' \| 'poll'` |
| `called` | `Ref<boolean>` | True after first execution |
| `refetch` | `(vars?) => Promise<GraphQLResult<T>>` | Re-fetch with optional new variables |
| `fetchMore` | `(merge, vars?) => Promise<GraphQLResult<T>>` | Fetch more data and merge |

### useMutation

```ts
const { data, loading, error, errorCode, called, mutate } = useMutation(
  document,
  {
    variables,
    onCompleted,   // (data) => void
    onError,       // (error, errorCode?) => void
    update,        // (cache, result) => void — update cache after success
  },
);

mutate(variables);
```

### useSubscription

```ts
const { data, loading, error, errorCode } = useSubscription(
  document,
  {
    variables,
    wsEndpoint,       // default: derived from client endpoint
    shouldSubscribe,  // default: true
    onNext,           // (data) => void
    onError,          // (error, errorCode?) => void
    onComplete,       // () => void
  },
);
```

### useLiveQuery

Real-time query that executes an initial HTTP fetch then subscribes to WebSocket updates.

```ts
const { data, loading, error, errorCode } = useLiveQuery(
  document,
  {
    variables,
    wsEndpoint,       // default: derived from client endpoint
    shouldSubscribe,  // default: true
    onCompleted,      // (data) => void
    onError,          // (error, errorCode?) => void
  },
);
```

## API Overview

| Export | Description |
|--------|-------------|
| `createQuenetiqPlugin(client)` | Vue plugin — installs the client globally |
| `useClient()` | Access `QuenetiqClient` from composition API |
| `useQuery(doc, opts?)` | Reactive query with refetch, fetchMore, pollInterval |
| `useMutation(doc, opts?)` | Mutation with update callback |
| `useSubscription(doc, opts?)` | Subscription with onNext/onError |
| `useLiveQuery(doc, opts?)` | Real-time query (fetch + WS) |

## Dependencies

`vue` (^3), `@quenetiq/client`, `graphql`
