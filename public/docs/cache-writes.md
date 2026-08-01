---
title: 'Cache Writes'
slug: cache-writes
group: 'Core'
order: 1
since: '1.0.0'
tags: [core, cache, write, query, fragment]
description: 'Injectable cache write helpers'
---

# Cache Writes

The `@quenetiq/core` package provides two injectable helpers for direct cache manipulation — useful for optimistic updates or manual cache writes.

## injectWriteQuery

Writes full entity data into the normalized cache.

```typescript
import { injectWriteQuery } from '@quenetiq/core';

const writeQuery = injectWriteQuery();

// Write or update a User entity
writeQuery({ __typename: 'User', id: '1' }, { name: 'John', email: 'john@example.com' });
```

If the entity already exists in the cache, the new data is merged on top of the existing entity. If it doesn't exist, a new entity is created.

## injectWriteFragment

Writes a specific field value on an existing entity.

```typescript
import { injectWriteFragment } from '@quenetiq/core';

const writeFragment = injectWriteFragment();

// Update just the `name` field of User:1
writeFragment({ __typename: 'User', id: '1', field: 'name' }, 'Jane');
```

This is useful for fragment mutations where only one field changes.

## API Reference

### injectWriteQuery

| Signature               | Description                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `injectWriteQuery(di?)` | Returns a function `(options: WriteQueryOptions, data: Record<string, unknown>) => void` |

### injectWriteFragment

| Signature                  | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| `injectWriteFragment(di?)` | Returns a function `(options: WriteFragmentOptions, value: unknown) => void` |

### Interfaces

| Interface              | Fields                                               | Description                |
| ---------------------- | ---------------------------------------------------- | -------------------------- |
| `WriteQueryOptions`    | `__typename: string`, `id?: string`                  | Target entity identifier   |
| `WriteFragmentOptions` | `__typename: string`, `id?: string`, `field: string` | Target entity + field name |
