---
title: SSR
slug: ssr
group: Features
order: 7
since: 0.0.1
tags:
  - ssr
  - server-side
description: Server-Side Rendering helpers
---

# @quenetiq/ssr

The ssr package provides server-side rendering support for Quenetiq. It captures all GraphQL queries made during server-side rendering, serializes the results, and transfers them to the client for hydration.

## SSR Setup

Add `provideQuenetiqSsr()` to your application config. No additional configuration is needed for basic SSR:

```ts
import { provideQuenetiqSsr } from '@quenetiq/ssr';

export const appConfig: ApplicationConfig = {
  providers: [
    provideQuenetiqCore({ link: createHttpLink({ uri: '/graphql' }) }),
    provideQuenetiqSsr(),
  ],
};
```

## Transfer Cache

Query results captured during SSR are embedded as a `<script>` tag in the HTML. On the client, hydration happens automatically — queries that were already resolved on the server skip the network request:

```ts
// Server: results are embedded as <script> JSON
// Client: hydration happens automatically
// No configuration needed beyond provideQuenetiqSsr()
```

## Chunked Transfer

For large SSR payloads, enable chunked transfer to stream query results in smaller pieces. This improves Time to First Byte (TTFB) and progressive hydration:

```ts
provideQuenetiqSsr({
  chunked: true,
  chunkSize: 8192, // 8 kB per chunk
  flushOnNavigation: true, // flush pending queries on route change
});
```

## API Reference

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `SsrStreamService` | Injectable service for progressive SSR transfer of GraphQL data. Splits large payloads into chunks for faster TTFB. | class | |
| `SsrStreamService.writeChunked(key, data)` | Serializes data to Angular TransferState under a prefixed key. | method | |
| `SsrStreamService.readChunked(key)` | Reads chunked data from Angular TransferState by key. | method | |
| `SsrStreamService.clear()` | Clears all GQL-related TransferState entries. | method | |
| `SsrStreamConfig` | Configuration interface for SSR stream options with custom key prefix and chunk size. | interface | |
| `SsrStreamConfig.key` | Key prefix for TransferState entries. | property | `gql` |
| `SsrStreamConfig.chunkSize` | Chunk size in bytes for progressive loading. | property | |
| `SSR_STREAM_KEY` | Angular InjectionToken used to provide SsrStreamConfig to the SSR stream service. | constant | |
| `TransferCacheService` | Injectable service that saves cache state on the server and restores it on the browser during SSR hydration. | class | |
| `TransferCacheService.save(cache)` | Serializes and saves cache state for transfer to the browser. No-op on the browser side. | method | |
| `TransferCacheService.restore(cache)` | Restores cache state from SSR transfer data. Returns true on success. | method |

## Starters

:::stackblitz starter="ssr" |
