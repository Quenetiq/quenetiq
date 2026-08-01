<p align="center">
  <img src="https://raw.githubusercontent.com/Quenetiq/quenetiq/main/projects/quenetiq/core/assets/logo.svg" alt="Quenetiq" width="160"/>
</p>

<h1 align="center">@quenetiq/middlewares</h1>

<p align="center">Pre-built middleware functions for the Quenetiq request pipeline — auth refresh, retry, focus refetch, offline queue.</p>

---

## Install

```bash
npm install @quenetiq/middlewares
```

## Middlewares

### `authRefreshMiddleware(config)`

Intercepts 401 responses, queues concurrent requests, calls `refreshToken()`, then replays them with the new token.

```typescript
import { authRefreshMiddleware } from '@quenetiq/middlewares';

const middleware = authRefreshMiddleware({
  refreshToken: () => fetch('/refresh').then(r => r.json()),
});
```

### `retryExchange(config?)`

Retries failed requests with exponential backoff + jitter.

```typescript
import { retryExchange } from '@quenetiq/middlewares';

const middleware = retryExchange({
  maxRetries: 3,
  initialDelay: 500,
  maxDelay: 10000,
});
```

### `focusRefetchMiddleware(config?)`

Refetches stale queries on `visibilitychange` or `window.focus`.

```typescript
import { focusRefetchMiddleware } from '@quenetiq/middlewares';

const middleware = focusRefetchMiddleware({ minStaleSeconds: 30 });
```

### `offlineQueueMiddleware(config?)`

Buffers mutations in localStorage when offline, replays on `online` event.

```typescript
import { offlineQueueMiddleware } from '@quenetiq/middlewares';
import { provideOfflineQueue } from '@quenetiq/middlewares/angular';

const middleware = offlineQueueMiddleware({ maxQueue: 50 });
```

## API

### `@quenetiq/middlewares` (agnostic)

| Export | Description |
|--------|-------------|
| `authRefreshMiddleware(config)` | Auth token refresh on 401 |
| `retryExchange(config?)` | Exponential backoff retry |
| `focusRefetchMiddleware(config?)` | Refetch on focus |
| `offlineQueueMiddleware(config?)` | Offline mutation queue |

### `@quenetiq/middlewares/angular` (Angular)

| Export | Description |
|--------|-------------|
| `OfflineQueueService` | Injectable queue manager |
| `provideOfflineQueue(config?)` | Provider for offline queue |
| `OfflineQueueConfig` | Configuration interface |

## Dependencies

- Core (`@quenetiq/middlewares`): `@quenetiq/core`, `rxjs`
- Angular (`@quenetiq/middlewares/angular`): additionally `@angular/core`
