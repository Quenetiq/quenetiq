---
title: 'Streaming'
slug: core-streaming
group: 'Core'
order: 12
since: '0.0.1'
tags: [angular, streaming, defer, stream, multipart]
description: 'Stream @defer and @stream responses with provideStreaming() and GraphqlService.queryStream()'
---

# Streaming (Angular)

Support for GraphQL `@defer` and `@stream` directives via multipart/mixed responses.

## provideStreaming()

Configure streaming behaviour globally.

```typescript
import { provideStreaming } from '@quenetiq/core';

bootstrapApplication(AppComponent, {
	providers: [
		provideStreaming({
			enabled: true,
			delimiter: '---',
			chunkTimeout: 30_000,
		}),
	],
});
```

Or via the fluent builder:

```typescript
import { quenetiqConfig } from '@quenetiq/core';

bootstrapApplication(AppComponent, {
	providers: [...quenetiqConfig().streaming({ enabled: true }).buildProviders()],
});
```

## queryStream()

Inject `GraphqlService` and call `queryStream()`:

```typescript
import { Component, inject } from '@angular/core';
import { GraphqlService, gql } from '@quenetiq/core';

@Component({
	/* ... */
})
export class CharactersComponent {
	private gql = inject(GraphqlService);
	results$ = this.gql.queryStream(gql`
		query StreamCharacters {
			characters @defer {
				name
				friends @stream {
					name
				}
			}
		}
	`);
}
```

Each emission is the full merged result up to that point (incremental patches auto-applied).

## injectQuery() with streamOn

Pass `streamOn: true` to `injectQuery()` to auto-start streaming for a single query:

```typescript
import { injectQuery, gql } from '@quenetiq/core';

const handle = injectQuery(
	gql`
		query StreamCharacters {
			characters @defer {
				name
				friends @stream {
					name
				}
			}
		}
	`,
	undefined,
	undefined,
	{
		streamOn: true,
	},
);

// Same handle API as a regular query:
// handle.data / handle.loading / handle.status / handle.refetch()
```

When `streamOn` is `undefined` (the default), it falls back to the config default:

```typescript
quenetiqConfig()
  .streaming({ streamOn: true }) // all queries stream by default
  .buildProviders(),
```

`streaming.enabled: false` disables streaming even when `streamOn` is true.

### DI options

`injectQuery()` forwards Angular DI flags (`optional`, `self`, `skipSelf`, `host`) to
every internal `inject()` call (GraphqlService, Injector, EndpointsService, config):

```typescript
injectQuery(doc, 'main', vars, {
	optional: true, // resolve services even when not configured
	skipSelf: true, // resolve from the parent injector only
});
```

## API Reference

| Member                                                        | Type                   | Description                                              |
| ------------------------------------------------------------- | ---------------------- | -------------------------------------------------------- |
| `provideStreaming(config?)`                                   | provider               | Configures `STREAMING_CONFIG` token                      |
| `STREAMING_CONFIG`                                            | InjectionToken         | Injection token for streaming config                     |
| `GraphqlService.queryStream(document, variables?, endpoint?)` | method                 | Returns `Observable<GraphQLResult<T>>`                   |
| `GraphqlService.queryDefer(document, variables?, endpoint?)`  | method                 | Streams + auto-merges incremental patches                |
| `GraphqlService.streaming`                                    | getter                 | Resolved `StreamingConfig` from `QuenetiqConfig`         |
| `InjectQueryOptions.streamOn`                                 | `boolean \| undefined` | Auto-start streaming; falls back to `streaming.streamOn` |
| `InjectQueryOptions.errorPolicy`                              | `ErrorPolicy`          | Per-request error policy                                 |
| `InjectQueryOptions.optional/self/skipSelf/host`              | DI flags               | Forwarded to all internal `inject()` calls               |
| `StreamingConfig.enabled`                                     | `boolean`              | Enable `@defer`/`@stream` support                        |
| `StreamingConfig.streamOn`                                    | `boolean`              | Default for queries when `streamOn` is unspecified       |
| `StreamingConfig.delimiter`                                   | `string`               | Custom boundary delimiter                                |
| `StreamingConfig.chunkTimeout`                                | `number`               | Chunk timeout in ms                                      |
