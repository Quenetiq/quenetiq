---
title: "@quenetiq/client"
slug: client
group: "Core"
order: 1
since: "0.0.1"
tags: [client, graphql]
description: "Framework-agnostic GraphQL client"
---

# @quenetiq/client

The framework-agnostic GraphQL client. Works in React, Vue, Svelte, Node, or any JS environment. Provides
`QuenetiqClient` with query, mutate, refetch, streaming, middleware pipeline, and normalized cache
integration.

## Quick Start

```typescript
import { createClient, gql, isSuccess } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const GET_TODOS = gql`query Todos { todos { id title } }`;

const result = await client.query<{ todos: Todo[] }>(GET_TODOS);
if (isSuccess(result)) {
  console.log(result.data.todos);
}
```

## Middleware

The middleware pipeline lets you intercept and transform every request. Built-in middlewares:
`authMiddleware`, `loggingMiddleware`, `devAuthMiddleware`.

```typescript
import { createClient, authMiddleware, loggingMiddleware } from '@quenetiq/client';

const client = createClient({
  endpoint: '/graphql',
  middleware: [
    authMiddleware('my-token'),
    loggingMiddleware('Todos'),
  ],
});
```

## Cache Integration

Pass a `CacheStore` from `@quenetiq/cache` to enable normalized entity caching:

```typescript
import { createClient } from '@quenetiq/client';
import { createCache } from '@quenetiq/cache';

const cache = createCache();
const client = createClient({
  endpoint: '/graphql',
}, cache);
```

## Streaming

Support for `@defer` and `@stream` directives via multipart/mixed responses:

```typescript
const stream = client.queryStream(gql`query Stream { ... }`);

for await (const part of stream) {
  if (isSuccess(part)) {
    console.log('incremental:', part.data);
  }
}
```

## File Upload

Automatic `File` / `Blob` / `FileList` detection with multipart upload spec:

```typescript
const result = await client.mutate(UPLOAD_FILE, {
  file: fileInput.files[0],
});
```

## API Reference

### `createClient(config, cache?)`

Factory function that creates and returns a configured `QuenetiqClient` instance. Accepts a `ClientConfig` and optional `CacheStore`.

### `QuenetiqClient`

Core client class for all GraphQL operations. Methods return `Promise<GraphQLResult<T>>`.

| Member | Type | Description |
|---|---|---|
| `constructor` | constructor | Creates a client with config and optional cache service. Signature: `config: ClientConfig, cache?: CacheStore` |
| `query(document, variables?, endpoint?)` | method | Executes a GraphQL query. Supports dedup when `config.dedup` is enabled. |
| `mutate(document, variables?, endpoint?)` | method | Executes a GraphQL mutation. Supports file uploads and auto-invalidates cache on success. |
| `refetch(document, variables?, endpoint?)` | method | Bypasses dedup cache and re-fetches a query. |
| `queryStream(document, variables?, endpoint?)` | method | Returns an AsyncIterable for streaming (`@defer`/`@stream`) responses via multipart/mixed. |
| `setEndpoint(url)` | method | Changes the GraphQL endpoint URL at runtime. |
| `endpoint` | property | Current GraphQL endpoint URL. Default: `'/graphql'` |
| `getCacheService()` | method | Returns the `CacheStore` instance or null if not provided. |

### gql & Documents

| Member | Type | Description |
|---|---|---|
| `` gql`...` `` | function | Tagged template literal. Parses a GraphQL string into `DocumentNode` using `graphql.parse()`. |
| `print(document)` | function | Serializes a `DocumentNode` back to a GraphQL string. |
| `DocumentNode` | type | Re-exported from `graphql`. AST representation of a parsed GraphQL document. |
| `TypedDocumentNode<TResult, TVariables>` | type | `DocumentNode` extended with phantom types for result and variables. |

### Result Types

| Member | Type | Description |
|---|---|---|
| `GraphQLResult<T>` | type | Discriminated union: `{ status: "success", data } \| { status: "error", error, errorCode?, graphQLErrors?, networkError? }`. |
| `GraphQLResponse<T>` | type | Raw server response shape with optional data and errors. |
| `GraphQLError` | interface | Single GraphQL error with message, locations, path, and extensions. |
| `NetworkErrorInfo` | interface | Network error details with message, status code, and status text. |
| `ErrorCode` | type | Error code union: `NO_DATA \| GRAPHQL_ERROR \| NETWORK_ERROR \| VALIDATION_ERROR \| UNKNOWN`. |

### Result Helpers

| Member | Type | Description |
|---|---|---|
| `isSuccess(result)` | function | Type guard that narrows `GraphQLResult<T>` to the success variant. |
| `isError(result)` | function | Type guard that narrows `GraphQLResult<T>` to the error variant. |
| `unwrap(result)` | function | Returns data if success, null otherwise. |
| `unwrapOrThrow(result)` | function | Returns data if success, throws `Error` on error status. |
| `mapResult(result, fn)` | function | Transforms data via `fn` on success, propagates error unchanged. |
| `hasPartialErrors(result)` | function | Returns true if result is success with non-empty `graphQLErrors`. |
| `getGraphQLErrors(result)` | function | Returns `graphQLErrors` array (empty if none). |
| `getNetworkError(result)` | function | Returns `networkError` if result is error, `undefined` otherwise. |

### Middleware

| Member | Type | Description |
|---|---|---|
| `GraphqlRequestContext` | interface | Middleware request context: `query`, `variables`, `headers`, `type`, `endpoint`, `extensions`, `method`, `onTypenamesExtracted`. |
| `GraphqlMiddleware` | type | Middleware function: `(request, next) => Promise<GraphQLResult<unknown>>`. |
| `GraphqlMiddlewareNext` | type | Next handler in the async middleware chain. |
| `applyMiddleware(middleware, final)` | function | Composes middleware array into a single async pipeline using `reduceRight`. |
| `authMiddleware(token, headerName?)` | function | Attaches `Authorization: Bearer` header to requests. |
| `loggingMiddleware(label?)` | function | Logs each operation with type, query snippet, and duration. |

