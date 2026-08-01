---
title: 'Offline Queue'
slug: offline-queue
group: 'Middleware'
order: 3
since: '0.0.1'
tags: [middleware, offline, queue]
description: 'Offline mutation queue'
---

# Offline Queue

Queues GraphQL mutations when the browser is offline and replays them automatically when connectivity is restored. Persists the queue in `localStorage`.

```typescript
import { offlineQueueMiddleware } from '@quenetiq/middlewares';

const middleware = offlineQueueMiddleware({
	storageKey: '__my_app_offline_queue',
	maxQueue: 50,
	autoReplay: true,
});
```

## Angular Provider

```typescript
import { provideOfflineQueue } from '@quenetiq/middlewares';

export const appConfig: ApplicationConfig = {
	providers: [provideOfflineQueue()],
};
```

## API Reference

| Option       | Type      | Default                    | Description              |
| ------------ | --------- | -------------------------- | ------------------------ |
| `storageKey` | `string`  | `__quenetiq_offline_queue` | localStorage key         |
| `maxQueue`   | `number`  | `50`                       | Maximum queued mutations |
| `autoReplay` | `boolean` | `true`                     | Auto-replay on reconnect |

### OfflineQueueService

| Method                         | Description                                |
| ------------------------------ | ------------------------------------------ |
| `enqueue(document, variables)` | Queue a mutation for later replay          |
| `dequeue()`                    | Remove and return next queued mutation     |
| `peek()`                       | View next queued mutation without removing |
| `size()`                       | Current queue length                       |
| `clear()`                      | Clear all queued mutations                 |
| `replayAll()`                  | Immediately replay all queued mutations    |
