# @quenetiq/apollo-adapter

Migration adapter from Apollo Client to Quenetiq. Provides tools for incremental migration: `fromApolloCache()` wraps Apollo `InMemoryCache` into a Quenetiq-compatible cache, and `createMigrationGuide()` maps Apollo APIs to their Quenetiq equivalents.

## Usage

```ts
import { fromApolloCache, createMigrationGuide } from '@quenetiq/apollo-adapter';

const adapter = fromApolloCache(apolloInMemoryCache);
const guide = createMigrationGuide();
```
