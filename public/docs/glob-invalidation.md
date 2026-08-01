---
title: 'Glob Cache Invalidation'
slug: glob-invalidation
group: 'Core'
order: 2
since: '1.0.0'
tags: [core, cache, invalidation, glob]
description: 'Glob-pattern cache invalidation'
---

# Glob Cache Invalidation

`injectGlobInvalidation()` creates a function that invalidates all cache entries matching a glob pattern.

```typescript
import { injectGlobInvalidation } from '@quenetiq/core';

const invalidate = injectGlobInvalidation();

// Invalidate all User entities
const count = invalidate('User:*');

// Invalidate comments field on all Posts
invalidate('Post:*:comments');

// Invalidate everything
invalidate('**');
```

Returns the number of entries that were invalidated.

## Glob Rules

| Pattern | Matches                                  | Description                                          |
| ------- | ---------------------------------------- | ---------------------------------------------------- |
| `*`     | `User:1`, `User:abc`                     | Single segment — matches any characters except `:`   |
| `**`    | `User:1:comments`, `Post:42:likes:count` | Multi-segment — matches any characters including `:` |

## API Reference

| Signature                     | Returns                    | Description                                                                                                     |
| ----------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `injectGlobInvalidation(di?)` | `(glob: string) => number` | Returns a function that invalidates cache keys matching the glob pattern. Returns count of invalidated entries. |
