---
title: "@quenetiq/core"
slug: core
group: "Core"
order: 2
since: "0.0.1"
tags: [angular, core]
description: "Angular-native GraphQL integration"
---

# @quenetiq/core

The core package is the only required dependency. It provides the
`GraphqlService`, middleware pipeline, the `gql` tagged template literal, standalone
utility functions, pipes, reactive variables, a client directive, router integration, auto-refetch, and
configuration.

**Size:** ~3.2 kB min+gzip
**Dependencies:** `graphql`, `@angular/core`

## Installation

```bash
npm install @quenetiq/core
```

> `@quenetiq/core` is automatically included when you install any `@quenetiq/*` package — it's listed as a peer dependency.

## GraphqlService

The central injectable service. Inject it into your components, directives, and services to execute queries,
mutations, and watch queries reactively.

### Query

Returns a `Signal<T>` that updates automatically when variables change.

```typescript
const posts = this.graphql.query(
  gql`query Posts { posts { id title } }`,
); // → Signal<Post[]>

const mutation = this.graphql.mutate(
  gql`mutation CreatePost($input: PostInput!) {
    createPost(input: $input) { id title }
  }`,
); // → MutationRef<Post>
```

### Mutation

Returns a `MutationRef<T>` with `.mutate()`, `.loading`, and
`.error` signals. Mutations are not automatically tracked — call `mutate()` explicitly.

```typescript
const createPost = this.graphql.mutate(
  gql`mutation CreatePost($input: PostInput!) {
    createPost(input: $input) { id title }
  }`,
);

// trigger when ready
createPost.mutate({ input: { title: 'Hello' } });
```

### Refetch

Use `refetch()` to re-execute a query by its document node. This creates a new network request
regardless of cache state:

```typescript
service.refetch(GET_CURRENT_USER).subscribe((r) => {
  console.log('Refetched:', r);
});
```

## Middleware Pipeline

The middleware pipeline sits between your app and the HTTP link. Each middleware can inspect, modify, or
short-circuit requests and responses. Middleware runs in the order they are provided.

```typescript
import { authRefreshMiddleware } from '@quenetiq/middlewares';

const link = composeMiddlewares(
  authRefreshMiddleware({ refreshToken: () => inject(AuthService).token() }),
  createHttpLink({ uri: '/graphql' }),
);
```

### Built-in Middleware

| Middleware | Package | Description |
|---|---|---|
| `loggingMiddleware` | `@quenetiq/core` | Logs operations and timing to console |
| `authRefresh` | `@quenetiq/middlewares` | Refreshes auth tokens on 401 |
| `retryExchange` | `@quenetiq/middlewares` | Retries failed operations with backoff |
| `focusRefetch` | `@quenetiq/middlewares` | Refetches when window regains focus |
| `offlineQueue` | `@quenetiq/middlewares` | Queues operations when offline |

## Standalone Functions

Quenetiq exposes several standalone functions for use outside Angular's DI context:

```typescript
import { executeQuery, buildRequest, parseResult } from '@quenetiq/core';

const request = buildRequest(gql`query { ping }`);
const result = await executeQuery({ uri: '/graphql' }, request);
```

For use **inside** an injection context (components, services, directives), Quenetiq provides
injectable standalone helpers `query()` and `mutate()` that work without injecting
`GraphqlService` explicitly:

```typescript
import { query, mutate } from '@quenetiq/core';

// Must be called from an injection context (component, directive, service, or TestBed.runInInjectionContext)
const result = query(gql`query Books { books { id title } }`);
// → Observable<GraphQLResult<{ books: Book[] }>>

const mutationResult = mutate(gql`mutation LikePost($id: ID!) { likePost(id: $id) { likes } }`);
// → Observable<GraphQLResult<{ likePost: Post }>>
```

## gql Tag

The `gql` tagged template literal transforms GraphQL strings into executable documents with syntax
validation at parse time:

```typescript
const BOOKS_QUERY = gql`query Books {
  books { id title author { name } }
}`;
```

## Reactive Variables

Use `createReactiveVar()` to create client-side reactive state that, when updated, triggers all
consuming queries to refetch automatically.

```typescript
const isAuthenticated = createReactiveVar(false);

// Update triggers all consuming queries to refetch
isAuthenticated.set(true);
```

