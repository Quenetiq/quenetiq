# @quenetiq/ssr

Server-Side Rendering helpers for Quenetiq. Transfers GraphQL cache from server to browser using Angular's `TransferState`.

## Install

```bash
npm install @quenetiq/ssr
```

## Quick Start

```typescript
import { TransferCacheService, SsrStreamService } from '@quenetiq/ssr';

// On server: serialize the cache after all queries
const transferCache = inject(TransferCacheService);
const cache = inject(CacheService);
transferCache.save(cache); // stores in TransferState

// On browser: restore the cache before any query
transferCache.restore(cache); // loads from TransferState
```

## Streaming

```typescript
const stream = inject(SsrStreamService);
stream.writeChunked('myKey', data);  // server
const data = stream.readChunked('myKey'); // browser
```

## API

| Export | Description |
|--------|-------------|
| `TransferCacheService` | Saves/restores full cache snapshot to/from `TransferState` |
| `SsrStreamService` | Chunked key-value streaming via `TransferState` |
| `SSR_STREAM_KEY` | Injection token for config (prefix, chunk size) |
| `SsrStreamConfig` | `{ key?: string, chunkSize?: number }` |

## Dependencies

`@angular/common`, `@angular/core`, `@quenetiq/cache`, `rxjs`
