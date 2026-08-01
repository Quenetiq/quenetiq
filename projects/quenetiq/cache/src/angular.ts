// Angular wrappers for @quenetiq/cache
// Import from '@quenetiq/cache/angular' in Angular projects
export { CacheService, provideCacheService } from './lib/cache.service';
export { CachePersistenceService, provideCachePersistence } from './lib/cache-persist-ng';
export { injectFragment } from './lib/fragment';
export { GRAPHQL_CACHE, type GraphqlCacheLike } from './lib/tokens';
