---
title: Apollo Adapter
slug: apollo-adapter
group: Reference
order: 4
since: 0.0.3
tags: [apollo, adapter]
description: Apollo Client migration adapter
---

# @quenetiq/apollo-adapter

Migration helpers for teams moving from Apollo Client to Quenetiq. Convert your Apollo cache configuration, type policies, and link chain incrementally — no rewrite required.

## Overview

`@quenetiq/apollo-adapter` provides utilities to bridge Apollo Client patterns into Quenetiq. Use `fromApolloCache()` to convert `InMemoryCache` config, and the migration guide to plan your transition step by step.

## fromApolloCache()

Converts an existing Apollo `InMemoryCache` (including its `typePolicies`) into a Quenetiq cache configuration. This lets you keep your existing cache logic while migrating the rest.

```typescript
import { fromApolloCache } from '@quenetiq/apollo-adapter';
import { InMemoryCache } from '@apollo/client';
import { createCache } from '@quenetiq/cache';

const apolloCache = new InMemoryCache();

// Convert Apollo typePolicies to Quenetiq cache config
const quenetiqCache = fromApolloCache(apolloCache);
```

## Migration Guide

The `migrationGuide()` function analyzes your Apollo client setup and returns a list of concrete migration steps, each referencing a file path and the change needed.

```typescript
import { apolloClient } from './apollo-client';
import { createClient } from '@quenetiq/client';
import { migrationGuide } from '@quenetiq/apollo-adapter';

const steps = migrationGuide(apolloClient);
// steps: [
//   { file: 'src/client.ts', change: 'replace ApolloClient with createClient' },
//   { file: 'src/cache.ts', change: 'replace InMemoryCache with createCache' },
//   ...
// ]
```

## API Reference

| Name                               | Description                                                                                                                  | Type      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------- |
| `fromApolloCache(apolloCache)`     | Converts an Apollo InMemoryCache with its typePolicies into a Quenetiq cache configuration.                                  | function  |
| `ApolloCacheCompatible`            | Minimal interface that Apollo Client InMemoryCache satisfies. Covers readQuery, writeQuery, evict, gc, extract, and restore. | interface |
| `ApolloCacheCompatible.readQuery`  | Reads a query from the cache.                                                                                                | method    |
| `ApolloCacheCompatible.writeQuery` | Writes a query result to the cache.                                                                                          | method    |
| `ApolloCacheCompatible.evict`      | Evicts an entity from the cache by id and optional fieldName.                                                                | method    |
| `ApolloCacheCompatible.gc`         | Runs garbage collection on the cache.                                                                                        | method    |
| `ApolloCacheCompatible.extract`    | Extracts full cache state, optionally including optimistic data.                                                             | method    |
| `ApolloCacheCompatible.restore`    | Restores cache state from a serialized snapshot.                                                                             | method    |
| `createMigrationGuide()`           | Returns a mapping of common Apollo Client patterns to their Quenetiq equivalents for incremental migration.                  | function  |

## Starters

:::stackblitz starter="apollo-adapter"
