---
title: 'Normalized Cache'
slug: normalized-cache
group: 'Core'
order: 1
since: '0.0.1'
tags: [cache, normalized, entity]
description: 'Low-level normalized entity store'
---

# NormalizedCache

`NormalizedCache` is the low-level entity store. It holds entities in a flat `Map<string, CacheEntity>` keyed by `TypeName:id`.

### Key Building

| Scenario                                | Example Key            |
| --------------------------------------- | ---------------------- |
| Entity with `id`                        | `Todo:1`               |
| Custom `keyFields: ['slug']`            | `Post:my-post-slug`    |
| Compound `keyFields: ['locale','slug']` | `Translation:en.hello` |
| No `id`, no keyFields                   | `Todo:__inline__1`     |

```typescript
import { NormalizedCache } from '@quenetiq/cache';

const nc = new NormalizedCache();

nc.set({ __typename: 'Todo', id: '1', title: 'Dune', done: false });

const todo = nc.get('Todo', '1');
const allTodos = nc.get('Todo');

nc.merge({ __typename: 'Todo', id: '1', done: true });

nc.remove('Todo', '1');

const json = nc.snapshot();
nc.restore(json);

console.log(nc.count());
```

## API Reference

| Method             | Signature                                   | Description                                   |
| ------------------ | ------------------------------------------- | --------------------------------------------- |
| constructor        | `typePolicies?: Record<string, TypePolicy>` | Create store with optional type policies      |
| get                | `(typename, id?)`                           | Get entity by key, or all of a type           |
| set                | `(entity)`                                  | Store an entity                               |
| merge              | `(entity)`                                  | Partial merge                                 |
| remove             | `(typename, id?)`                           | Remove entity(ies)                            |
| all                | `()`                                        | Returns underlying `Map<string, CacheEntity>` |
| clear              | `()`                                        | Remove all entities                           |
| count              | `()`                                        | Number of entities                            |
| has                | `(typename, id)`                            | Check existence                               |
| key                | `(typename, id)`                            | Build internal key string                     |
| snapshot           | `()`                                        | Serialize to JSON string                      |
| restore            | `(json)`                                    | Restore from JSON string                      |
| setTypePolicies    | `(policies)`                                | Update type policies                          |
| applyOptimistic    | `(update)`                                  | Apply optimistic update                       |
| rollbackOptimistic | `(id)`                                      | Roll back optimistic update                   |
| commitOptimistic   | `(id)`                                      | Commit optimistic update                      |
