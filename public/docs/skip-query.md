---
title: 'Conditional Queries'
slug: skip-query
group: 'Core'
order: 4
since: '1.0.0'
tags: [core, query, skip, conditional, signals]
description: 'Conditionally skip query execution'
---

# Conditional Queries (skip)

`skipQuery()` returns a handle with signals for data, error, loading, and status — but the query only executes when `skip` is falsy.

```typescript
import { skipQuery } from '@quenetiq/core';

@Component({ ... })
class UserProfile {
  private isAdmin = signal(false);

  // Query only fires when isAdmin() is true
  private query = skipQuery(
    ADMIN_USERS_QUERY,
    undefined,      // endpoint (optional)
    undefined,      // variables
    { skip: signal(true) }, // or Signal<boolean> or plain boolean
  );

  users = this.query.data;       // Signal<T | undefined>
  loading = this.query.loading;   // Signal<boolean>
  error = this.query.error;       // Signal<string | undefined>
  status = this.query.status;     // Signal<'idle' | 'loading' | 'success' | 'error'>
}
```

## skip Parameter

The `skip` option accepts:

- **`Signal<boolean>`** — reactive skip state
- **`boolean`** — static skip value (wrapped in a signal internally)

When `skip` changes from truthy to falsy, the query fires immediately. When it changes from falsy to truthy, the in-flight request is cancelled.

## SkipQueryHandle

| Member    | Type                                                  | Description                  |
| --------- | ----------------------------------------------------- | ---------------------------- |
| `result$` | `Observable<GraphQLResult<T>>`                        | Stream of query results      |
| `enabled` | `WritableSignal<boolean>`                             | Toggle query execution       |
| `refetch` | `() => void`                                          | Force re-execution           |
| `data`    | `Signal<T \| undefined>`                              | Current data value           |
| `error`   | `Signal<string \| undefined>`                         | Current error message        |
| `loading` | `Signal<boolean>`                                     | Whether a query is in flight |
| `status`  | `Signal<'idle' \| 'loading' \| 'success' \| 'error'>` | Current query status         |

## API Reference

| Signature                                              | Returns              | Description                                                              |
| ------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------ |
| `skipQuery(document, endpoint?, variables?, options?)` | `SkipQueryHandle<T>` | Creates a conditional query. Only executes when `options.skip` is falsy. |
| `SkipQueryOptions`                                     | interface            | `skip?: Signal<boolean> \| boolean`                                      |
| `SkipQueryHandle<T>`                                   | interface            | `result$`, `enabled`, `refetch`, `data`, `error`, `loading`, `status`    |
