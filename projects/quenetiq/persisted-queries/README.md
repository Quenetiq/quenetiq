# @quenetiq/persisted-queries

Automatic Persisted Queries (APQ) for Quenetiq — reduces bandwidth by sending query hashes instead of full query strings.

## Install

```bash
npm install @quenetiq/persisted-queries
```

## Quick Start

```typescript
import { apqMiddleware } from '@quenetiq/persisted-queries';

provideQuenetiq({
  endpoint: '/graphql',
  middleware: [apqMiddleware()],
});
```

## How It Works

1. First request sends `extensions.persistedQuery` with the SHA‑256 hash of the query.
2. If the server responds with `PersistedQueryNotFound`, the middleware automatically retries with the full query body, registering it on the server.
3. Subsequent requests send only the hash.

## API

| Export | Description |
|--------|-------------|
| `apqMiddleware()` | Middleware function — wire into `QuenetiqConfig.middleware` |
| `PersistedQueryService` | Injectable service wrapping `GraphqlService.query()` with APQ |

## Dependencies

`@angular/core`, `@quenetiq/core`, `rxjs`