### Config Interfaces

| Member | Type | Description |
|---|---|---|
| `QuenetiqClientConfig` | type | Alias for `ClientConfig`. Config interface for `createClient`: `endpoint`, `url`, `headers`, `errorPolicy`, `retryCount`, `middleware`, `retryExchange`, `devAuth`, `onError`, `errorHandler`, `subscriptions`, `cache`, `persistedQueries`. |
| `CacheConfig` | interface | Cache config: `enabled`, `maxAge`, `serialize`, `typePolicies`, `schema`. |
| `SubscriptionsConfig` | interface | WebSocket config: `wsEndpoint`, `reconnect`, `reconnectInterval`, `lazy`. |
| `PersistedQueriesConfig` | interface | Persisted queries: `enabled`, `hash`, `autoPersist`, `useGetForHashedQueries`. |
| `RetryExchangeConfig` | interface | Retry config: `maxRetries`, `initialDelay`, `maxDelay`, `exponent`, `jitter`, `shouldRetry`. |
| `MiddlewareConfig` | interface | Middleware config: `onError` callback. |

### Val

`Val<T>` is a generic value container with built-in null handling methods.

| Member | Type | Description |
|---|---|---|
| `Val<T>` | class | Holds a value of type `T` and provides `nullify()`, `isNull()`, `isEmpty()`, `reset()`, `peek()`, `tap()`, `swap()`, `orElse()`, `match()` and `toJSON()`. |
| `Val.value` | property | Get/set the contained value. |
| `Val.nullify()` | method | Sets the value to null and returns the previous value. |
| `Val.isNull()` | method | Returns true if the value is null or undefined. |
| `Val.isEmpty()` | method | Returns true for null, undefined, empty string, or empty array. |
| `Val.reset()` | method | Resets the value to the initial value passed to the constructor. |
| `Val.peek()` | method | Returns the value without triggering reactive tracking. |
| `Val.tap(fn)` | method | Transforms the value in-place via `fn` and returns this for chaining. |
| `Val.swap(v)` | method | Sets the value to `v` and returns the previous value. |
| `Val.orElse(fallback)` | method | Returns the value if not null, otherwise returns the fallback. |
| `Val.match(onSome, onNone)` | method | Pattern matches on null: calls `onSome(value)` if non-null, `onNone()` if null. Returns `R`. |
| `Val.toJSON()` | method | Returns the contained value for JSON serialization. |

## Starters

### Vanilla JS

```typescript
import { createClient, gql, isSuccess } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

const GET_TODOS = gql`{ todos { id title done } }`;

async function loadTodos() {
  const result = await client.query(GET_TODOS);
  if (isSuccess(result)) {
    console.log(result.data.todos);
  }
}

const ADD_TODO = gql`mutation Add($title: String!) { addTodo(title: $title) { id title } }`;

async function addTodo(title: string) {
  const result = await client.mutate(ADD_TODO, { title });
  if (isSuccess(result)) {
    console.log('Created:', result.data.addTodo);
  }
}

loadTodos();
```

### Angular

```typescript
import { provideQuenetiq, GraphqlService, gql } from '@quenetiq/core';
import { createHttpLink } from '@quenetiq/core/link';

export const appConfig: ApplicationConfig = {
  providers: [
    provideQuenetiq({ link: createHttpLink({ uri: '/graphql' }) }),
  ],
};

@Component({ ... })
export class TodosComponent {
  private graphql = inject(GraphqlService);
  todos$ = this.graphql.query(gql`{ todos { id title done } }`);

  addTodo(title: string) {
    this.graphql.mutate(gql`mutation Add($title: String!) {
      addTodo(title: $title) { id title }
    }`, { title }).subscribe();
  }
}
```

### React

```tsx
import { QuenetiqProvider, useQuery, useMutation, gql } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';

const client = createClient({ endpoint: '/graphql' });

function Todos() {
  const { data, loading } = useQuery(gql`{ todos { id title done } }`);
  const [addTodo] = useMutation(gql`mutation Add($title: String!) {
    addTodo(title: $title) { id title }
  }`);

  if (loading) return <p>Loading...</p>;
  return (
    <div>
      <ul>{data?.todos.map(t => <li key={t.id}>{t.title}</li>)}</ul>
      <button onClick={() => addTodo({ variables: { title: 'New' } })}>Add</button>
    </div>
  );
}

function App() {
  return <QuenetiqProvider client={client}><Todos /></QuenetiqProvider>;
}
```

### Vue

```typescript
import { createQuenetiqPlugin, useQuery, useMutation, gql } from '@quenetiq/vue';
import { createClient } from '@quenetiq/client';
import { createApp } from 'vue';

const client = createClient({ endpoint: '/graphql' });
const app = createApp(App);
app.use(createQuenetiqPlugin(client));
```

```vue
<script setup lang="ts">
const { data, loading } = useQuery(gql`{ todos { id title done } }`);
const { mutate } = useMutation(gql`mutation Add($title: String!) {
  addTodo(title: $title) { id title }
}`);
</script>

<template>
  <p v-if="loading">Loading...</p>
  <ul v-else>
    <li v-for="todo in data?.todos" :key="todo.id">{{ todo.title }}</li>
  </ul>
  <button @click="mutate({ title: 'New' })">Add</button>
</template>
```

## Try it live

:::stackblitz starter="client"