## Client Directive

The `*dqlClient` structural directive lets you execute client-side resolvers inline in your templates
— no service injection needed for simple cases.

```html
<div *dqlClient="let data = query(gql`query { isLoggedIn @client }`)">
  {{ data?.isLoggedIn ? 'Logged in' : 'Guest' }}
</div>
```

## Configuration

Configure Quenetiq globally via `provideQuenetiqCore()` in your `app.config.ts`:

```typescript
export interface QuenetiqCoreConfig {
  link: Link;
  routerRefetch?: boolean;
  defaultContext?: Record<string, unknown>;
  retryOnError?: boolean;
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `link` | `Link` | — | The HTTP or WebSocket link |
| `routerRefetch` | `boolean` | `false` | Auto-refetch queries on route change |
| `defaultContext` | `Record<string, unknown>` | `{}` | Default request context |
| `retryOnError` | `boolean` | `false` | Auto-retry on network errors |

### provideGraphql

For simpler setups, `provideGraphql()` accepts an `endpoint` string instead of a full
`Link` object. Quenetiq creates the HTTP link internally:

```typescript
import { provideGraphql } from '@quenetiq/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideGraphql({ endpoint: '/graphql' }),
  ],
};
```

### Plugins

Plugins extend the GraphQL pipeline with `onInit` and `getMiddleware` hooks. Pass them to
`provideGraphql`:

```typescript
import { provideGraphql } from '@quenetiq/core';

const loggingPlugin = {
  name: 'LoggingPlugin',
  onInit() { console.log('GraphQL initialized'); },
  getMiddleware() {
    return (request, next) => {
      console.log('Request:', request);
      return next(request);
    };
  },
};

provideGraphql({
  endpoint: '/graphql',
  plugins: [loggingPlugin],
});
```

## App Queries

Define your queries in dedicated files using the `gql` tag and import them wherever needed. This
keeps operations organized and reusable:

```typescript
import { gql } from '@quenetiq/core';

export const GET_CURRENT_USER = gql`query GetCurrentUser {
  getCurrentUser { id username createdAt }
}`;

export const GET_NOTES = gql`query GetNotes($filter: NoteType) {
  getNotes(filter: $filter) { id title content noteType }
}`;
```

Use them with `GraphqlService` or the standalone `query()` helper:

```typescript
import { GET_CURRENT_USER, GET_NOTES } from './queries';

