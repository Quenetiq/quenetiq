import type { GraphQLResult } from './result';
import type { GraphqlMiddleware } from './middleware';
import type { CacheStore } from '@quenetiq/cache';
import type { CacheConfig } from './config';

function markCached<T>(result: GraphQLResult<T>, ts: number): GraphQLResult<T> {
	return { ...result, fromCache: true, cachedAt: ts, entityKeys: [] };
}

interface EntityRef {
	__typename: string;
	id: string;
	[key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEntityRef(obj: Record<string, unknown>): obj is EntityRef {
	return typeof obj['__typename'] === 'string'
		&& (typeof obj['id'] === 'string' || typeof obj['id'] === 'number');
}

function extractEntities(data: unknown, entities: EntityRef[]): void {
	if (!isRecord(data)) return;
	if (isEntityRef(data)) {
		entities.push(data);
	}
	for (const v of Object.values(data)) {
		if (isRecord(v)) {
			extractEntities(v, entities);
		} else if (Array.isArray(v)) {
			for (const item of v) extractEntities(item, entities);
		}
	}
}

function extractTypeNames(data: unknown, types: Set<string>): void {
	if (!isRecord(data)) return;
	if (typeof data['__typename'] === 'string') {
		types.add(data['__typename']);
	}
	for (const v of Object.values(data)) {
		if (isRecord(v)) {
			extractTypeNames(v, types);
		} else if (Array.isArray(v)) {
			for (const item of v) extractTypeNames(item, types);
		}
	}
}

export function cacheMiddleware(cache: CacheStore, config?: CacheConfig): GraphqlMiddleware {
	// Wire typePolicies if provided
	if (config?.typePolicies) {
		try {
			cache.setTypePolicies(config.typePolicies);
		} catch {
			// typePolicies are best-effort
		}
	}

	// Wire up cache event logging if logCache is enabled
	if (config?.logCache) {
		void cache.events.setLogging({ enableLogging: true });
	}

	const fetchTimestamps = new Map<string, number>();
	const maxAge = config?.maxAge ?? 0;
	const staleTime = maxAge > 0 ? Math.floor(maxAge / 2) : 0;

	return async (request, next) => {
		const storeResult = (result: GraphQLResult<unknown>, queryHash: string): void => {
			if (result.status === 'success' && result.data) {
				try {
					const entities: EntityRef[] = [];
					const typeNames = new Set<string>();
					extractEntities(result.data, entities);
					extractTypeNames(result.data, typeNames);
					for (const entity of entities) {
						cache.merge(entity);
					}
					cache.writeLocalWithTypes(queryHash, result, typeNames);
					fetchTimestamps.set(queryHash, Date.now());
				} catch {
					// cache write is best-effort
				}
			}
		};

		if (request.type === 'query') {
			const queryHash = `query:${request.query}|${JSON.stringify(request.variables)}`;
			const fetchPolicy = request.fetchPolicy ?? 'cache-first';

			if (fetchPolicy === 'no-cache') {
				const result = await next(request);
				return result;
			}

			let cachedRaw: GraphQLResult<unknown> | undefined;
			try {
				cachedRaw = cache.readLocal<GraphQLResult<unknown>>(queryHash);
			} catch {
				cachedRaw = undefined;
			}
			const lastFetch = fetchTimestamps.get(queryHash) ?? 0;
			const age = Date.now() - lastFetch;

			if (fetchPolicy === 'network-only') {
				const result = await next(request);
				storeResult(result, queryHash);
				return result;
			}

			if (fetchPolicy === 'cache-and-network') {
				const result = await next(request);
				storeResult(result, queryHash);
				return result;
			}

			if (cachedRaw && maxAge > 0) {
				if (age < staleTime) {
					return markCached(cachedRaw, lastFetch);
				}
				if (age < maxAge) {
					const result = await next(request);
					storeResult(result, queryHash);
					return markCached(cachedRaw, lastFetch);
				}
			}

			if (cachedRaw && maxAge === 0) {
				return markCached(cachedRaw, lastFetch);
			}

			const result = await next(request);
			storeResult(result, queryHash);
			return result;
		}

		if (request.type === 'mutation') {
			const result = await next(request);
			if (result.status === 'success' && result.data) {
				try {
					const entities: EntityRef[] = [];
					const typeNames = new Set<string>();
					extractEntities(result.data, entities);
					extractTypeNames(result.data, typeNames);
					for (const entity of entities) {
						cache.merge(entity);
					}
					if (typeNames.size > 0) {
						cache.clearLocalStateByTypes(Array.from(typeNames));
					}
				} catch {
					// cache update after mutation is best-effort
				}
			}
			return result;
		}

		return next(request);
	};
}
