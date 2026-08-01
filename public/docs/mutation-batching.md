---
title: 'Mutation Batching'
slug: mutation-batching
group: 'Core'
order: 3
since: '1.0.0'
tags: [core, mutation, batch, batching]
description: 'Mutation batching service'
---

# Mutation Batching

`MutationBatchService` collects mutations within a time window and executes them as a batch. Each mutation is sent individually but batched into a single network tick.

```typescript
import { MutationBatchService } from '@quenetiq/core';

class MyService {
	private batcher = inject(MutationBatchService);

	saveAll() {
		// These are collected within a 50ms window
		this.batcher.add(LIKE_MUTATION, { id: '1' }).subscribe((result) => {
			console.log('Like 1:', result);
		});
		this.batcher.add(LIKE_MUTATION, { id: '2' }).subscribe((result) => {
			console.log('Like 2:', result);
		});
		this.batcher.add(LIKE_MUTATION, { id: '3' }).subscribe((result) => {
			console.log('Like 3:', result);
		});
	}
}
```

## How It Works

1. Mutations are added via `.add()` and stored in a `Subject`
2. A `bufferTime(batchWindowMs)` operator collects them for the configured window
3. When the window closes, all collected mutations are flushed:
   - **Single mutation** — executed directly via `GraphqlService.mutate()`
   - **Multiple mutations** — each sent individually in parallel via `Promise.allSettled`
4. Results are delivered to the caller via Observable

## API Reference

| Member                                                                       | Type      | Description                                                                   |
| ---------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| `MutationBatchService`                                                       | class     | Injectable service                                                            |
| `MutationBatchService.add(document, variables?, endpoint?, overrideConfig?)` | method    | Adds a mutation to the batch. Returns `Observable<GraphQLResult<T>>`.         |
| `MutationBatchConfig`                                                        | interface | `batchWindowMs?: number` (default 50), `maxBatchSize?: number` (default 10)   |
| `MutationBatchItem<TResponse>`                                               | interface | `document`, `variables?`, `endpoint?`, `overrideConfig?`, `resolve`, `reject` |
