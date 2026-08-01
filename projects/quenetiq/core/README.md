<p align="center">
  <img src="https://raw.githubusercontent.com/Quenetiq/quenetiq/main/projects/quenetiq/core/assets/logo.svg" alt="Quenetiq" width="160"/>
</p>

<h1 align="center">@quenetiq/core</h1>

<p align="center"><b>Central GraphQL client for Angular — query, mutate, middleware, pipes, directives, and more.</b></p>

---

## Features

- `GraphqlService` — query, mutate, refetch, poll, setEndpoint
- Middleware pipeline — auth, logging, devtools, cache, custom
- Standalone functions — `query()`, `mutate()`, `refetch()`, `poll()` (injection‑free)
- Result helpers — `isSuccess`, `isError`, `unwrap`, `unwrapOrThrow`, `mapResult`
- `gql` tag — `parse()`-based `DocumentNode` creation
- `TypedDocumentNode<TResult, TVars>` — phantom‑typed documents
- Angular pipes — `GqlPipe`, `GraphqlDataPipe`, `GraphqlErrorPipe`, and more
- Reactive variables — `makeVar<T>()`, `ReactiveVar<T>`
- Client directive — `@client` field resolution
- Router integration — `guardedRoute()`, `provideQuenetiqRouter()`
- Auto‑refetch — `mutationCachePolicy()`, `provideAutoRefetch()`
- DevTools — `DevtoolsService`, `devtoolsMiddleware`
- Schema service — `SchemaService`, `provideSchemaFetch()`
- Request batching, deduplication, retry
- Plugin system — `QuenetiqPlugin` with `onInit` + `getMiddleware`
- `ng add` schematics — interactive setup

## Install

```bash
ng add @quenetiq/core
# or
npm install @quenetiq/core
```

## Quick Start

```typescript
import { provideQuenetiq } from '@quenetiq/core';

bootstrapApplication(App, {
  providers: [provideQuenetiq({ endpoint: '/graphql' })],
});
```

```typescript
import { Component, inject } from '@angular/core';
import { GraphqlService, gql, isSuccess, unwrap } from '@quenetiq/core';

@Component({ template: '...' })
class TodosComponent {
  private graphql = inject(GraphqlService);
  todos$ = this.graphql.query<{ todos: Todo[] }>(
    gql`query Todos { todos { id title } }`,
  ).pipe(
    isSuccess(),
    unwrap(),
  );
}
```

## API Overview

| Export | Description |
|--------|-------------|
| `GraphqlService` | Core service — query, mutate, refetch, poll |
| `provideQuenetiq(config)` | Provider for `QuenetiqConfig` |
| `QuenetiqConfig` | Unified config interface |
| `gql\`…\`` | Template tag for `DocumentNode` |
| `query(doc, vars?)` | Standalone query → `QueryHandle<T>` |
| `mutate(doc, vars?, opts?)` | Standalone mutation |
| `refetch(handle)` | Re‑execute a `QueryHandle` |
| `poll(doc, vars?, interval?)` | Polling query |
| `isSuccess()` / `isError()` | RxJS operators for `GraphQLResult` |
| `unwrap()` / `unwrapOrThrow()` | Extract data from result |
| `mapResult(fn)` | Map over success data |
| `hasPartialErrors()` / `getGraphQLErrors()` | Error helpers |
| `GraphqlEndpoint` / `provideEndpoint` | Multi‑endpoint support |
| `makeVar<T>(initial)` | Reactive variable |
| `cacheMiddleware(policies?)` | Query caching + entity merging |
| `mutationCachePolicy()` | Mutation eviction policy |
| `clientDirectiveMiddleware()` | `@client` field handling |
| `streamingMiddleware()` | `@defer` / `@stream` support |
| `provideQuenetiqRouter()` | Router guard integration |
| `guardedRoute(path, guards)` | Guarded route config |
| `QuenetiqQueryDirective` | Structural directive with query context |
| `DevtoolsService` | DevTools extension communication |
| `gqlPipe` / `GraphqlDataPipe` / `GraphqlErrorPipe` | Angular pipes |

## Sub‑packages

| Package | Purpose |
|---------|---------|
| `@quenetiq/cache` | Normalized entity cache |
| `@quenetiq/middlewares` | Auth, retry, offline queue, focus refetch |
| `@quenetiq/subscriptions` | WebSocket subscriptions |
| `@quenetiq/file-upload` | Multipart uploads |
| `@quenetiq/pagination` | Cursor + offset pagination |
| `@quenetiq/persisted-queries` | APQ middleware |
| `@quenetiq/fragments` | Fragment definitions |
| `@quenetiq/ssr` | Server‑side rendering |
| `@quenetiq/debugging` | Debug utilities |
| `@quenetiq/testing` | Mock backend |
| `@quenetiq/downloader` | Schema download (Node.js) |
| `@quenetiq/codegen` | TypeScript codegen |

## Dependencies

`@angular/common`, `@angular/core`, `@quenetiq/cache`, `graphql`, `rxjs`
