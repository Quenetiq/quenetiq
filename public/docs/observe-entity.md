---
title: 'observeEntity'
slug: observe-entity
group: 'Core'
order: 1
since: '1.0.6-beta'
tags: [observables, entity, watch]
description: 'Watch a single cache entity'
---

# observeEntity

Creates an RxJS `Observable` that watches a single cache entity by `typename` and `id`.

```typescript
import { observeEntity } from '@quenetiq/observables';

const user$ = observeEntity(store, 'User', '1');
user$.subscribe((user) => console.log('User updated:', user));
```

Emits the current entity immediately, then re-emits on every `write`, `merge`, or `evict` event for that entity.

## API

| Signature                               | Returns                      | Description          |
| --------------------------------------- | ---------------------------- | -------------------- |
| `observeEntity<T>(store, typename, id)` | `Observable<T \| undefined>` | Watch a cache entity |
