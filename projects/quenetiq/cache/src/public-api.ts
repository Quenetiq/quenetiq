// Core cache logic (zero Angular deps, framework-agnostic)
export { NormalizedCache, type CacheEntity, type EntityMeta, type CacheReadContext, type OptimisticUpdate, type TypePolicy, type CacheSnapshot, type EntityExplain, type DryMergeResult, isCacheEntity } from './lib/normalized-cache';
export { CacheStore, createCache, type CacheStoreConfig } from './lib/cache-store';
export { CacheGc } from './lib/cache-gc';
export { CachePersistence, type CachePersistConfig } from './lib/cache-persist';
export { CacheEvents, type CacheEvent, type CacheEventListener, type CacheEventsConfig } from './lib/cache-events';
export { CacheMetrics, type CacheMetricsSnapshot } from './lib/cache-metrics';

// Framework-agnostic helpers (import directly, no Angular deps)
export { buildKey, inlineKey, simpleKey, allKeys, keysByType, getEntityTypes } from './lib/cache-keys';
export { getMeta, getAllMeta, getEntityAge, isStale, touchMeta } from './lib/cache-meta';
export { takeSnapshot, restoreSnapshot } from './lib/cache-snapshot';
export { applyOptimistic, rollbackOptimistic, commitOptimistic } from './lib/cache-optimistic';

// Angular integration helpers (requires @angular/core at runtime)
export { GRAPHQL_CACHE, type GraphqlCacheLike, type CacheAwareResult } from './lib/tokens';

// Beta: cross-tab cache sync (BroadcastChannel-based)
export { CrossTabSync, type CrossTabSyncConfig, type CacheSyncOperations } from './lib/cross-tab-sync';

// Beta: smart entity-level persistence
export { SmartPersistence, type SmartPersistConfig } from './lib/smart-persistence';
export { LocalEntityStorage, type EntityStorage } from './lib/entity-storage';
export { IndexedDbEntityStorage } from './lib/entity-storage-idb';

// For further Angular wrappers import from '@quenetiq/cache/angular'
