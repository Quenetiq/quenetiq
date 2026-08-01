---
title: 'Cache Metrics'
slug: cache-metrics
group: 'Core'
order: 7
since: '0.0.1'
tags: [cache, metrics, performance]
description: 'Cache performance metrics'
---

# Cache Metrics

`CacheMetrics` tracks cache performance — reads, writes, merges, evictions, GC runs, hit rate, timing, and errors. Every `CacheStore` exposes `store.metrics`.

```typescript
import { CacheMetrics } from '@quenetiq/cache';

const m = new CacheMetrics();

m.recordRead(true); // hit
m.recordRead(false); // miss
m.recordWrite();
m.recordMerge();
m.recordEviction();
m.recordGcRun(evictedCount);
m.recordError();

console.log(m.hitRate); // hit / (hit + miss)

const snapshot = m.snapshot(entityCount, refCountTotal, danglingCount, optimisticCount, localStateCount, sizeEstimate);
// { totalReads, totalWrites, hitRate, sizeEstimateBytes, ... }

m.reset(); // zero all counters
```

## CacheMetricsSnapshot

| Field                   | Type     | Description                  |
| ----------------------- | -------- | ---------------------------- |
| `totalReads`            | `number` | Total cache read operations  |
| `totalWrites`           | `number` | Total cache write operations |
| `totalMerges`           | `number` | Total merge operations       |
| `totalEvictions`        | `number` | Total evictions              |
| `totalGcRuns`           | `number` | GC sweep runs                |
| `totalEntitiesEvicted`  | `number` | Entities evicted by GC       |
| `totalErrors`           | `number` | Error count                  |
| `hitRate`               | `number` | Hit ratio (0–1)              |
| `currentEntityCount`    | `number` | Entities in cache            |
| `currentRefCountTotal`  | `number` | Sum of all GC ref counts     |
| `currentDanglingCount`  | `number` | Entities with ref count 0    |
| `optimisticUpdateCount` | `number` | Active optimistic layers     |
| `localStateCount`       | `number` | Local state entries          |
| `sizeEstimateBytes`     | `number` | Serialized size estimate     |
| `totalReadTimeMs`       | `number` | Cumulative read time         |
| `totalMergeTimeMs`      | `number` | Cumulative merge time        |
