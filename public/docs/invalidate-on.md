---
title: 'invalidateOn'
slug: invalidate-on
group: 'Core'
order: 7
since: '1.0.6-beta'
tags: [observables, invalidation, operator]
description: 'Pipeable invalidation operator'
---

# invalidateOn

A pipeable RxJS operator that re-subscribes to the source observable whenever a specific cache entity changes.

```typescript
import { invalidateOn } from '@quenetiq/observables';

posts$.pipe(invalidateOn(store, 'User', '1')).subscribe((data) => {
	// Re-executes when User:1 is written or merged
});
```

Useful for refreshing data when a specific cache entry is updated.

## API

| Signature                           | Returns                       | Description                    |
| ----------------------------------- | ----------------------------- | ------------------------------ |
| `invalidateOn(store, typename, id)` | `MonoTypeOperatorFunction<T>` | Pipeable invalidation operator |