const user = this.graphql.query(GET_CURRENT_USER);
const notes = this.graphql.query(GET_NOTES, { filter: 'PASSWORD' });
```

## API Reference

### Core Service

| Member | Type | Description |
|---|---|---|
| `GraphqlService` | class | Main injectable service for GraphQL operations. All methods return `Observable<GraphQLResult<T>>`. |
| `GraphqlService.constructor` | constructor | Injects `QUENETIQ_CONFIG`, builds middleware pipeline. Throws if `provideQuenetiq()` not configured. |
| `GraphqlService.query(document, variables?, endpoint?)` | method | Executes a GraphQL query. Dedup support when `config.dedup` is true. |
| `GraphqlService.mutate(document, variables?, endpoint?, optimistic?)` | method | Executes a GraphQL mutation. Supports file uploads and optimistic cache updates. |
| `GraphqlService.refetch(document, variables?, endpoint?)` | method | Bypasses dedup cache and re-fetches a query. |
| `GraphqlService.poll(document, intervalMs, variables?, endpoint?)` | method | Polls a query at the given interval using `timer/switchMap`. |
| `GraphqlService.queryStream(document, variables?, endpoint?)` | method | Executes a query with streaming support (`@defer`/`@stream`) using Fetch API `multipart/mixed`. |
| `GraphqlService.setEndpoint(url)` | method | Changes the GraphQL endpoint URL at runtime. |
| `GraphqlService.endpoint` | property | Current GraphQL endpoint URL. Default: `'/graphql'` |

### Standalone Queries

| Member | Type | Description |
|---|---|---|
| `query(document, variables?)` | function | Standalone query function. Must be called from an injection context. Returns a `QueryHandle` with `result$`, `enabled` signal, and `refetch()`. |
| `QueryHandle` | interface | Returned by `query()`. Provides `result$` Observable, `enabled` WritableSignal, and `refetch()` trigger. |
| `QueryHandle.result$` | property | Observable stream of `GraphQLResult<T>`. |
| `QueryHandle.enabled` | property | `WritableSignal<boolean>` — set false to cancel in-flight requests. Default: `true` |
| `QueryHandle.refetch` | property | Force re-execution of the query. |
| `mutate(document, variables?, options?)` | function | Standalone mutate function. Requires injection context. Options include optimistic cache updates. |
| `MutateOptions` | interface | Options for standalone mutate: optional optimistic callback returning a unique ID. |
| `refetch(document, variables?)` | function | Standalone refetch function. Bypasses dedup and re-fetches via `GraphqlService.refetch()`. |
| `poll(document, intervalMs, variables?)` | function | Standalone poll function. Polls a query at the given interval using `timer/switchMap`. |

### GraphqlEndpoint

| Member | Type | Description |
|---|---|---|
| `GraphqlEndpoint` | class | Scoped endpoint wrapper. Routes all calls to a specific GraphQL endpoint URL. |
| `GraphqlEndpoint.constructor` | constructor | Creates an endpoint bound to a specific URL. Signature: `graphql: GraphqlService, endpoint: string` |
| `GraphqlEndpoint.query(document, variables?)` | method | Query against this endpoint. |
| `GraphqlEndpoint.mutate(document, variables?, options?)` | method | Mutate against this endpoint with optional optimistic update. |
| `GraphqlEndpoint.refetch(document, variables?)` | method | Refetch against this endpoint. |
| `GraphqlEndpoint.poll(document, intervalMs, variables?)` | method | Poll against this endpoint. |
| `MutateEndpointOptions` | interface | Options for `GraphqlEndpoint.mutate`: optional optimistic callback. |
| `provideEndpoint(name, url)` | function | Creates Angular providers for a named endpoint. Returns `GraphqlEndpoint` via `injectEndpoint()`. |
| `injectEndpoint(name)` | function | Injects a previously provided named `GraphqlEndpoint`. |

### gql & Document Types

| Member | Type | Description |
|---|---|---|
| `` gql`...` `` | function | Tagged template literal. Parses a GraphQL string into a `DocumentNode` at runtime using `graphql.parse()`. Supports interpolation for dynamic fragments. |
| `print(document)` | function | Re-exported from the `graphql` package. Serializes a `DocumentNode` back to a string. |
| `createTypedQuery(query)` | function | Creates a `TypedQueryString` without runtime parsing. Zero-cost abstraction for codegen output. |
| `DocumentNode` | type | Re-exported from `graphql`. AST representation of a parsed GraphQL document. |
| `TypedDocumentNode<TResult, TVariables>` | type | `DocumentNode` extended with phantom types for result and variables. |
| `TypedQueryString<TResult, TVariables>` | type | Pre-serialized query string with phantom types. Skips runtime `parse()` — ideal for production bundles. |
| `FragmentRef<TData, TName>` | type | Fragment reference type for Relay-style fragment masking. Only the owning component can unmask it. |

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
| `unwrapOrThrow(result)` | function | Returns data if success, throws `Error` otherwise. |
| `mapResult(result, fn)` | function | Transforms data via `fn` on success, propagates error unchanged. |
| `hasPartialErrors(result)` | function | Returns true if result is success with non-empty `graphQLErrors`. |
| `getGraphQLErrors(result)` | function | Returns `graphQLErrors` array (empty if none). |
| `getNetworkError(result)` | function | Returns `networkError` if result is error, `undefined` otherwise. |

### Middleware

| Member | Type | Description |
|---|---|---|
| `GraphqlRequestContext` | interface | Middleware request context with `query`, `variables`, `headers`, `type`, `endpoint`, `extensions`, `method`, and `onTypenamesExtracted`. |
| `GraphqlMiddleware` | type | Middleware function signature: `(request: GraphqlRequestContext, next: GraphqlMiddlewareNext) => Observable<GraphQLResult<unknown>>`. |
| `GraphqlMiddlewareNext` | type | Next handler in the middleware chain. |
| `applyMiddleware(middleware, final)` | function | Composes an array of middleware into a single pipeline using `reduceRight`. |
| `authMiddleware(token, headerName?)` | function | Attaches `Authorization: Bearer` header. Auto-prepends `Bearer` if missing. |
| `devAuthMiddleware(token?)` | function | Development auth middleware. Falls back to `localStorage` `dev_token` or `"dev-token"`. |
| `loggingMiddleware(label?)` | function | Logs each operation with type, query snippet, and duration in ms. |
| `hasFiles(value)` | function | Checks if a value recursively contains `File` or `Blob` instances for upload detection. |

### Configuration Interfaces

| Member | Type | Description |
|---|---|---|
| `QuenetiqConfig` | interface | Unified configuration extending `GraphqlCoreConfig` with all sub-configs (cache, subscriptions, upload, etc.) and `QuenetiqPlugin[]` support. |
| `GraphqlCoreConfig` | interface | Core config: `endpoint`, `url`, `headers`, `errorPolicy`, `showErrorsOnSuccess`, `retryCount`, `retryDelay`, `dedup`, `batchWindow`, `middleware`, `retryExchange`, `devAuth`, `onError`, `errorHandler`. |
| `GraphqlConfig` | interface | Deprecated alias for `QuenetiqConfig`. |
| `QuenetiqPlugin` | interface | Plugin interface with `name`, optional `onInit(client)`, and optional `getMiddleware()`. |
| `OnErrorServiceConfig` | interface | Service-based error notification: provide token and `use(service, error)` callback. |
| `RetryExchangeConfig` | interface | Retry config: `maxRetries`, `initialDelay`, `maxDelay`, `exponent`, `jitter`, `shouldRetry`. |
| `SubscriptionsConfig` | interface | WebSocket subscriptions config: `wsEndpoint`, `reconnect`, `reconnectInterval`, `lazy`. |
| `CacheConfig` | interface | Normalized cache config: `enabled`, `maxAge`, `serialize`, `typePolicies`, `schema`. |
| `PersistedQueriesConfig` | interface | Persisted queries config: `enabled`, `hash` (`sha256`|`simple`), `autoPersist`, `useGetForHashedQueries`. |
| `UploadConfig` | interface | File upload config: `maxFiles`, `maxFileSize`. |
| `DebugConfig` | interface | Debug logging config: `logOperations`, `logTiming`, `logCache`. |
| `PaginationConfig` | interface | Pagination config: `defaultLimit`, `debounceMs`. |
| `SsrConfig` | interface | SSR config: `transferState`, `cacheTtl`. |
| `TestingConfig` | interface | Testing config: `enabled`. |
| `TelemetryConfig` | interface | Telemetry/OpenTelemetry config: `enabled`, `tracing`, `tags`. |
| `CodegenConfig` | interface | Codegen CLI config (runtime ignored): schema and types settings. |
| `SchemaConfig` | interface | Schema config: inline data, `url`, custom headers. |

### Providers & Tokens

| Member | Type | Description |
|---|---|---|
| `provideGraphql(config)` | function | Primary provider function. Accepts `Partial<QuenetiqConfig>`, sets defaults (`endpoint: "/graphql"`, `devAuth` enabled). |
| `provideQuenetiq(config)` | function | Alias for `provideGraphql()`. |
| `QUENETIQ_CONFIG` | type | `InjectionToken<QuenetiqConfig>` for the unified config. |
| `GRAPHQL_CONFIG` | type | Deprecated alias for `QUENETIQ_CONFIG`. |

### Config Service

| Member | Type | Description |
|---|---|---|
| `QuenetiqConfigService` | class | Injectable service that exposes typed sub-configs (core, cache, subscriptions, etc.) with defaults. |
| `QuenetiqConfigService.all` | property | Returns the full `QuenetiqConfig` object. |
| `QuenetiqConfigService.core` | property | Returns `GraphqlCoreConfig` with default fallbacks. |
| `QuenetiqConfigService.cache` | property | Returns `CacheConfig` (empty object default). |
| `QuenetiqConfigService.subscriptions` | property | Returns `SubscriptionsConfig` (empty object default). |
| `QuenetiqConfigService.persistedQueries` | property | Returns `PersistedQueriesConfig` (empty object default). |
| `QuenetiqConfigService.upload` | property | Returns `UploadConfig` (empty object default). |
| `QuenetiqConfigService.debug` | property | Returns `DebugConfig`. Handles boolean shortcut. |
| `QuenetiqConfigService.pagination` | property | Returns `PaginationConfig` (empty object default). |
| `QuenetiqConfigService.ssr` | property | Returns `SsrConfig` (empty object default). |
| `QuenetiqConfigService.devtools` | property | Returns `DevtoolsConfig`. Handles boolean shortcut. |
| `QuenetiqConfigService.isDevtoolsEnabled` | property | True if devtools config is enabled. |
| `QuenetiqConfigService.isDebugEnabled` | property | True if debug config is enabled. |

### Cache Integration

| Member | Type | Description |
|---|---|---|
| `GraphqlCacheLike` | interface | Interface for the cache service used internally. Methods: `merge`, `readLocal`, `writeLocalWithTypes`, `clearLocalStateByTypes`, `setTypePolicies`, `applyOptimistic`, `commitOptimistic`, `rollbackOptimistic`. |
| `GRAPHQL_CACHE` | type | `InjectionToken<GraphqlCacheLike>` for the cache service. Provided by `@quenetiq/cache/angular`. |
| `cacheMiddleware(injector?)` | function | Middleware that reads/writes normalized cache. Supports stale-while-revalidate via `maxAge`. |
| `mutationCachePolicy(injector?)` | function | Middleware that clears cached queries by typename after mutation success. |
| `provideAutoRefetch()` | function | Provider that registers `AutoRefetchService` as an `ENVIRONMENT_INITIALIZER`. |
| `AutoRefetchService` | class | Injectable service for auto-refetch support (`clearRegistry` kept for API compat). |

### Reactive Variables

| Member | Type | Description |
|---|---|---|
| `ReactiveVar<T>` | class | Reactive variable backed by `BehaviorSubject`. Triggers consuming queries to refetch on update. |
| `ReactiveVar.constructor` | constructor | Creates a `ReactiveVar` with the initial value. Signature: `initialValue: T` |
| `ReactiveVar.get()` | method | Returns the current value synchronously. |
| `ReactiveVar.set(value)` | method | Updates the value and notifies watchers. |
| `ReactiveVar.update(fn)` | method | Updates via callback (like React setState): `fn(prev) => next`. |
| `ReactiveVar.watch()` | method | Returns an `Observable<T>` that emits current and future values. |
| `makeVar(initialValue)` | function | Factory function that creates and returns a new `ReactiveVar` instance. |

### Pipes

| Member | Type | Description |
|---|---|---|
| `GqlPipe` | pipe | Pure pipe `gql` — parses a GraphQL string into `DocumentNode` using `graphql.parse()`. |
| `GraphqlDataPipe` | pipe | Pure pipe `graphqlData` — extracts data from a successful `GraphQLResult`, returns null otherwise. |
| `GraphqlErrorPipe` | pipe | Pure pipe `graphqlError` — extracts error string from an error `GraphQLResult`, returns null otherwise. |
| `GraphqlStatusPipe` | pipe | Pure pipe `graphqlStatus` — returns `"success"`, `"error"`, or null from a `GraphQLResult`. |
| `GraphqlIsSuccessPipe` | pipe | Pure pipe `graphqlIsSuccess` — returns true if result status is `"success"`. |
| `GraphqlIsErrorPipe` | pipe | Pure pipe `graphqlIsError` — returns true if result status is `"error"`. |
| `GraphqlUnwrapPipe` | pipe | Pure pipe `graphqlUnwrap` — extracts data from success, returns null otherwise. |

### Directives

| Member | Type | Description |
|---|---|---|
| `QuenetiqQueryDirective` | directive | Structural directive `[quenetiqQuery]` — executes a query and provides template context with result, loading, error, and refetch. |
| `QuenetiqQueryContext<T>` | interface | Template context for `QuenetiqQueryDirective`: `$implicit`, `result`, `loading`, `error`, `refetch`. |
| `QuenetiqAutoFetchDirective` | directive | Attribute directive `[quenetiqAutoFetch]` — auto-polls a query at the configured interval (default 30s). |

### Client Directive Middleware

| Member | Type | Description |
|---|---|---|
| `clientDirectiveMiddleware()` | function | Middleware that intercepts `@client` fields. Resolves local-only queries without network and patches mixed results. |

### Resource

| Member | Type | Description |
|---|---|---|
| `graphqlResource(options)` | function | Angular `resource()` wrapper. Returns a `ResourceRef` that fetches via `GraphqlService.query()` with abort support. |
| `GraphqlResourceOptions<TData, TVariables>` | interface | Options for `graphqlResource`: `client`, `query`, `params`, `id`, `defaultValue`. |

### Streaming

| Member | Type | Description |
|---|---|---|
| `streamingMiddleware()` | function | Middleware that handles `@defer`/`@stream` incremental delivery. Emits updated results for each incremental patch. |
| `IncrementalPayload` | interface | Streaming patch payload with `data`, `path`, `errors`, `items`, `label`, `extensions`. |
| `IncrementalResponse<T>` | interface | Streaming response shape with optional `data`, `errors`, `incremental[]`, and `hasNext`. |
| `applyPatch(data, path, value)` | function | Applies an incremental patch to data by path (`structuredClone` under the hood). |
| `applyStreamItems(data, path, items)` | function | Appends `@stream` items to an array at the given path in data. |
| `parseMultipartResponse(body, boundary)` | function | Parses a `multipart/mixed` response body into individual JSON chunks as an Observable. |

### Router

| Member | Type | Description |
|---|---|---|
| `provideQuenetiqRouter(routes, guards)` | function | Provider function that registers routes with a named guard map. Wraps `provideRouter()`. |
| `guardedRoute(keys, route)` | function | Wraps a `Route` with `canActivate` guards resolved by key from the guard map. |
| `canActivateWithGuards(...guardKeys)` | function | Creates a `CanActivateFn` that resolves guards by key from the injected `ROUTE_GUARD_MAP`. |
| `QuenetiqRouteGuard` | type | Route guard type: `() => boolean \| Observable<boolean> \| Promise<boolean>`. |

### Devtools

| Member | Type | Description |
|---|---|---|
| `DevtoolsService` | class | Injectable service that connects to the Quenetiq Devtools browser extension via `postMessage`. |
| `DevtoolsService.devtoolsConfig` | property | Returns the resolved `DevtoolsConfig`. |
| `DevtoolsService.connect()` | method | Starts listening for devtools extension handshake and sends stored requests. |
| `DevtoolsService.disconnect()` | method | Stops listening for devtools messages. |
| `provideDevtools(config?)` | function | Provider that configures and initializes `DevtoolsService`. |
| `devtoolsMiddleware(config?)` | function | Middleware that captures request/response for the Devtools extension. Stores up to 500 entries in `localStorage`. |
| `DevtoolsConfig` | interface | Devtools config: `autoConnect`, `maxRequests`, `captureSchema`, `endpoint`, `schemaDownload`. |
| `SchemaDownloadConfig` | interface | Schema download config: `endpoint`, `headers`, `format` (`json`|`sdl`). |
| `DEVTOLS_CONFIG` | type | `InjectionToken` for `DevtoolsConfig`. |

### Schema

| Member | Type | Description |
|---|---|---|
| `SchemaService` | class | Injectable service that fetches and caches the GraphQL schema via introspection query. |
| `SchemaService.load()` | method | Returns `Observable<Record<string, unknown> \| null>` with cached schema data. |
| `SchemaService.setCache(data)` | function | Static method to pre-populate the schema cache. |
| `SchemaServiceConfig` | interface | Schema service config: `url`, `headers`. |
| `provideSchemaFetch(config?)` | function | Provider that configures `SchemaService` and triggers auto-load on app init. |
| `SCHEMA_SERVICE_CONFIG` | type | `InjectionToken` for `SchemaServiceConfig`. |

### Val

| Member | Type | Description |
|---|---|---|
| `createVal(initialValue)` | function | Creates an `AngularVal<T>` — a `WritableSignal` augmented with null-handling methods. Methods: `nullify()`, `isNull()`, `isEmpty()`, `reset()`, `peek()`, `tap()`, `swap()`, `orElse()`, `match()`. |
| `AngularVal<T>` | interface | `WritableSignal<T>` extras: `nullify`, `isNull`, `isEmpty`, `reset`, `peek`, `tap`, `swap`, `orElse`, `match`. |

## Try it live

:::stackblitz starter="core"
