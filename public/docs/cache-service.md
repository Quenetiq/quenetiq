---
title: 'CacheService'
slug: cache-service
group: 'Core'
order: 2
since: '0.0.1'
tags: [cache, angular, service]
description: 'Angular wrapper for CacheStore'
---

# CacheService

`CacheService` wraps `CacheStore` as an Angular `@Injectable()` and integrates with `GraphqlService` automatically.

```typescript
import { provideCacheService, provideCachePersistence } from '@quenetiq/cache/angular';

export const appConfig: ApplicationConfig = {
	providers: [
		provideQuenetiqCore({ link: createHttpLink({ uri: '/graphql' }) }),
		provideCacheService(),
		provideCachePersistence({ storageKey: 'my_cache', version: '1' }),
	],
};
```

```typescript
class TodoList {
	private cache = inject(CacheService);
	private graphql = inject(GraphqlService);

	load() {
		this.graphql
			.query(gql`
				{
					todos {
						id
						title
						done
					}
				}
			`)
			.subscribe((res) => {
				for (const todo of res.data.todos) {
					this.cache.write(todo);
				}
			});
	}
}
```

## API Reference

| Member                                   | Type                                           | Description                                         |
| ---------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `CacheService`                           | class                                          | Angular `@Injectable()` wrapper around `CacheStore` |
| constructor                              | `persistSvc?: CachePersistenceService \| null` | With persistence for auto-restore                   |
| `cache`                                  | property                                       | Underlying `NormalizedCache`                        |
| `gc`                                     | property                                       | Underlying `CacheGc` instance                       |
| `write(entity)`                          | method                                         | Write entity with GC tracking                       |
| `query(typename, id)`                    | method                                         | Read entity with GC tracking                        |
| `merge(entity)`                          | method                                         | Partial merge with GC tracking                      |
| `evict(typename, id)`                    | method                                         | Evict entity                                        |
| `persist()`                              | method                                         | Persist cache to storage                            |
| `serialize()`                            | method                                         | Serialize to JSON string                            |
| `deserialize(json)`                      | method                                         | Restore from JSON                                   |
| `collectGarbage()`                       | method                                         | Run GC sweep                                        |
| `applyOptimistic(update)`                | method                                         | Apply optimistic update                             |
| `rollbackOptimistic(id)`                 | method                                         | Roll back optimistic update                         |
| `commitOptimistic(id)`                   | method                                         | Commit optimistic update                            |
| `readLocal(key)`                         | method                                         | Read local state value                              |
| `watchLocal(key)`                        | method                                         | Observable of local state changes                   |
| `writeLocal(key, value)`                 | method                                         | Write local state value                             |
| `writeLocalWithTypes(key, value, types)` | method                                         | Write local state scoped to types                   |
| `clearLocalState()`                      | method                                         | Clear all local state                               |
| `clearLocalStateByTypes(types)`          | method                                         | Clear local state for types                         |
| `setTypePolicies(policies)`              | method                                         | Set type policies                                   |
| `provideCacheService(persistSvc?)`       | function                                       | Angular provider for CacheService                   |
| `provideCachePersistence(config?)`       | function                                       | Angular provider for CachePersistenceService        |
